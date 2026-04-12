// src/components/Chat.tsx (versión actualizada)
import { useState, useRef, useEffect } from 'react';
import { supabase, isSupabaseAvailable, type Profile } from '../lib/supabase';
import AuthGuard from './AuthGuard';
import UserMenu from './UserMenu';

// Componente de error si Supabase no está configurado
function SupabaseError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-red-800 mb-2">Error de configuración</h1>
        <p className="text-gray-600 mb-4">
          No se pudo conectar con Supabase. Verifica que las variables de entorno estén configuradas correctamente.
        </p>
        <p className="text-sm text-gray-500">
          Asegúrate de tener PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY en tu archivo .env
        </p>
      </div>
    </div>
  );
}

function ChatContent() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [estaCargando, setEstaCargando] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [credits, setCredits] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Verificar si Supabase está disponible
  if (!isSupabaseAvailable()) {
    return <SupabaseError />;
  }
  
  // Resto del componente igual...
  // (el código que ya tenías para cargar perfil, enviar mensajes, etc.)
  
  useEffect(() => {
    const loadUserProfile = async () => {
      const { data: { user } } = await supabase!.auth.getUser();
      if (user) {
        const { data: profile } = await supabase!
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setUserProfile(profile);
        setCredits(profile?.credits_balance || 0);
        
        // Cargar historial...
        const { data: historial } = await supabase!
          .from('consultas')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (historial && historial.length > 0) {
          const historialMensajes = historial.reverse().flatMap(h => [
            {
              id: `${h.id}_user`,
              texto: h.consulta,
              esUsuario: true,
              timestamp: new Date(h.created_at)
            },
            {
              id: `${h.id}_bot`,
              texto: h.respuesta,
              esUsuario: false,
              fuentes: h.fuentes_utilizadas,
              timestamp: new Date(h.created_at)
            }
          ]);
          setMensajes(historialMensajes);
        } else {
          setMensajes([{
            id: '1',
            texto: `¡Hola ${profile?.full_name || 'abogado'}! Soy tu asistente legal especializado en derecho venezolano. Tienes ${profile?.credits_balance || 0} créditos disponibles. ¿En qué puedo ayudarte?`,
            esUsuario: false,
            timestamp: new Date()
          }]);
        }
      }
    };
    
    loadUserProfile();
  }, []);
  
  // ... resto del código (enviarMensaje, render, etc.)
  
  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <header className="bg-white border-b p-4 sticky top-0 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Asistente Legal IA</h1>
          <p className="text-sm text-slate-500">Derecho venezolano</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            💎 {credits} créditos
          </div>
          <UserMenu user={userProfile} />
        </div>
      </header>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mensajes.map((msg) => (
          <div key={msg.id} className={`flex ${msg.esUsuario ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${msg.esUsuario ? 'bg-blue-600 text-white' : 'bg-white border text-slate-700'}`}>
              <p className="whitespace-pre-wrap">{msg.texto}</p>
              
              {!msg.esUsuario && msg.fuentes && msg.fuentes.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200 text-xs">
                  <p className="font-semibold text-slate-500 mb-1">📖 Fuentes:</p>
                  {msg.fuentes.map((fuente, idx) => (
                    <div key={idx} className="text-slate-400 mt-1">
                      • {fuente.fuente} - {fuente.titulo}
                    </div>
                  ))}
                </div>
              )}
              
              <span className="text-xs opacity-70 mt-1 block">
                {msg.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        
        {estaCargando && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-lg p-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="border-t bg-white p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && enviarMensaje()}
            placeholder="Ej: ¿Qué dice el Código Civil sobre el contrato de arrendamiento?"
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={estaCargando}
          />
          <button
            onClick={enviarMensaje}
            disabled={estaCargando || !input.trim() || credits < 1}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            Enviar
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          Esta IA es de apoyo, no reemplaza el criterio legal profesional
        </p>
      </div>
    </div>
  );
}

// Exportar con el guardia de autenticación
export default function Chat() {
  if (!isSupabaseAvailable()) {
    return <SupabaseError />;
  }
  
  return (
    <AuthGuard>
      <ChatContent />
    </AuthGuard>
  );
}