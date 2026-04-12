// src/lib/legalData.ts
import { ChromaClient } from 'chromadb';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const chroma = new ChromaClient();

// Colección donde se guardarán las leyes
let collection: any;

export async function initLegalDatabase() {
  try {
    // Crear o conectar a la colección "leyes-venezolanas"
    collection = await chroma.getOrCreateCollection({
      name: "leyes-venezolanas",
      metadata: { "hnsw:space": "cosine" }
    });
    
    console.log("📚 Base de datos legal inicializada");
    
    // Si está vacía, cargar las leyes
    const count = await collection.count();
    if (count === 0) {
      await loadLawsIntoDatabase();
    }
  } catch (error) {
    console.error("Error al inicializar DB:", error);
  }
}

// Función para cargar las leyes (aquí pones tus documentos)
async function loadLawsIntoDatabase() {
  // En producción, carga desde archivos JSON o PDFs
  const leyes = [
    {
      id: "cc_1",
      titulo: "Código Civil - Artículo 1",
      contenido: "La ley es obligatoria desde su publicación...",
      fuente: "Código Civil Venezolano"
    },
    {
      id: "cc_2", 
      titulo: "Código Civil - Artículo 2",
      contenido: "La ignorancia de la ley no excusa de su cumplimiento...",
      fuente: "Código Civil Venezolano"
    },
    // ... Agrega más artículos de leyes venezolanas
  ];
  
  // Generar embeddings (representaciones numéricas) de cada ley
  for (const ley of leyes) {
    const embedding = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: ley.contenido,
      taskType: 'SEMANTIC_SIMILARITY'  // Para búsqueda semántica [citation:3]
    });
    
    await collection.add({
      ids: [ley.id],
      embeddings: [embedding.embeddings[0].values],
      metadatas: [{
        titulo: ley.titulo,
        fuente: ley.fuente,
        contenido: ley.contenido
      }]
    });
  }
  
  console.log(`✅ Cargadas ${leyes.length} leyes en la base de datos`);
}

// Buscar artículos relevantes para una consulta
export async function buscarArticulosRelevantes(consulta: string, limite: number = 5) {
  if (!collection) await initLegalDatabase();
  
  // Generar embedding de la consulta del usuario
  const queryEmbedding = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: consulta,
    taskType: 'SEMANTIC_SIMILARITY'
  });
  
  // Buscar los artículos más similares
  const resultados = await collection.query({
    queryEmbeddings: [queryEmbedding.embeddings[0].values],
    nResults: limite
  });
  
  // Formatear resultados
  const articulos = resultados.metadatas[0].map((meta: any, idx: number) => ({
    contenido: meta.contenido,
    fuente: meta.fuente,
    titulo: meta.titulo,
    similitud: resultados.distances[0][idx]
  }));
  
  return articulos;
}