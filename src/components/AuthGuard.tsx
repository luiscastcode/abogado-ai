// src/components/AuthGuard.tsx
import { useEffect, useState } from 'react';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ children, redirectTo = '/login' }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar si Supabase está disponible
  if (!isSupabaseAvailable()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <p className="text-red-600">Error: Supabase no está configurado</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    supabase!.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    window.location.href = redirectTo;
    return null;
  }

  return <>{children}</>;
}