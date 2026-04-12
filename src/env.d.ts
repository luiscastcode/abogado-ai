// src/env.d.ts
/// <reference types="astro/client" />

// Extender los tipos de Astro para incluir nuestras propiedades
declare namespace App {
  interface Locals {
    user?: {
      id: string;
      email: string;
      user_metadata?: {
        full_name?: string;
      };
    } | null;
  }
}

// Extender el tipo de import.meta.env
interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly GEMINI_API_KEY: string;
  readonly PUBLIC_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}