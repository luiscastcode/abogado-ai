// src/pages/api/consultar.ts
import type { APIRoute } from 'astro';

// ✅ Asegurarse de exportar correctamente como POST
export const POST: APIRoute = async ({ request }) => {
  console.log('📞 API consultar llamada');
  
  try {
    const body = await request.json();
    const { consulta } = body;
    
    console.log('Consulta recibida:', consulta?.substring(0, 100));
    
    if (!consulta || consulta.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Consulta vacía' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Importar la función de gemini
    const { consultarAsistenteLegal } = await import('../../lib/gemini');
    
    const resultado = await consultarAsistenteLegal(consulta);
    
    console.log('Respuesta generada, fuentes:', resultado.fuentes?.length);
    
    return new Response(
      JSON.stringify(resultado),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Error en API consultar:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// Opcional: también soportar GET para pruebas
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ message: 'API de consultas - usa POST para consultar' }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};