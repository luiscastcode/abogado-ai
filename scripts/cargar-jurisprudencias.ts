// scripts/cargar-solo-texto.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan variables de Supabase');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

async function cargarJurisprudencias() {
  console.log('🚀 Cargando jurisprudencias...\n');
  
  const datasetPath = path.join(__dirname, '../src/data/dataset_legal.json');
  
  if (!fs.existsSync(datasetPath)) {
    console.error('❌ Dataset no encontrado en:', datasetPath);
    process.exit(1);
  }
  
  const rawData = fs.readFileSync(datasetPath, 'utf-8');
  const jurisprudencias = JSON.parse(rawData);
  
  console.log(`📄 Encontrados ${jurisprudencias.length} documentos\n`);
  
  let exitosos = 0;
  
  for (let i = 0; i < jurisprudencias.length; i++) {
    const item = jurisprudencias[i];
    
    const contenido = `
      Materia: ${item.matter || 'No especificada'}
      Tribunal: ${item.court || 'No especificado'}
      Fecha: ${item.date || 'No especificada'}
      Resumen: ${item.case_summary || ''}
      Resultado: ${item.outcome || 'No especificado'}
    `.trim();
    
    console.log(`[${i + 1}/${jurisprudencias.length}] ${item.matter || 'Documento'}...`);
    
    const { error } = await supabase
      .from('documentos_legales')
      .insert({
        titulo: `${item.matter || 'Jurisprudencia'} - ${item.court || 'Tribunal'}`,
        contenido: contenido,
        fuente: item.court || 'Tribunal Venezolano',
        materia: item.matter,
        tribunal: item.court,
        fecha: item.date,
        metadata: {
          outcome: item.outcome,
          tags: item.tags
        }
      });
    
    if (error) {
      console.error(`❌ Error:`, error.message);
    } else {
      console.log(`✅ Guardado`);
      exitosos++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n✅ Completado: ${exitosos}/${jurisprudencias.length} documentos`);
}

cargarJurisprudencias();