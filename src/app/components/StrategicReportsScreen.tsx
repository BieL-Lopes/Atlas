import { useState, useMemo } from 'react';
import { TrendingUp, Users, Target, ChevronDown, ChevronRight, Award, ArrowRight } from 'lucide-react';
import { User } from '../lib/auth';
import { ElectorData, STATUS_FUNIL_CONFIG, STATUS_FUNIL_ORDER, StatusFunil } from './CaptureForm';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';

interface Props {
  user: User;
  electors: ElectorData[];
  users: User[];
}

const META_DIARIA = 10;
const META_TOTAL_CAPTADOR = 100;

export function StrategicReportsScreen({ user, electors, users }: Props) {
  const [activeTab, setActiveTab] = useState<'captador' | 'coordenador' | 'conversao'>('captador');
  const [expandedCoord, setExpandedCoord] = useState<string | null>(null);

  // ── Helpers ──
  const todayStr = new Date().toISOString().split('T')[0];

  const countByCaptador = (captadorId: string) =>
    electors.filter(e => e.createdBy === captadorId).length;

  const todayCountByCaptador = (captadorId: string) =>
    electors.filter(e => e.createdBy === captadorId && e.dataCadastro.startsWith(todayStr)).length;

  // ── Data for Tab 1: Produtividade por Captador ──
  const captadorData = useMemo(() => {
    const captadores = users.filter(u => u.role === 'colaborador');
    return captadores
      .map(c => ({
        id: c.id,
        name: c.name,
        regiao: c.regiao ?? 'Sem região',
        today: todayCountByCaptador(c.id),
        metaDiaria: META_DIARIA,
        pctDiaria: Math.min(Math.round((todayCountByCaptador(c.id) / META_DIARIA) * 100), 100),
        total: countByCaptador(c.id),
        metaTotal: META_TOTAL_CAPTADOR,
        pctTotal: Math.min(Math.round((countByCaptador(c.id) / META_TOTAL_CAPTADOR) * 100), 100),
      }))
      .sort((a, b) => b.pctDiaria - a.pctDiaria);
  }, [electors, users]);

  // ── Data for Tab 2: Produtividade por Coordenador ──
  const coordData = useMemo(() => {
    const coordRegionais = users.filter(u => u.role === 'lideranca');
    return coordRegionais.map(rc => {
      const captadores = users.filter(u => u.coordenadorRegionalId === rc.id);
      const somaContatos = captadores.reduce((s, c) => s + countByCaptador(c.id), 0);
      const metaEquipe = captadores.length * META_TOTAL_CAPTADOR;
      const pctEquipe = metaEquipe > 0 ? Math.round((somaContatos / metaEquipe) * 100) : 0;
      return {
        id: rc.id,
        name: rc.name,
        regiao: rc.regiao ?? 'Sem região',
        captadoresCount: captadores.length,
        somaContatos,
        metaEquipe,
        pctEquipe,
        captadores: captadores.map(c => ({
          id: c.id,
          name: c.name,
          total: countByCaptador(c.id),
          today: todayCountByCaptador(c.id),
        }))
      };
    }).sort((a, b) => b.pctEquipe - a.pctEquipe);
  }, [electors, users]);

  // ── Data for Tab 3: Conversão de Funil ──
  const funilData = useMemo(() => {
    const counts: Record<StatusFunil, number> = {
      contato: 0, interessado: 0, simpatizante: 0, apoiador: 0, multiplicador: 0
    };
    electors.forEach(e => {
      const sf = (e.statusFunil ?? 'contato') as StatusFunil;
      if (sf in counts) counts[sf]++;
    });

    const total = electors.length || 1;
    const stages = STATUS_FUNIL_ORDER.map((status, i) => {
      const count = counts[status];
      const cfg = STATUS_FUNIL_CONFIG[status];
      const prevCount = i > 0 ? counts[STATUS_FUNIL_ORDER[i - 1]] : total;
      const conversionRate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
      return {
        status,
        label: cfg.label,
        icon: cfg.icon,
        count,
        pctOfTotal: Math.round((count / total) * 100),
        conversionRate,
        bgColor: cfg.bgSelected,
      };
    });

    return stages;
  }, [electors]);

  const funilChartData = funilData.map(f => ({
    name: f.label,
    value: f.count,
  }));

  const FUNIL_COLORS = ['#6b7280', '#0ea5e9', '#3b82f6', '#10b981', '#f59e0b'];

  const barColor = (p: number) =>
    p >= 80 ? 'text-emerald-600 bg-emerald-50' : p >= 50 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50';

  const progressBarColor = (p: number) =>
    p >= 80 ? 'bg-emerald-500' : p >= 50 ? 'bg-yellow-500' : 'bg-red-400';

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header */}
      <div className="bg-gold-deep text-white p-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-7 h-7" />
          <div>
            <h1 className="text-2xl font-bold">Relatórios Estratégicos</h1>
            <p className="text-sm text-gold-soft">Indicadores de produtividade e conversão</p>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="flex">
          <button
            onClick={() => setActiveTab('captador')}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'captador' ? 'border-gold-deep text-gold-deep' : 'border-transparent text-gray-500'
            }`}
          >
            <Users className="w-4 h-4" />
            Captadores
          </button>
          <button
            onClick={() => setActiveTab('coordenador')}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'coordenador' ? 'border-gold-deep text-gold-deep' : 'border-transparent text-gray-500'
            }`}
          >
            <Target className="w-4 h-4" />
            Coordenadores
          </button>
          <button
            onClick={() => setActiveTab('conversao')}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'conversao' ? 'border-gold-deep text-gold-deep' : 'border-transparent text-gray-500'
            }`}
          >
            <Award className="w-4 h-4" />
            Funil
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Tab: Produtividade por Captador ── */}
        {activeTab === 'captador' && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl shadow p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{captadorData.length}</p>
                <p className="text-xs text-gray-500">Captadores</p>
              </div>
              <div className="bg-white rounded-xl shadow p-3 text-center">
                <p className="text-2xl font-bold text-gold-deep">
                  {captadorData.reduce((s, c) => s + c.today, 0)}
                </p>
                <p className="text-xs text-gray-500">Hoje</p>
              </div>
              <div className="bg-white rounded-xl shadow p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  {captadorData.filter(c => c.pctDiaria >= 100).length}
                </p>
                <p className="text-xs text-gray-500">Bateram meta</p>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-gold-deep" />
                <h2 className="font-bold text-gray-900">Produtividade por Captador</h2>
                <span className="text-xs text-gray-500 ml-auto">Meta diária: {META_DIARIA}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {captadorData.length === 0 ? (
                  <p className="p-6 text-center text-gray-500 text-sm">Nenhum captador cadastrado</p>
                ) : (
                  captadorData.map(c => (
                    <div key={c.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.regiao}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-bold text-gold-deep">{c.today}/{c.metaDiaria}</p>
                            <p className="text-xs text-gray-500">hoje</p>
                          </div>
                          <div className={`px-2 py-1 rounded-lg text-xs font-bold ${barColor(c.pctDiaria)}`}>
                            {c.pctDiaria}%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${progressBarColor(c.pctTotal)}`} style={{ width: `${c.pctTotal}%` }} />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 whitespace-nowrap">{c.total}/{c.metaTotal} total</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {captadorData.length > 0 && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">Média diária</span>
                    <span className="font-bold text-gray-900">
                      {captadorData.length > 0 ? (captadorData.reduce((s, c) => s + c.today, 0) / captadorData.length).toFixed(1) : '0'} / {META_DIARIA}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Tab: Produtividade por Coordenador ── */}
        {activeTab === 'coordenador' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl shadow p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{coordData.length}</p>
                <p className="text-xs text-gray-500">Coordenadores</p>
              </div>
              <div className="bg-white rounded-xl shadow p-3 text-center">
                <p className="text-2xl font-bold text-gold-deep">
                  {coordData.reduce((s, c) => s + c.somaContatos, 0)}
                </p>
                <p className="text-xs text-gray-500">Total contatos</p>
              </div>
            </div>

            <div className="space-y-2">
              {coordData.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>Nenhum coordenador regional cadastrado</p>
                </div>
              ) : (
                coordData.map(rc => {
                  const isOpen = expandedCoord === rc.id;
                  return (
                    <div key={rc.id} className="bg-white rounded-xl shadow overflow-hidden">
                      <button
                        onClick={() => setExpandedCoord(isOpen ? null : rc.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">{rc.name}</p>
                          <p className="text-xs text-gray-500">{rc.regiao} • {rc.captadoresCount} captador{rc.captadoresCount !== 1 ? 'es' : ''}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-gold-deep">{rc.somaContatos}</p>
                            <p className="text-xs text-gray-500">{rc.pctEquipe}%</p>
                          </div>
                          {isOpen ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                        </div>
                      </button>
                      <div className="px-4 pb-3">
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${progressBarColor(rc.pctEquipe)}`} style={{ width: `${rc.pctEquipe}%` }} />
                        </div>
                      </div>
                      {isOpen && (
                        <div className="border-t border-gray-100 divide-y divide-gray-50">
                          {rc.captadores.length === 0 ? (
                            <p className="p-4 text-sm text-gray-500 text-center">Nenhum captador</p>
                          ) : (
                            rc.captadores.map(c => (
                              <div key={c.id} className="px-6 py-3 flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{c.name}</p>
                                  <p className="text-xs text-gray-500">Hoje: {c.today}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-gold-deep">{c.total}</p>
                                  <p className="text-xs text-gray-500">{Math.round((c.total / META_TOTAL_CAPTADOR) * 100)}%</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ── Tab: Conversão de Funil ── */}
        {activeTab === 'conversao' && (
          <>
            {/* Funnel visualization */}
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-gold-deep" />
                Funil de Relacionamento
              </h2>
              <div className="space-y-2">
                {funilData.map((f, i) => {
                  const maxCount = Math.max(...funilData.map(d => d.count), 1);
                  const widthPct = Math.max((f.count / maxCount) * 100, 8);
                  return (
                    <div key={f.status}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg w-6 text-center">{f.icon}</span>
                        <span className="text-sm font-medium text-gray-700 w-28">{f.label}</span>
                        <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                          <div
                            className="h-full rounded-lg transition-all flex items-center px-3"
                            style={{ width: `${widthPct}%`, backgroundColor: FUNIL_COLORS[i] }}
                          >
                            <span className="text-white text-xs font-bold">{f.count}</span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{f.pctOfTotal}%</span>
                      </div>
                      {i < funilData.length - 1 && (
                        <div className="flex items-center gap-3 py-0.5">
                          <span className="w-6" />
                          <span className="w-28" />
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <ArrowRight className="w-3 h-3" />
                            <span>
                              {funilData[i + 1].conversionRate}% conversão
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold text-gray-900 mb-4">Distribuição por Status</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={funilChartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Contatos" radius={[4, 4, 0, 0]}>
                    {funilChartData.map((_, i) => (
                      <Cell key={i} fill={FUNIL_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Conversion table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Taxas de Conversão</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {funilData.slice(1).map((f, i) => {
                  const prev = funilData[i];
                  return (
                    <div key={f.status} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <span>{prev.icon} {prev.label}</span>
                        <ArrowRight className="w-4 h-4 text-gray-500" />
                        <span>{f.icon} {f.label}</span>
                      </div>
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        f.conversionRate >= 50 ? 'text-emerald-600 bg-emerald-50' :
                        f.conversionRate >= 25 ? 'text-yellow-600 bg-yellow-50' :
                        'text-red-600 bg-red-50'
                      }`}>
                        {f.conversionRate}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
