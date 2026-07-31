import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Plus, Users, TrendingUp, MapPin, LogOut, Clock, Calendar, PieChart, Megaphone, ChevronDown, ChevronUp, Flame, Target, Trophy } from 'lucide-react';
import { UserRole, getPermissions, ROLE_LABELS } from '../lib/rbac';
import { ElectorData } from './CaptureForm';
import { User } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { META_DIARIA, MEDALS } from '../lib/gamification';
import { toast } from 'sonner';
const InviteShareModule = lazy(() => import('./InviteShareModule').then(m => ({ default: m.InviteShareModule })));

interface Activity {
  id: string;
  time: string;
  title: string;
  location: string;
  type: string;
}

interface Comunicado {
  id: string;
  titulo: string;
  mensagem: string;
  remetente_nome: string;
  criado_em: string;
}

interface CaptadorStats {
  total: number;
  today: number;
  streak: number;
  rank: number;
  earnedMedalIds: string[];
}

interface HomeScreenProps {
  user?: User;
  userName: string;
  totalCadastros: number;
  votoStats?: { forte: number; medio: number; fraco: number; indeciso?: number; oposicao?: number };
  onNavigate: (screen: 'form' | 'list' | 'agenda') => void;
  onLogout: () => void;
  userRole: UserRole;
  captadorStats?: CaptadorStats;
  electors?: ElectorData[];
}



export function HomeScreen({ user, userName, totalCadastros, votoStats, onNavigate, onLogout, userRole, captadorStats, electors = [] }: HomeScreenProps) {
  const permissions = getPermissions(userRole);
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [expandedCom, setExpandedCom] = useState<string | null>(null);
  const [agendaHoje, setAgendaHoje] = useState<Activity[]>([]);

  // Agenda do dia — busca do Supabase
  useEffect(() => {
    if (!user || !isSupabaseConfigured || !supabase) return;
    const hoje = new Date().toISOString().split('T')[0];
    supabase
      .from('agenda_itens')
      .select('id, titulo, horario, local, tipo')
      .eq('criado_por', user.id)
      .eq('data', hoje)
      .order('horario', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setAgendaHoje(data.map((a: Record<string, string>) => ({
            id: a.id,
            time: a.horario?.slice(0, 5) ?? '',
            title: a.titulo,
            location: a.local ?? '',
            type: a.tipo ?? 'outro',
          })));
        }
      });
  }, [user?.id]);

  // Top 3 bairros por número de eleitores
  const top3Regioes = useMemo(() => {
    if (!electors.length) return [];
    const map: Record<string, number> = {};
    electors.forEach(e => {
      const key = e.bairro || e.cidade || 'Sem região';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 3);
  }, [electors]);

  const maxRegiao = top3Regioes[0]?.[1] ?? 1;

  // Cadastros desta semana
  const thisWeekCount = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const base = captadorStats
      ? electors.filter(e => e.createdBy === user?.id)
      : electors;
    return base.filter(e => new Date(e.dataCadastro) >= weekAgo).length;
  }, [electors, captadorStats, user?.id]);

  // Número de regiões únicas
  const totalRegioes = useMemo(
    () => new Set(electors.map(e => e.bairro || e.cidade).filter(Boolean)).size || 1,
    [electors]
  );

  useEffect(() => {
    if (!user || !isSupabaseConfigured || !supabase) return;

    // Carga inicial
    supabase
      .from('comunicados')
      .select('id, titulo, mensagem, remetente_nome, criado_em')
      .order('criado_em', { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setComunicados(data as Comunicado[]); });

    // Realtime: recebe novos comunicados sem precisar recarregar
    const channel = supabase
      .channel(`comunicados_home_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comunicados' },
        (payload) => {
          const novo = payload.new as Comunicado;
          setComunicados(prev => [novo, ...prev.slice(0, 9)]);
          setExpandedCom(novo.id);
          toast('📢 Novo comunicado', { description: novo.titulo });
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[Realtime] comunicados channel error:', status, err);
        } else {
          console.log('[Realtime] comunicados status:', status);
        }
      });

    return () => { supabase!.removeChannel(channel); };
  }, [user?.id]);

  const votoData = [
    { name: 'Fortes', value: votoStats?.forte ?? 0, bgClass: 'bg-emerald-600', textClass: 'text-emerald-600' },
    { name: 'Médios', value: votoStats?.medio ?? 0, bgClass: 'bg-yellow-500', textClass: 'text-yellow-600' },
    { name: 'Fracos', value: votoStats?.fraco ?? 0, bgClass: 'bg-red-600', textClass: 'text-red-600' },
    { name: 'Indecisos', value: votoStats?.indeciso ?? 0, bgClass: 'bg-slate-500', textClass: 'text-slate-600' },
    { name: 'Oposição', value: votoStats?.oposicao ?? 0, bgClass: 'bg-purple-700', textClass: 'text-purple-700' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gold-deep text-white p-6 pb-24">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-sm opacity-90 mb-1">Bem-vindo(a),</h2>
            <h1 className="text-2xl font-bold">{userName}</h1>
            <span className="text-xs bg-gold-deep px-2 py-0.5 rounded-full mt-1 inline-block">
              {ROLE_LABELS[userRole]}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="p-2 hover:bg-gold-deep rounded-lg transition-colors"
            aria-label="Sair"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="px-4 -mt-16">
        {user && (
          <div className="mb-6">
            <Suspense fallback={<div className="animate-pulse bg-gray-200 h-16 rounded-xl"></div>}>
              <InviteShareModule user={user} />
            </Suspense>
          </div>
        )}

        <button
          onClick={() => onNavigate('list')}
          className="w-full bg-white rounded-2xl shadow-lg p-6 mb-4 text-left transition-all hover:shadow-xl active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">
                {captadorStats ? 'Meus cadastros' : 'Eleitores cadastrados'}
              </p>
              <p className="text-4xl font-bold text-gold-deep">
                {captadorStats ? captadorStats.total : totalCadastros}
              </p>
            </div>
            <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-gold-deep" />
            </div>
          </div>
          <div className="flex items-center text-emerald-600 text-sm">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>+{thisWeekCount} esta semana</span>
          </div>
        </button>

        {/* Widget de Gamificação para Captador */}
        {captadorStats ? (
          <div className="space-y-3 mb-6">
            {/* Meta Diária */}
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-gold-deep" />
                  <span className="text-sm font-semibold text-gray-900">Meta de hoje</span>
                </div>
                <span className="text-sm font-bold text-gold-deep">
                  {captadorStats.today}/{META_DIARIA}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${
                    captadorStats.today >= META_DIARIA ? 'bg-emerald-500' : 'bg-gold-deep'
                  }`}
                  style={{ width: `${Math.min((captadorStats.today / META_DIARIA) * 100, 100)}%` }}
                />
              </div>
              {captadorStats.today >= META_DIARIA && (
                <p className="text-xs text-emerald-600 font-medium mt-1">✅ Meta atingida hoje!</p>
              )}
            </div>

            {/* Streak + Rank */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl shadow p-4 flex flex-col items-center justify-center">
                <Flame className={`w-6 h-6 mb-1 ${
                  captadorStats.streak > 0 ? 'text-orange-500' : 'text-gray-300'
                }`} />
                <p className="text-2xl font-bold text-gray-900">{captadorStats.streak}</p>
                <p className="text-xs text-gray-500">Dias seguidos</p>
              </div>
              <div className="bg-white rounded-2xl shadow p-4 flex flex-col items-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-500 mb-1" />
                <p className="text-2xl font-bold text-gray-900">#{captadorStats.rank}</p>
                <p className="text-xs text-gray-500">Ranking</p>
              </div>
            </div>

            {/* Medalhas conquistadas */}
            {captadorStats.earnedMedalIds.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Medalhas conquistadas</p>
                <div className="flex flex-wrap gap-2">
                  {MEDALS.filter(m => captadorStats.earnedMedalIds.includes(m.id)).map(m => (
                    <div key={m.id} className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-lg px-2 py-1">
                      <span className="text-base">{m.icon}</span>
                      <span className="text-xs font-medium text-gray-700">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Cards Secundários (apenas para roles que não são captador) */
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm">Votos Fortes</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{votoData[0].value}</p>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm">Regiões</p>
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 text-gold-deep mr-1" />
                <p className="text-2xl font-bold text-gold-deep">{totalRegioes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Termômetro de Votos - Barra Linear */}
        {totalCadastros > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-gold-deep" />
                Termômetro de Votos
              </h3>
              <span className="text-sm font-semibold text-gray-600">
                {totalCadastros} {totalCadastros === 1 ? 'Cadastro' : 'Cadastros'}
              </span>
            </div>

            {/* Barra de Progresso Empilhada */}
            <div className="w-full h-6 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div className="h-full flex">
                {votoData.map((item, idx) => item.value > 0 && (
                  <div
                    key={idx}
                    className={`${item.bgClass} h-full transition-all`}
                    style={{ width: `${(item.value / totalCadastros) * 100}%` }}
                    title={`${item.name}: ${item.value}`}
                  ></div>
                ))}
              </div>
            </div>

            {/* Legenda Horizontal */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {votoData.map((item, idx) => (
                <div key={idx} className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${item.bgClass} mr-1.5`}></div>
                  <span className="text-gray-700">
                    {item.name}: <span className={`font-bold ${item.textClass}`}>{item.value}</span>
                    <span className="text-gray-500 ml-1">({totalCadastros > 0 ? Math.round((item.value / totalCadastros) * 100) : 0}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top 3 Regiões */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <MapPin className="w-5 h-5 mr-2 text-gold-deep" />
            <h3 className="font-bold text-gray-900">Top 3 Regiões</h3>
          </div>
          {top3Regioes.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Nenhum eleitor cadastrado ainda</p>
          ) : (
            <div className="space-y-4">
              {top3Regioes.map(([nome, count]) => (
                <div key={nome}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{nome}</span>
                    <span className="text-sm font-semibold text-gold-deep">{count} eleitor{count !== 1 ? 'es' : ''}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold-deep rounded-full transition-all"
                      style={{ width: `${(count / maxRegiao) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agenda do Dia */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-gold-deep" />
              Agenda do Dia
            </h3>
            <span className="text-sm text-gray-600">
              {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          </div>

          <div className="space-y-3">
            {agendaHoje.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-4 text-center text-sm text-gray-500">
                Nenhum item na agenda para hoje
              </div>
            ) : (
              agendaHoje.map(activity => (
                <div
                  key={activity.id}
                  className="bg-white rounded-xl shadow p-4 border-l-4 border-gold-deep"
                >
                  <div className="flex items-start">
                    <div className="flex items-center justify-center w-12 h-12 bg-gold/10 rounded-lg mr-3 flex-shrink-0">
                      <Clock className="w-6 h-6 text-gold-deep" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className="font-bold text-gold-deep mr-2">{activity.time}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          activity.type === 'reuniao'
                            ? 'bg-purple-100 text-purple-700'
                            : activity.type === 'visita'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {activity.type === 'reuniao' ? '🤝 Reunião' : activity.type === 'visita' ? '🏠 Visita' : activity.type}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 mb-1">{activity.title}</p>
                      {activity.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span>{activity.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            <button
              onClick={() => onNavigate('agenda')}
              className="w-full bg-blue-50 border-2 border-gold-deep border-dashed hover:bg-gold/10 text-gold-deep py-3 px-4 rounded-xl text-sm font-semibold transition-all"
            >
              + Adicionar Nova Atividade
            </button>
          </div>
        </div>

        {/* Comunicados Recebidos */}
        {comunicados.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-5 h-5 text-gold-deep" />
              <h3 className="font-bold text-gray-900">Comunicados</h3>
              <span className="ml-auto text-xs bg-gold/10 text-gold-deep font-semibold px-2 py-0.5 rounded-full">
                {comunicados.length}
              </span>
            </div>
            <div className="space-y-2">
              {comunicados.map(com => (
                <div key={com.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setExpandedCom(expandedCom === com.id ? null : com.id)}
                    className="w-full p-4 flex items-start justify-between gap-3 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{com.titulo}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {com.remetente_nome} · {new Date(com.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {expandedCom === com.id
                      ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                      : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />}
                  </button>
                  {expandedCom === com.id && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap border-t border-gray-100 pt-3">
                        {com.mensagem}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Espaçamento inferior para o botão flutuante */}
        <div className="pb-20"></div>
      </div>

      {/* Botao Flutuante - Novo Cadastro (apenas se tiver permissao) */}
      {permissions.canCreateElector && (
        <button
          onClick={() => onNavigate('form')}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gold-deep hover:bg-gold-deep text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-40"
          aria-label="Novo Cadastro"
        >
          <Plus className="w-7 h-7" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
