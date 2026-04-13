// scripts/list-embedding-models.ts
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listEmbeddingModels() {
  console.log('🔍 Buscando modelos de embedding disponibles...');
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('\n📋 Modelos de embedding disponibles:');
    console.log('='.repeat(50));
    
    if (data.models) {
      const embeddingModels = data.models.filter((m: any) => 
        m.name?.includes('embedding') && m.supportedGenerationMethods?.includes('embedContent')
      );
      
      embeddingModels.forEach((model: any) => {
        console.log(`\n📌 ${model.name}`);
        console.log(`   Métodos: ${model.supportedGenerationMethods?.join(', ')}`);
        if (model.description) {
          console.log(`   Descripción: ${model.description.substring(0, 100)}`);
        }
      });
      
      if (embeddingModels.length === 0) {
        console.log('❌ No se encontraron modelos de embedding');
      }
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

listEmbeddingModels();