// src/pages/api/consultar.ts
import type { APIRoute } from 'astro';
import { consultarAsistenteLegal } from '../../lib/gemini';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { consulta } = await request.json();
    
    if (!consulta || consulta.trim() === '') {
      return new Response(JSON.stringify({ error: 'Consulta vacía' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const resultado = await consultarAsistenteLegal(consulta);
    
    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};