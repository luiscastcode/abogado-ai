// src/lib/gemini.ts
const API_KEY = process.env.GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
const MODELO_CHAT = 'gemini-2.5-flash';

// Función para buscar documentos en Supabase
async function buscarDocumentos(consulta: string, limite: number = 5) {
  try {
    // Usar import.meta.env directamente
    const supabaseAdminUrl = import.meta.env.SUPABASE_URL;
    const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('🔍 [buscarDocumentos] Verificando variables:');
    console.log('  SUPABASE_URL:', supabaseAdminUrl ? '✅' : '❌');
    console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
    
    if (!supabaseAdminUrl || !supabaseServiceKey) {
      console.error('❌ Faltan variables de Supabase');
      return [];
    }
    
    // Importar dinámicamente supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(supabaseAdminUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    
    const { data, error } = await supabaseAdmin
      .rpc('buscar_documentos_texto', {
        query_text: consulta,
        match_count: limite
      });
    
    if (error) {
      console.error('Error en búsqueda:', error);
      return [];
    }
    
    console.log(`📚 Documentos encontrados: ${data?.length || 0}`);
    return data || [];
    
  } catch (error: any) {
    console.error('Error en buscarDocumentos:', error.message);
    return [];
  }
}

export async function consultarAsistenteLegal(consulta: string) {
  try {
    console.log('📝 Consulta recibida:', consulta.substring(0, 100));
    
    // Buscar documentos relevantes
    const documentos = await buscarDocumentos(consulta);
    console.log(`📚 Documentos encontrados: ${documentos.length}`);
    
    if (!API_KEY) {
      console.error('❌ GEMINI_API_KEY no configurada');
      return {
        respuesta: 'Error de configuración: API key de Gemini no encontrada.',
        fuentes: []
      };
    }
    
    // Construir el prompt
    let prompt = '';
    
    if (documentos.length === 0) {
      prompt = `Eres un asistente legal venezolano. El usuario pregunta: "${consulta}"

No se encontraron documentos en la base de datos. Responde amablemente que no hay información disponible y sugiere reformular la pregunta.

⚖️ Recuerda: información educativa - no es asesoría legal.`;
    } else {
      const contexto = documentos.map((doc: any, i: number) => 
        `${i + 1}. [${doc.fuente}] ${doc.titulo}\n   ${doc.contenido.substring(0, 400)}`
      ).join('\n\n');
      
      prompt = `Eres un asistente legal experto en derecho venezolano.

CONTEXTO (Documentos encontrados):
${contexto}

CONSULTA DEL USUARIO: ${consulta}

INSTRUCCIONES:
1. Responde SOLO basándote en el contexto proporcionado
2. Si la información está en el contexto, úsala y CITA la fuente
3. Si NO hay información relevante, dilo claramente
4. Sé conciso y profesional
5. Termina con: "⚖️ Información educativa - no constituye asesoría legal"

RESPUESTA:`;
    }
    
    // Llamar a Gemini
    console.log('🤖 Llamando a Gemini...');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_CHAT}:generateContent?key=${API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    const respuesta = data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar respuesta";
    
    console.log('✅ Respuesta generada');
    
    return {
      respuesta,
      fuentes: documentos.map((doc: any) => ({
        titulo: doc.titulo,
        fuente: doc.fuente,
        materia: doc.materia,
        tribunal: doc.tribunal
      }))
    };
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return {
      respuesta: 'Lo siento, hubo un error procesando tu consulta. Por favor intenta de nuevo.',
      fuentes: []
    };
  }
}