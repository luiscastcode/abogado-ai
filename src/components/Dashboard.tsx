// src/components/Dashboard.tsx
import { useState, useEffect } from 'react';
import { supabase, type Profile, type Consulta } from '../lib/supabase';
import AuthGuard from './AuthGuard';

interface Estadisticas {
  totalConsultas: number;
  creditosDisponibles: number;
  creditosGastados: number;
  consultasEsteMes: number;
  articulosMasUsados: Array<{ fuente: string; count: number }>;
}

function DashboardContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    totalConsultas: 0,
    creditosDisponibles: 0,
    creditosGastados: 0,
    consultasEsteMes: 0,
    articulosMasUsados: []
  });
  const [loading, setLoading] = useState(true);
  const [comprandoCreditos, setComprandoCreditos] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase!.auth.getUser();
      
      if (!user) return;
      
      // Cargar perfil
      const { data: profileData } = await supabase!
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);
      
      // Cargar historial de consultas
      const { data: consultasData } = await supabase!
        .from('consultas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      setConsultas(consultasData || []);
      
      // Calcular estadísticas
      const ahora = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      
      const consultasEsteMes = consultasData?.filter(c => 
        new Date(c.created_at) >= inicioMes
      ).length || 0;
      
      const creditosGastados = consultasData?.reduce((sum, c) => sum + (c.credits_used || 1), 0) || 0;
      
      // Contar artículos más usados (de fuentes_utilizadas)
      const fuentesCount: Record<string, number> = {};
      consultasData?.forEach(consulta => {
        if (consulta.fuentes_utilizadas && Array.isArray(consulta.fuentes_utilizadas)) {
          consulta.fuentes_utilizadas.forEach((fuente: any) => {
            const nombreFuente = fuente.fuente || fuente.titulo || 'Fuente desconocida';
            fuentesCount[nombreFuente] = (fuentesCount[nombreFuente] || 0) + 1;
          });
        }
      });
      
      const articulosMasUsados = Object.entries(fuentesCount)
        .map(([fuente, count]) => ({ fuente, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      setEstadisticas({
        totalConsultas: consultasData?.length || 0,
        creditosDisponibles: profileData?.credits_balance || 0,
        creditosGastados,
        consultasEsteMes,
        articulosMasUsados
      });
      
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const comprarCreditos = async (cantidad: number, precio: number) => {
    setComprandoCreditos(true);
    
    try {
      // Aquí integrarías MercadoPago o PayPal
      // Por ahora, simulamos la compra
      const confirmar = confirm(`¿Comprar ${cantidad} créditos por $${precio}?`);
      
      if (confirmar) {
        const { data: { user } } = await supabase!.auth.getUser();
        
        // Registrar transacción
        const { error: transError } = await supabase!
          .from('transacciones')
          .insert({
            user_id: user?.id,
            amount: cantidad,
            type: 'purchase',
            description: `Compra de ${cantidad} créditos`
          });
        
        if (transError) throw transError;
        
        // Actualizar balance del usuario
        const { error: updateError } = await supabase!
          .from('profiles')
          .update({ 
            credits_balance: estadisticas.creditosDisponibles + cantidad 
          })
          .eq('id', user?.id);
        
        if (updateError) throw updateError;
        
        // Recargar datos
        await cargarDatos();
        alert(`¡Compra exitosa! ${cantidad} créditos agregados.`);
      }
      
    } catch (error) {
      console.error('Error en compra:', error);
      alert('Error al procesar la compra. Intenta de nuevo.');
    } finally {
      setComprandoCreditos(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
              <p className="text-sm text-slate-500">
                Bienvenido, {profile?.full_name || profile?.email}
              </p>
            </div>
            <a
              href="/chat"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Nueva consulta
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Créditos disponibles</p>
                <p className="text-3xl font-bold text-blue-600">{estadisticas.creditosDisponibles}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total consultas</p>
                <p className="text-3xl font-bold text-slate-800">{estadisticas.totalConsultas}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Consultas este mes</p>
                <p className="text-3xl font-bold text-slate-800">{estadisticas.consultasEsteMes}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Créditos gastados</p>
                <p className="text-3xl font-bold text-slate-800">{estadisticas.creditosGastados}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de compra de créditos */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 mb-8 text-white">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <h2 className="text-xl font-bold mb-2">¿Necesitas más créditos?</h2>
              <p className="text-blue-100">Compra créditos adicionales para seguir usando el asistente</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <button
                onClick={() => comprarCreditos(10, 5)}
                disabled={comprandoCreditos}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition disabled:opacity-50"
              >
                💎 10 créditos - $5
              </button>
              <button
                onClick={() => comprarCreditos(25, 10)}
                disabled={comprandoCreditos}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition disabled:opacity-50"
              >
                💎 25 créditos - $10
              </button>
              <button
                onClick={() => comprarCreditos(60, 20)}
                disabled={comprandoCreditos}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition disabled:opacity-50"
              >
                💎 60 créditos - $20
              </button>
            </div>
          </div>
        </div>

        {/* Tabs: Historial y Estadísticas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="flex">
              <button
                onClick={() => setMostrarHistorial(true)}
                className={`px-6 py-3 text-sm font-medium transition ${
                  mostrarHistorial
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                📋 Historial de consultas
              </button>
              <button
                onClick={() => setMostrarHistorial(false)}
                className={`px-6 py-3 text-sm font-medium transition ${
                  !mostrarHistorial
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                📊 Estadísticas detalladas
              </button>
            </div>
          </div>

          <div className="p-6">
            {mostrarHistorial ? (
              // Historial de consultas
              consultas.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-lg font-medium text-slate-800 mb-2">Aún no hay consultas</h3>
                  <p className="text-slate-500 mb-4">Realiza tu primera consulta legal con el asistente IA</p>
                  <a
                    href="/chat"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Comenzar ahora
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {consultas.map((consulta) => (
                    <div key={consulta.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-slate-400">{formatDate(consulta.created_at)}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          -{consulta.credits_used || 1} crédito
                        </span>
                      </div>
                      <p className="font-medium text-slate-800 mb-2 line-clamp-2">
                        <span className="text-blue-600">👤 Pregunta:</span> {consulta.consulta}
                      </p>
                      <p className="text-sm text-slate-600 line-clamp-3">
                        <span className="text-green-600">🤖 Respuesta:</span> {consulta.respuesta}
                      </p>
                      {consulta.fuentes_utilizadas && consulta.fuentes_utilizadas.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <p className="text-xs text-slate-400">
                            📚 Fuentes: {consulta.fuentes_utilizadas.map(f => f.fuente).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Estadísticas detalladas
              <div className="space-y-6">
                {/* Artículos más usados */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">📚 Artículos legales más consultados</h3>
                  {estadisticas.articulosMasUsados.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">Sin datos aún</p>
                  ) : (
                    <div className="space-y-3">
                      {estadisticas.articulosMasUsados.map((art, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-slate-700">{art.fuente}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-48 bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${(art.count / estadisticas.totalConsultas) * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-sm text-slate-500 w-12">{art.count} veces</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Consejos */}
                <div className="bg-blue-50 rounded-lg p-4 mt-6">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 Consejos para ahorrar créditos</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Formula preguntas específicas para obtener respuestas más precisas</li>
                    <li>• Revisa el historial antes de hacer preguntas similares</li>
                    <li>• Usa palabras clave relevantes para mejores resultados</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Exportar con guardia de autenticación
export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}