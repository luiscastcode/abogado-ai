import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function testModel(modelName: string) {
  console.log(`\n🔄 Probando ${modelName}...`);
  
  // Google acepta dos formatos, pero v1beta a veces es estricto con el prefijo
  // Intentamos con el formato estándar que espera la API REST
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hola, responde solo 'OK'" }] }]
      })
    });
    
    const data = await response.json();

    if (response.ok) {
      const respuesta = data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`✅ ${modelName} FUNCIONA!`);
      console.log(`   Respuesta: ${respuesta.trim()}`);
      return true;
    } else {
      console.log(`❌ ${modelName} falló (Status ${response.status})`);
      // Imprimimos el error real que devuelve Google para saber si es "Not Found" o "Permission Denied"
      console.log(`   Mensaje: ${data.error?.message || JSON.stringify(data)}`);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ Error de red/fetch:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Iniciando Diagnóstico de Modelos Gemini...');
  
  if (!API_KEY) {
    console.error('❌ ERROR: No se encontró GEMINI_API_KEY en el archivo .env');
    return;
  }

  // Lista de nombres técnicos exactos
  const chatModels = [
    'gemini-1.5-flash',        // Estable (Recomendado)
    'gemini-2.5-flash',          // Inteligencia superior
    'gemini-2.0-flash-exp',    // Experimental 2.0
  ];
  
  let workingModels: string[] = [];

  for (const model of chatModels) {
    const works = await testModel(model);
    if (works) workingModels.push(model);
  }

  console.log('\n--- 📊 RESULTADOS FINALES ---');
  if (workingModels.length > 0) {
    console.log(`Modelos disponibles: ${workingModels.join(', ')}`);
    console.log(`👉 En tu código usa: const MODELO_CHAT = '${workingModels[0]}';`);
  } else {
    console.log('❌ Ningún modelo de chat respondió correctamente.');
    console.log('\nPosibles soluciones:');
    console.log('1. Revisa si tu API Key es de AI Studio (v1beta) o de Google Cloud Vertex AI (son diferentes).');
    console.log('2. Si estás en una región con restricciones, podrías necesitar un proxy.');
    console.log('3. Asegúrate de que la API "Generative Language API" esté habilitada en Google Cloud Console si tu key pertenece a un proyecto específico.');
  }
}

main();