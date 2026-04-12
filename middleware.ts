// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';

// Cliente de Supabase para el middleware (solo server)
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

// Rutas protegidas (requieren autenticación)
const protectedRoutes = ['/chat', '/dashboard', '/api/consultar'];

// Rutas públicas (no requieren autenticación)
const publicRoutes = ['/', '/login', '/register', '/pricing', '/api/auth/callback'];

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  
  // Verificar si la ruta necesita autenticación
  const needsAuth = protectedRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route));
  
  // Obtener token de la cookie
  const supabaseToken = context.cookies.get('sb-access-token')?.value;
  const supabaseRefreshToken = context.cookies.get('sb-refresh-token')?.value;
  
  let user = null;
  
  if (supabaseToken) {
    try {
      // Verificar la sesión con Supabase
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(supabaseToken);
      
      if (!error && supabaseUser) {
        user = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          user_metadata: supabaseUser.user_metadata
        };
      }
    } catch (error) {
      console.error('Error verifying session:', error);
    }
  }
  
  // Guardar el usuario en locals para que esté disponible en las páginas
  context.locals.user = user;
  
  // Si la ruta requiere autenticación y no hay usuario, redirigir al login
  if (needsAuth && !user) {
    // Guardar la URL a la que intentaba acceder para redirigir después del login
    const redirectTo = encodeURIComponent(pathname);
    return context.redirect(`/login?redirect=${redirectTo}`);
  }
  
  // Si el usuario ya está autenticado y trata de ir a login, redirigir al dashboard
  if (user && pathname === '/login') {
    return context.redirect('/dashboard');
  }
  
  // Agregar información de autenticación a los headers para las API routes
  if (pathname.startsWith('/api/')) {
    context.request.headers.set('x-user-id', user?.id || '');
  }
  
  return next();
});