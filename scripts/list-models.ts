// scripts/list-models.ts
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const API_KEY = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.models) {
      console.log('✅ Modelos disponibles para tu API Key:');
      data.models.forEach((m: any) => {
        console.log(`- ${m.name} (Soporta: ${m.supportedGenerationMethods.join(', ')})`);
      });
    } else {
      console.log('❌ No se encontraron modelos o la respuesta fue inesperada:', data);
    }
  } catch (e) {
    console.error('❌ Error al listar modelos:', e);
  }
}

listModels();