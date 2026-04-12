// src/pages/api/auth/callback.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, redirect }) => {
  // Supabase maneja el callback de OAuth automáticamente
  // Solo redirigimos al chat después del login
  return redirect('/chat');
};