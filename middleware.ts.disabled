// src/middleware.ts - Versión sin tipos estrictos
import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

const protectedRoutes = ['/chat', '/dashboard', '/api/consultar'];
const publicRoutes = ['/', '/login', '/register', '/pricing', '/api/auth/callback'];

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  
  const needsAuth = protectedRoutes.some(route => pathname.startsWith(route));
  
  let user = null;
  
  // Intentar obtener la sesión de Supabase desde la cookie
  const supabaseToken = context.cookies.get('sb-access-token')?.value;
  
  if (supabaseToken) {
    try {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser(supabaseToken);
      if (supabaseUser) {
        user = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          user_metadata: supabaseUser.user_metadata
        };
      }
    } catch (error) {
      // Token inválido o expirado
      console.error('Auth error:', error);
    }
  }
  
  // Asignar usuario a locals (usando type assertion para evitar error TS)
  (context.locals as any).user = user;
  
  if (needsAuth && !user) {
    return context.redirect('/login');
  }
  
  if (user && pathname === '/login') {
    return context.redirect('/dashboard');
  }
  
  return next();
});