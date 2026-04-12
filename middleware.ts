// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY
);

// Rutas protegidas
const protectedRoutes = ['/chat', '/dashboard', '/api/consultar'];

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  
  // Verificar si la ruta necesita autenticación
  const needsAuth = protectedRoutes.some(route => url.pathname.startsWith(route));
  
  if (needsAuth) {
    // Obtener sesión de la cookie
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Redirigir al login
      return context.redirect('/login');
    }
    
    // Agregar usuario al contexto
    context.locals.user = session.user;
  }
  
  return next();
});