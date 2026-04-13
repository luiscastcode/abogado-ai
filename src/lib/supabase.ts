// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// ============================================
// CLIENTE PARA EL NAVEGADOR (React)
// ============================================
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// ============================================
// CLIENTE PARA EL SERVIDOR - CORREGIDO
// ============================================
// En Astro, las variables de entorno están en import.meta.env también
let supabaseAdminInstance: any = null;

export function getSupabaseAdmin() {
  // Si ya tenemos una instancia, devolverla
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }
  
  // En Astro, usar import.meta.env para todo (cliente y servidor)
  // Las variables sin PUBLIC_ también están disponibles en el servidor
  const supabaseAdminUrl = import.meta.env.SUPABASE_URL;
  const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('🔧 [getSupabaseAdmin] Variables disponibles:');
  console.log('  SUPABASE_URL:', supabaseAdminUrl ? '✅' : '❌');
  console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  
  if (!supabaseAdminUrl || !supabaseServiceKey) {
    throw new Error('Faltan variables de Supabase para el servidor. Asegúrate de tener SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env');
  }
  
  supabaseAdminInstance = createClient(supabaseAdminUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  
  return supabaseAdminInstance;
}

// Helper para verificar configuración
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