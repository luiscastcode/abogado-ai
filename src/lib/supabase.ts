// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Detectar si estamos en el cliente o servidor
const isBrowser = typeof window !== 'undefined';

// En cliente, usar PUBLIC_ variables
// En servidor, usar las normales
const supabaseUrl = isBrowser
  ? import.meta.env.PUBLIC_SUPABASE_URL
  : import.meta.env.SUPABASE_URL;

const supabaseAnonKey = isBrowser
  ? import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  : import.meta.env.SUPABASE_ANON_KEY;

// Debug (solo en desarrollo)
if (import.meta.env.DEV) {
  console.log(`🔧 Inicializando Supabase en ${isBrowser ? 'cliente' : 'servidor'}`);
  console.log(`  URL: ${supabaseUrl ? '✅' : '❌'}`);
  console.log(`  Key: ${supabaseAnonKey ? '✅' : '❌'}`);
}

if (!supabaseUrl || !supabaseAnonKey) {
  // En el cliente, no lanzar error fatal para que el componente pueda mostrar un mensaje amigable
  if (isBrowser) {
    console.error('⚠️ Supabase no configurado en el cliente. Verifica PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY');
  } else {
    throw new Error('Missing Supabase environment variables');
  }
}

// Crear cliente solo si tenemos las variables
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Cliente admin solo para servidor
export const supabaseAdmin = !isBrowser && supabaseUrl && import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(supabaseUrl, import.meta.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Helper para verificar si Supabase está disponible
export const isSupabaseAvailable = () => !!supabase;

// Tipos (sin cambios)
export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'premium' | 'admin';
  credits_balance: number;
  total_consultas: number;
  created_at: string;
  updated_at: string;
};

export type Consulta = {
  id: string;
  user_id: string;
  consulta: string;
  respuesta: string;
  fuentes_utilizadas: any;
  tokens_usados: number;
  credits_used: number;
  created_at: string;
};