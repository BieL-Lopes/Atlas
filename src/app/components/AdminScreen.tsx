import { useState, useEffect } from 'react';
import {
  Users, Shield, Settings, ChevronRight, UserPlus, Trash2, Edit2,
  Download, BarChart2, TrendingUp, Target, Megaphone, Map, Bell, MessageCircle, Camera
} from 'lucide-react';
import { InsightsPanel } from './InsightsPanel';
import { WhatsAppModal } from './WhatsAppModal';
import { ComunicadoModal } from './ComunicadoModal';
import { GenerateInviteModal } from './GenerateInviteModal';
import { CheckinPortariaModal } from './CheckinPortariaModal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { HeatmapScreen } from './HeatmapScreen';
import { SettingsCampaignModal } from './SettingsCampaignModal';
import { SettingsVoteLevelsModal } from './SettingsVoteLevelsModal';
import { SettingsRegionsModal } from './SettingsRegionsModal';
import { SettingsIntegrationsModal } from './SettingsIntegrationsModal';
import { SettingsBackupModal } from './SettingsBackupModal';
import { getSystemSettings } from '../lib/settings';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  LineChart, Line, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { UserRole, ROLE_LABELS } from '../lib/rbac';
import { User } from '../lib/auth';
import { ElectorData } from './CaptureForm';

interface Props {
  user: User;
  electors: ElectorData[];
  users: User[];
  canExport: boolean;
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(','),
    ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export function AdminScreen({ user, electors, users, canExport }: Props) {
  const showDashboard = user.role === 'lideranca' || user.role === 'coordenador_geral';
  const [activeTab, setActiveTab] = useState<'users' | 'dashboard' | 'mapa' | 'alertas' | 'whatsapp' | 'settings'>(
    showDashboard ? 'dashboard' : 'users'
  );
  const [showComunicado, setShowComunicado] = useState(false);
  const [showGenerateInvite, setShowGenerateInvite] = useState(false);
  const [showPortariaModal, setShowPortariaModal] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState<string | null>(null);
  const [systemSettings, setSystemSettings] = useState(() => getSystemSettings());
  const [disparosHistory, setDisparosHistory] = useState<{
    id: string; mensagem: string; template_tipo: string;
    total_destinatarios: number; total_enviados: number; total_falhas: number;
    status: string; remetente_nome: string; criado_em: string;
  }[]>([]);
  const whatsappConfigured = import.meta.env.VITE_WHATSAPP_CONFIGURED === 'true';

  const fetchDisparos = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data } = await supabase
      .from('disparos_whatsapp')
      .select('id, mensagem, template_tipo, total_destinatarios, total_enviados, total_falhas, status, remetente_nome, criado_em')
      .order('criado_em', { ascending: false })
      .limit(20);
    if (data) setDisparosHistory(data);
  };

  useEffect(() => {
    if (activeTab === 'whatsapp') fetchDisparos();
  }, [activeTab]);

  // ── Export handlers ──
  const handleExportUsers = () => {
    exportCSV(
      users.map(u => ({
        id: u.id,
        nome: u.name,
        role: ROLE_LABELS[u.role],
        regiao: u.regiao ?? '',
        deputadoId: u.deputadoId ?? '',
      })),
      'usuarios.csv'
    );
  };

  const handleExportElectors = () => {
    exportCSV(
      electors.map(e => ({
        nome: e.nome,
        whatsapp: e.whatsapp,
        tituloEleitor: e.tituloEleitor,
        dataNascimento: e.dataNascimento,
        bairro: e.bairro,
        cidade: e.cidade,
        nivelVoto: e.nivelVoto,
        nichos: e.nichos.join('; '),
        regiao: e.regiao ?? '',
        captador: e.createdByName ?? '',
        dataCadastro: new Date(e.dataCadastro).toLocaleDateString('pt-BR'),
      })),
      'eleitores.csv'
    );
  };

  // ── Dashboard data ──
  const regiaoMap: Record<string, number> = {};
  electors.forEach(e => {
    const r = e.regiao || 'Sem região';
    regiaoMap[r] = (regiaoMap[r] ?? 0) + 1;
  });
  const regiaoData = Object.entries(regiaoMap).map(([name, value]) => ({ name, value }));

  const votoMap = { forte: 0, medio: 0, fraco: 0, indeciso: 0, oposicao: 0 };
  electors.forEach(e => { if (e.nivelVoto && e.nivelVoto in votoMap) votoMap[e.nivelVoto as keyof typeof votoMap]++; });
  const votoData = [
    { name: 'Forte', value: votoMap.forte, color: '#22c55e' },
    { name: 'Médio', value: votoMap.medio, color: '#eab308' },
    { name: 'Fraco', value: votoMap.fraco, color: '#ef4444' },
    { name: 'Indeciso', value: votoMap.indeciso, color: '#94a3b8' },
    { name: 'Oposição', value: votoMap.oposicao, color: '#7c3aed' },
  ];

  const nichoMap: Record<string, number> = {};
  electors.forEach(e => e.nichos.forEach(n => { nichoMap[n] = (nichoMap[n] ?? 0) + 1; }));
  const nichoData = Object.entries(nichoMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  // Evolução últimos 30 dias
  const today = new Date();
  const dayCounts: Record<string, number> = {};
  const dayLabels: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dayLabels.push(key);
    dayCounts[key] = 0;
  }
  electors.forEach(e => {
    const key = e.dataCadastro.split('T')[0];
    if (key in dayCounts) dayCounts[key]++;
  });
  const evolucaoData = dayLabels.map(d => ({
    data: d.slice(5).replace('-', '/'),
    cadastros: dayCounts[d],
  }));

  // Projeção de votos total
  const projecaoTotal = Math.round(
    votoMap.forte * 1.0 + votoMap.medio * 0.6 + votoMap.indeciso * 0.2
  );

  // Evolução cumulativa da projeção nos últimos 30 dias
  const projecaoDayCounts: Record<string, number> = {};
  dayLabels.forEach(k => { projecaoDayCounts[k] = 0; });
  electors.forEach(e => {
    const key = e.dataCadastro.split('T')[0];
    if (key in projecaoDayCounts) {
      const w = e.nivelVoto === 'forte' ? 1.0 : e.nivelVoto === 'medio' ? 0.6 : e.nivelVoto === 'indeciso' ? 0.2 : 0;
      projecaoDayCounts[key] += w;
    }
  });
  let cumulativeProjecao = Math.round(
    electors
      .filter(e => e.dataCadastro.split('T')[0] < dayLabels[0])
      .reduce((acc, e) => acc + (e.nivelVoto === 'forte' ? 1.0 : e.nivelVoto === 'medio' ? 0.6 : e.nivelVoto === 'indeciso' ? 0.2 : 0), 0)
  );
  const projecaoEvolucaoData = dayLabels.map(d => {
    cumulativeProjecao += projecaoDayCounts[d];
    return { data: d.slice(5).replace('-', '/'), projecao: Math.round(cumulativeProjecao) };
  });

  const getRoleBadgeStyle = (role: UserRole) => {
    const styles: Record<UserRole, string> = {
      lideranca: 'bg-red-100 text-red-800 border-red-200',
      coordenador_geral: 'bg-purple-100 text-purple-800 border-purple-200',
      coordenador_regional: 'bg-blue-100 text-blue-800 border-blue-200',
      captador_votos: 'bg-green-100 text-green-800 border-green-200',
      eleitor: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return styles[role];
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {showGenerateInvite && (
        <GenerateInviteModal user={user} onClose={() => setShowGenerateInvite(false)} />
      )}
      {showPortariaModal && (
        <CheckinPortariaModal onClose={() => setShowPortariaModal(false)} />
      )}
      {showComunicado && (
        <ComunicadoModal user={user} onClose={() => setShowComunicado(false)} />
      )}
      {showWhatsApp && (
        <WhatsAppModal
          user={user}
          electors={electors}
          onClose={() => setShowWhatsApp(false)}
          onSent={() => { setShowWhatsApp(false); fetchDisparos(); }}
        />
      )}

      {showSettingsModal === 'campaign' && (
        <SettingsCampaignModal
          settings={systemSettings}
          onClose={() => setShowSettingsModal(null)}
          onSave={setSystemSettings}
        />
      )}
      {showSettingsModal === 'voteLevels' && (
        <SettingsVoteLevelsModal
          settings={systemSettings}
          onClose={() => setShowSettingsModal(null)}
          onSave={setSystemSettings}
        />
      )}
      {showSettingsModal === 'regions' && (
        <SettingsRegionsModal
          settings={systemSettings}
          onClose={() => setShowSettingsModal(null)}
          onSave={setSystemSettings}
        />
      )}
      {showSettingsModal === 'integrations' && (
        <SettingsIntegrationsModal
          settings={systemSettings}
          onClose={() => setShowSettingsModal(null)}
          onSave={setSystemSettings}
        />
      )}
      {showSettingsModal === 'backup' && (
        <SettingsBackupModal
          onClose={() => setShowSettingsModal(null)}
        />
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Administração</h1>
            <p className="text-sm text-blue-100">Gestão de usuários e configurações</p>
          </div>
          {user.role === 'lideranca' && (
            <button
              onClick={() => setShowComunicado(true)}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              <Megaphone className="w-4 h-4" />
              Comunicado
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="flex">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1" />
            Usuários
          </button>
          {showDashboard && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              <BarChart2 className="w-4 h-4 inline mr-1" />
              Dashboard
            </button>
          )}
          {showDashboard && (
            <button
              onClick={() => setActiveTab('mapa')}
              className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'mapa' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              <Map className="w-4 h-4 inline mr-1" />
              Mapa
            </button>
          )}
          {showDashboard && (
            <button
              onClick={() => setActiveTab('alertas')}
              className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'alertas' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              <Bell className="w-4 h-4 inline mr-1" />
              Alertas
            </button>
          )}
          {showDashboard && (
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'whatsapp' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500'
              }`}
            >
              <MessageCircle className="w-4 h-4 inline mr-1" />
              WhatsApp
            </button>
          )}
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-1" />
            Config.
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* ── Tab Usuários ── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setShowGenerateInvite(true)}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center transition-colors shadow-lg"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Adicionar
              </button>
            </div>

            {/* Check-in em Eventos */}
            <button
              onClick={() => setShowPortariaModal(true)}
              className="w-full py-3 px-4 bg-white border-2 border-purple-200 text-purple-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors"
            >
              <Camera className="w-5 h-5" />
              Modo Portaria (Check-in de Eventos)
            </button>

            {canExport && (
              <button
                onClick={handleExportElectors}
                className="w-full py-3 px-4 bg-white border-2 border-blue-200 text-blue-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
              >
                <Download className="w-5 h-5" />
                CSV Eleitores completo ({electors.length} registros)
              </button>
            )}

            {/* Resumo por Papel */}
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-blue-600" />
                Usuários por Perfil
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ROLE_LABELS) as UserRole[]).map(role => {
                  const count = users.filter(u => u.role === role).length;
                  return (
                    <div key={role} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{ROLE_LABELS[role]}</span>
                      <span className="font-bold text-gray-900">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lista de Usuários */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Lista de Usuários</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {users.map(u => (
                  <div key={u.id} className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{u.name}</h3>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getRoleBadgeStyle(u.role)}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                        {u.regiao && <span className="text-xs text-gray-500">{u.regiao}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab Dashboard ── */}
        {activeTab === 'dashboard' && showDashboard && (
          <div className="space-y-4">
            {electors.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
                <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nenhum eleitor cadastrado ainda.</p>
                <p className="text-sm mt-1">Os gráficos aparecerão após os primeiros cadastros.</p>
              </div>
            ) : (
              <>
                {/* Card destaque — Projeção de Votos */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-5 text-white">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Projeção de Votos</p>
                    <Target className="w-5 h-5 text-blue-300" />
                  </div>
                  <p className="text-4xl font-bold">{projecaoTotal.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-blue-300 mt-2">
                    forte ×1.0 &nbsp;+&nbsp; médio ×0.6 &nbsp;+&nbsp; indeciso ×0.2
                    &nbsp;|&nbsp;
                    {electors.length > 0 ? ((projecaoTotal / electors.length) * 100).toFixed(0) : 0}% de {electors.length} cadastros
                  </p>
                </div>

                {/* Cards resumo */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl shadow p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{electors.length}</p>
                    <p className="text-xs text-gray-500">Eleitores</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{votoMap.forte}</p>
                    <p className="text-xs text-gray-500">Voto Forte</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{regiaoData.length}</p>
                    <p className="text-xs text-gray-500">Regiões</p>
                  </div>
                </div>

                {/* Eleitores por Região */}
                {regiaoData.length > 0 && (
                  <div className="bg-white rounded-xl shadow p-4">
                    <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Eleitores por Região
                    </h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={regiaoData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" name="Eleitores" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Nível de Voto */}
                <div className="bg-white rounded-xl shadow p-4">
                  <h2 className="font-bold text-gray-900 mb-4">Nível de Voto</h2>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={votoData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                      >
                        {votoData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Top Nichos */}
                {nichoData.length > 0 && (
                  <div className="bg-white rounded-xl shadow p-4">
                    <h2 className="font-bold text-gray-900 mb-4">Top Nichos</h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={nichoData} margin={{ top: 0, right: 10, left: -20, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" name="Eleitores" fill="#dc2626" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Evolução por dia */}
                <div className="bg-white rounded-xl shadow p-4">
                  <h2 className="font-bold text-gray-900 mb-4">Evolução — últimos 30 dias</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={evolucaoData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="data" tick={{ fontSize: 9 }} interval={6} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="cadastros" stroke="#dc2626" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Evolução da Projeção de Votos */}
                <div className="bg-white rounded-xl shadow p-4">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Evolução da Projeção — últimos 30 dias
                  </h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={projecaoEvolucaoData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="data" tick={{ fontSize: 9 }} interval={6} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [v.toLocaleString('pt-BR'), 'Votos projetados']} />
                      <Line type="monotone" dataKey="projecao" stroke="#2563eb" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>              </>
            )}
          </div>
        )}

        {/* ── Tab Mapa ── */}
        {activeTab === 'mapa' && showDashboard && (
          <div className="h-[calc(100vh-180px)]">
            <HeatmapScreen electors={electors} users={users} />
          </div>
        )}

        {/* -- Tab Alertas -- */}
        {activeTab === 'alertas' && showDashboard && (
          <InsightsPanel electors={electors} users={users} />
        )}

        {/* -- Tab WhatsApp -- */}
        {activeTab === 'whatsapp' && showDashboard && (
          <div className="space-y-4">
            {/* Setup card quando API não configurada */}
            {!whatsappConfigured && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
                <MessageCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-800 text-sm">Evolution API não configurada</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Configure os secrets <code className="bg-yellow-100 px-1 rounded">EVOLUTION_API_URL</code>,{' '}
                    <code className="bg-yellow-100 px-1 rounded">EVOLUTION_API_KEY</code> e{' '}
                    <code className="bg-yellow-100 px-1 rounded">EVOLUTION_INSTANCE</code> no Supabase, e adicione{' '}
                    <code className="bg-yellow-100 px-1 rounded">VITE_WHATSAPP_CONFIGURED=true</code> ao .env para habilitar.
                  </p>
                </div>
              </div>
            )}

            {/* Botão Novo Disparo */}
            <button
              onClick={() => setShowWhatsApp(true)}
              disabled={!whatsappConfigured}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Novo Disparo
            </button>

            {/* Histórico de disparos */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  Histórico de Disparos
                </h2>
              </div>
              {disparosHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-25" />
                  <p className="text-sm">Nenhum disparo realizado ainda</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {disparosHistory.map(d => {
                    const statusStyle =
                      d.status === 'concluido' ? 'bg-green-100 text-green-800' :
                      d.status === 'enviando'  ? 'bg-blue-100 text-blue-800' :
                      d.status === 'erro'      ? 'bg-red-100 text-red-800' :
                                                 'bg-gray-100 text-gray-700';
                    return (
                      <div key={d.id} className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-gray-800 line-clamp-2 flex-1">{d.mensagem}</p>
                          <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle}`}>
                            {d.status}
                          </span>
                        </div>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span>📤 {d.total_enviados}/{d.total_destinatarios}</span>
                          {d.total_falhas > 0 && <span className="text-red-500">✗ {d.total_falhas} falhas</span>}
                          <span>por {d.remetente_nome}</span>
                          <span>{new Date(d.criado_em).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* -- Tab Configurações -- */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Configurações do Sistema</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { id: 'campaign', title: 'Dados da Campanha', desc: 'Nome, logo e informações gerais' },
                  { id: 'voteLevels', title: 'Níveis de Voto', desc: 'Personalizar categorias de voto' },
                  { id: 'regions', title: 'Regiões', desc: 'Gerenciar bairros e regiões' },
                  { id: 'integrations', title: 'Integrações', desc: 'WhatsApp, SMS e outras APIs' },
                  { id: 'backup', title: 'Backup de Dados', desc: 'Exportar e restaurar dados' },
                ].map(item => (
                  <button key={item.title} onClick={() => setShowSettingsModal(item.id)} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-left">{item.title}</h3>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

