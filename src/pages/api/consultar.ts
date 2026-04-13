// src/pages/api/consultar.ts
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { consultarAsistenteLegal } from '../../lib/gemini';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const POST: APIRoute = async ({ request }) => {
  // Verificar autenticación manualmente
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Verificar token con Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { consulta } = await request.json();
    
    if (!consulta || consulta.trim() === '') {
      return new Response(JSON.stringify({ error: 'Consulta vacía' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const resultado = await consultarAsistenteLegal(consulta);
    
    // Guardar en Supabase (opcional)
    const { error: dbError } = await supabase
      .from('consultas')
      .insert({
        user_id: user.id,
        consulta: consulta,
        respuesta: resultado.respuesta,
        fuentes_utilizadas: resultado.fuentes,
        credits_used: 1
      });
    
    if (dbError) {
      console.error('Error guardando consulta:', dbError);
    }
    
    // Actualizar créditos del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits_balance')
      .eq('id', user.id)
      .single();
    
    if (profile && profile.credits_balance > 0) {
      await supabase
        .from('profiles')
        .update({ credits_balance: profile.credits_balance - 1 })
        .eq('id', user.id);
    }
    
    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error en API consultar:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};