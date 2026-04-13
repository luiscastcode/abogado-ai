// src/components/Chat.tsx
import { useState, useRef, useEffect } from 'react';
import { supabase, type Profile, type Consulta } from '../lib/supabase';
import AuthGuard from './AuthGuard';

interface Mensaje {
  id: string;
  texto: string;
  esUsuario: boolean;
  fuentes?: Array<{ titulo: string; fuente: string; texto: string }>;
  timestamp: Date;
  consultaId?: string;
}

function ChatContent() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [estaCargando, setEstaCargando] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [credits, setCredits] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll a nuevos mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensajes]);

  // Cargar perfil y historial del usuario
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase!.auth.getUser();
        
        if (!user) {
          console.error('No user found');
          return;
        }
        
        // Cargar perfil
        const { data: profile, error: profileError } = await supabase!
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.error('Error loading profile:', profileError);
        } else {
          setUserProfile(profile);
          setCredits(profile?.credits_balance || 0);
        }
        
        // Cargar historial de consultas
        const { data: historial, error: historyError } = await supabase!
          .from('consultas')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(50);
        
        if (historyError) {
          console.error('Error loading history:', historyError);
        }
        
        if (historial && historial.length > 0) {
          // Convertir historial a mensajes
          const historialMensajes: Mensaje[] = [];
          historial.forEach((h: Consulta) => {
            historialMensajes.push({
              id: `${h.id}_user`,
              texto: h.consulta,
              esUsuario: true,
              timestamp: new Date(h.created_at),
              consultaId: h.id
            });
            historialMensajes.push({
              id: `${h.id}_bot`,
              texto: h.respuesta,
              esUsuario: false,
              fuentes: h.fuentes_utilizadas,
              timestamp: new Date(h.created_at),
              consultaId: h.id
            });
          });
          setMensajes(historialMensajes);
        } else {
          // Mensaje de bienvenida
          setMensajes([{
            id: 'welcome',
            texto: `¡Hola ${profile?.full_name?.split(' ')[0] || 'abogado'}! Soy tu asistente legal especializado en derecho venezolano. Tienes ${profile?.credits_balance || 0} créditos disponibles. Cada consulta cuesta 1 crédito.\n\n¿En qué puedo ayudarte hoy?`,
            esUsuario: false,
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoadingHistory(false);
      }
    };
    
    loadUserData();
    
    // Enfocar el input al cargar
    setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
  }, []);
  
  const enviarMensaje = async () => {
    if (!input.trim() || estaCargando) return;
    
    // Verificar créditos
    if (credits < 1) {
      setMensajes(prev => [...prev, {
        id: Date.now().toString(),
        texto: '⚠️ **No tienes créditos suficientes.** Por favor compra más créditos en el dashboard para continuar usando el asistente.\n\n[👉 Ir al dashboard para comprar créditos](/dashboard)',
        esUsuario: false,
        timestamp: new Date()
      }]);
      return;
    }
    
    const consulta = input.trim();
    setInput('');
    
    // Agregar mensaje del usuario inmediatamente
    const userMessage: Mensaje = {
      id: `user_${Date.now()}`,
      texto: consulta,
      esUsuario: true,
      timestamp: new Date()
    };
    setMensajes(prev => [...prev, userMessage]);
    setEstaCargando(true);
    
    try {
      // Obtener el token de sesión actual
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      // Llamar a la API
      const response = await fetch('/api/consultar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ consulta })
      });
      
      if (response.status === 401) {
        // Token expirado
        await supabase!.auth.signOut();
        window.location.href = '/login';
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la consulta');
      }
      
      const data = await response.json();
      
      // Agregar respuesta del asistente
      const botMessage: Mensaje = {
        id: `bot_${Date.now()}`,
        texto: data.respuesta,
        esUsuario: false,
        fuentes: data.fuentes,
        timestamp: new Date()
      };
      setMensajes(prev => [...prev, botMessage]);
      
      // Actualizar créditos localmente
      setCredits(prev => prev - 1);
      
      // Recargar perfil actualizado en segundo plano
      const { data: { user } } = await supabase!.auth.getUser();
      if (user) {
        const { data: newProfile } = await supabase!
          .from('profiles')
          .select('credits_balance')
          .eq('id', user.id)
          .single();
        
        if (newProfile) {
          setCredits(newProfile.credits_balance);
        }
      }
      
    } catch (error) {
      console.error('Error en consulta:', error);
      setMensajes(prev => [...prev, {
        id: `error_${Date.now()}`,
        texto: '❌ **Lo siento, hubo un error procesando tu consulta.** Por favor intenta de nuevo más tarde.\n\nSi el problema persiste, contacta a soporte.',
        esUsuario: false,
        timestamp: new Date()
      }]);
    } finally {
      setEstaCargando(false);
      // Re-enfocar input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  };

  if (loadingHistory) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando tu historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-linear-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span className="text-2xl">⚖️</span>
              Asistente Legal IA
            </h1>
            <p className="text-xs text-slate-500">Derecho venezolano | Jurisprudencia actualizada</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full flex items-center gap-1">
              <span className="text-lg">💎</span>
              <span className="font-semibold">{credits}</span>
              <span className="text-xs">créditos</span>
            </div>
            <a
              href="/dashboard"
              className="text-slate-600 hover:text-slate-800 transition"
              title="Ir al dashboard"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </a>
          </div>
        </div>
      </header>
      
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {mensajes.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.esUsuario ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  msg.esUsuario
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.texto}
                </p>
                
                {/* Mostrar fuentes si existen */}
                {!msg.esUsuario && msg.fuentes && msg.fuentes.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                      <span>📚</span> Fuentes legales:
                    </p>
                    <div className="space-y-1">
                      {msg.fuentes.map((fuente, idx) => (
                        <div key={idx} className="text-xs text-slate-400 flex items-start gap-1">
                          <span>•</span>
                          <span className="flex-1">
                            <span className="font-medium">{fuente.fuente}</span>
                            {fuente.titulo && ` - ${fuente.titulo}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Timestamp */}
                <div className={`text-xs mt-1 ${msg.esUsuario ? 'text-blue-200' : 'text-slate-400'}`}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {estaCargando && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          {/* Advertencia de créditos bajos */}
          {credits <= 3 && credits > 0 && !estaCargando && (
            <div className="flex justify-center">
              <div className="bg-amber-50 border border-amber-200 rounded-full px-4 py-2 text-xs text-amber-700 flex items-center gap-2">
                <span>⚠️</span>
                Te quedan {credits} crédito{credits !== 1 ? 's' : ''}
                <a href="/dashboard" className="underline font-medium">Comprar más</a>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input Area */}
      <div className="border-t bg-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef as any}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Escribe tu consulta legal aquí... Ej: ¿Qué dice el Código Civil sobre el contrato de arrendamiento?"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
                disabled={estaCargando}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
              <button
                onClick={enviarMensaje}
                disabled={estaCargando || !input.trim() || credits < 1}
                className="absolute right-2 bottom-2 p-2 text-blue-600 hover:text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span>⚖️ {credits} créditos disponibles</span>
              <span>•</span>
              <span>💡 1 crédito por consulta</span>
            </div>
            <div>
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">Enter</kbd> para enviar
            </div>
          </div>
        </div>
      </div>
      
      {/* Aviso legal fijo */}
      <div className="bg-amber-50 border-t border-amber-200 py-2 text-center">
        <p className="text-xs text-amber-700">
          ⚖️ <strong>Aviso importante:</strong> Este asistente es una herramienta de apoyo a la investigación legal.
          No reemplaza el criterio ni la asesoría de un abogado colegiado.
        </p>
      </div>
    </div>
  );
}

// Exportar con el guardia de autenticación
export default function Chat() {
  return (
    <AuthGuard>
      <ChatContent />
    </AuthGuard>
  );
}