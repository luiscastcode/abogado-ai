// src/lib/gemini.ts
import { GoogleGenAI } from '@google/genai';
import { buscarArticulosRelevantes } from './legalData';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Prompt system que define el comportamiento del asistente
const SYSTEM_PROMPT = `Eres un asistente legal experto en derecho venezolano.
Debes:
1. Responder ÚNICAMENTE basándote en el contexto legal proporcionado
2. Si el contexto no contiene la información, di: "No encuentro información específica en las leyes venezolanas sobre este tema. Te recomiendo consultar con un abogado especializado."
3. Citar siempre la fuente del artículo que respalda tu respuesta
4. Incluir un aviso: "Esta información es solo para fines educativos y no constituye asesoría legal profesional."

Contexto legal (artículos de leyes venezolanas):
{contexto}

Consulta del usuario: {consulta}
`;

export async function consultarAsistenteLegal(consulta: string) {
  try {
    // 1. Buscar artículos relevantes en la base de datos legal
    const articulosRelevantes = await buscarArticulosRelevantes(consulta);
    
    if (articulosRelevantes.length === 0) {
      return {
        respuesta: "No encuentro información en la base de datos legal sobre este tema. Te recomiendo consultar directamente con un abogado especializado.",
        fuentes: []
      };
    }
    
    // 2. Construir el contexto con los artículos encontrados
    const contexto = articulosRelevantes.map(art => 
      `[${art.fuente} - ${art.titulo}]: ${art.contenido}`
    ).join('\n\n');
    
    // 3. Crear el prompt completo
    const prompt = SYSTEM_PROMPT
      .replace('{contexto}', contexto)
      .replace('{consulta}', consulta);
    
    // 4. Llamar a Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',  // Modelo rápido y eficiente [citation:7]
      contents: prompt,
    });
    
    // 5. Extraer las fuentes usadas
    const fuentes = articulosRelevantes.map(art => ({
      titulo: art.titulo,
      fuente: art.fuente,
      texto: art.contenido.substring(0, 150) + '...'
    }));
    
    return {
      respuesta: response.text,
      fuentes: fuentes
    };
    
  } catch (error) {
    console.error('Error en consulta legal:', error);
    return {
      respuesta: 'Lo siento, hubo un error procesando tu consulta. Por favor intenta de nuevo más tarde.',
      fuentes: []
    };
  }
}