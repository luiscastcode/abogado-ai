// src/components/UserMenu.tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';

interface UserMenuProps {
  user: Profile | null;
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };
  
  if (!user) return null;
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm focus:outline-none"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
          {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
        </div>
        <span className="hidden sm:inline">{user.full_name?.split(' ')[0] || user.email}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border">
            <div className="px-4 py-2 border-b">
              <p className="text-sm font-medium">{user.full_name || user.email}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <a href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              📊 Dashboard
            </a>
            <a href="/pricing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              💎 Comprar créditos
            </a>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              🚪 Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}