import { useState, useMemo, lazy, Suspense } from 'react';
import { Users, Target, Download, ChevronDown, ChevronRight, UserCheck, GitCompare, Megaphone, Trophy, Flame, MapPin, Map, TrendingUp, Calendar } from 'lucide-react';
import { User } from '../lib/auth';
import { ElectorData } from './CaptureForm';
import { RegionCompareScreen } from './RegionCompareScreen';
import { ComunicadoModal } from './ComunicadoModal';
import { buildRanking, MEDALS } from '../lib/gamification';
import { avgScore } from '../lib/score';
import { CheckinMapScreen } from './CheckinMapScreen';
const HeatmapScreen = lazy(() => import('./HeatmapScreen').then(m => ({ default: m.HeatmapScreen })));

interface Props {
  user: User;
  electors: ElectorData[];
  users: User[];
  canExport: boolean;
}

const META_POR_CAPTADOR = 100;

function exportCSV(rows: Record<string, string | number>[], filename: string) {
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

export function CoordinationScreen({ user, electors, users, canExport }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [coordTab, setCoordTab] = useState<'equipe' | 'ranking' | 'mapa' | 'heatmap' | 'comparar'>('equipe');
  const [showComunicado, setShowComunicado] = useState(false);

  const ranking = useMemo(() => buildRanking(users, electors), [users, electors]);

  const countByCaptador = (captadorId: string) =>
    electors.filter(e => e.createdBy === captadorId).length;

  const lastCadastro = (captadorId: string): string | null => {
    const dates = electors
      .filter(e => e.createdBy === captadorId)
      .map(e => e.dataCadastro);
    if (!dates.length) return null;
    return dates.sort().reverse()[0];
  };

  const pct = (count: number) => Math.min(Math.round((count / META_POR_CAPTADOR) * 100), 100);

  const barColor = (p: number) =>
    p >= 80 ? 'bg-emerald-500' : p >= 50 ? 'bg-yellow-500' : 'bg-red-400';

  // ── Liderança: mostra seus próprios colaboradores ──
  if (user.role === 'lideranca') {
    const captadores = users.filter(u => u.coordenadorRegionalId === user.id);
    const total = captadores.reduce((s, c) => s + countByCaptador(c.id), 0);

    const handleExport = () => {
      exportCSV(
        captadores.map(c => ({
          captador: c.name,
          regiao: c.regiao ?? '',
          eleitores_cadastrados: countByCaptador(c.id),
          meta: META_POR_CAPTADOR,
          progresso_pct: pct(countByCaptador(c.id)),
        })),
        `equipe-${user.regiao ?? 'regiao'}.csv`
      );
    };

    return (
      <div className="min-h-screen bg-gray-100 pb-24">
        <div className="bg-gold-deep text-white p-6">
          <h1 className="text-2xl font-bold mb-1">Minha Equipe</h1>
          <p className="text-sm text-gold-soft">{user.regiao} • {total} eleitor{total !== 1 ? 'es' : ''} cadastrado{total !== 1 ? 's' : ''}</p>
        </div>

        <div className="p-4 space-y-4">
          {canExport && (
            <button
              onClick={handleExport}
              className="w-full py-3 px-4 bg-white border-2 border-gold-deep text-gold-deep rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gold transition-colors"
            >
              <Download className="w-5 h-5" />
              Exportar CSV da equipe
            </button>
          )}

          {captadores.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Nenhum captador vinculado a você ainda.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-gold-deep" />
                <h2 className="font-bold text-gray-900">Captadores</h2>
                <span className="ml-auto text-sm text-gray-500">Meta: {META_POR_CAPTADOR} cada</span>
              </div>
              <div className="divide-y divide-gray-100">
                {captadores.map(c => {
                  const count = countByCaptador(c.id);
                  const p = pct(count);
                  const last = lastCadastro(c.id);
                  return (
                    <div key={c.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{c.name}</p>
                          {last ? (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              Último: {new Date(last).toLocaleDateString('pt-BR')}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500 mt-0.5">Nenhum cadastro ainda</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gold-deep text-lg">{count}</p>
                          <p className="text-xs text-gray-500">{p}% da meta</p>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor(p)}`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Coordenador / Candidato: drill-down regiao → colaboradores ──
  const regionalCoords = users.filter(u =>
    u.role === 'lideranca' &&
    (user.role === 'candidato' || (user.deputadoId && u.deputadoId === user.deputadoId))
  );

  const allCaptadores = users.filter(u => u.role === 'colaborador');
  const grandTotal = electors.length;
  const grandTarget = allCaptadores.length * META_POR_CAPTADOR;

  const handleExportGeral = () => {
    const rows: Record<string, string | number>[] = [];
    regionalCoords.forEach(rc => {
      const captadores = users.filter(u => u.coordenadorRegionalId === rc.id);
      captadores.forEach(c => {
        rows.push({
          regiao: rc.regiao ?? '',
          coordenador_regional: rc.name,
          captador: c.name,
          eleitores: countByCaptador(c.id),
          meta: META_POR_CAPTADOR,
          progresso_pct: pct(countByCaptador(c.id)),
        });
      });
    });
    exportCSV(rows, 'relatorio-coordenacao.csv');
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {showComunicado && (
        <ComunicadoModal user={user} onClose={() => setShowComunicado(false)} />
      )}

      <div className="bg-gold-deep text-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Coordenação</h1>
            <p className="text-sm text-gold-soft">Visão geral da equipe</p>
          </div>
          {(user.role === 'candidato' || user.role === 'coordenador') && (
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

      {/* Abas internas */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="flex">
          <button
            onClick={() => setCoordTab('equipe')}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-1.5 ${
              coordTab === 'equipe' ? 'border-gold-deep text-gold-deep' : 'border-transparent text-gray-500'
            }`}
          >
            <Users className="w-4 h-4" />
            Equipe
          </button>
          <button
            onClick={() => setCoordTab('ranking')}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-1.5 ${
              coordTab === 'ranking' ? 'border-gold-deep text-gold-deep' : 'border-transparent text-gray-500'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Ranking
          </button>
          <button
            onClick={() => setCoordTab('mapa')}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-1.5 ${
              coordTab === 'mapa' ? 'border-gold-deep text-gold-deep' : 'border-transparent text-gray-500'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Mapa
          </button>
          {(user.role === 'coordenador' || user.role === 'candidato') && (
            <button
              onClick={() => setCoordTab('heatmap')}
              className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-1.5 ${
                coordTab === 'heatmap' ? 'border-gold-deep text-gold-deep' : 'border-transparent text-gray-500'
              }`}
            >
              <Map className="w-4 h-4" />
              Heatmap
            </button>
          )}
          <button
            onClick={() => setCoordTab('comparar')}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-1.5 ${
              coordTab === 'comparar' ? 'border-gold-deep text-gold-deep' : 'border-transparent text-gray-500'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            Comparar
          </button>
        </div>
      </div>

      {/* Aba Ranking */}
      {coordTab === 'ranking' && (
        <div className="p-4">
          {ranking.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum captador cadastrado ainda.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h2 className="font-bold text-gray-900">Ranking de Captadores</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {ranking.map(entry => {
                  const podiumColors = ['#f59e0b', '#94a3b8', '#cd7f32'];
                  return (
                    <div key={entry.id} className="flex items-center gap-3 p-4">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                        style={{
                          background: entry.rank <= 3 ? podiumColors[entry.rank - 1] : '#e5e7eb',
                          color: entry.rank <= 3 ? '#fff' : '#6b7280',
                        }}
                      >
                        {entry.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{entry.name}</p>
                        <p className="text-xs text-gray-500">
                          {entry.earnedMedalIds.map(id => MEDALS.find(m => m.id === id)?.icon).join(' ')}
                          {entry.streak > 0 && (
                            <span className="ml-1">
                              <Flame className="w-3 h-3 inline text-orange-500" /> {entry.streak}d
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gold-deep">{entry.total}</p>
                        <p className="text-xs text-gray-500">hoje: {entry.today}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aba Mapa */}
      {coordTab === 'mapa' && (
        <CheckinMapScreen
          user={user}
          electors={electors}
          users={users}
          onBack={() => setCoordTab('equipe')}
          mode="coordinator"
        />
      )}

      {/* Aba Heatmap */}
      {coordTab === 'heatmap' && (
        <div className="h-[calc(100vh-220px)]">
          <Suspense fallback={<div className="flex h-full items-center justify-center text-gray-500">Carregando mapa...</div>}>
            <HeatmapScreen electors={electors} users={users} />
          </Suspense>
        </div>
      )}

      {/* Aba Comparar */}
      {coordTab === 'comparar' && (
        <div className="p-4">
          <RegionCompareScreen electors={electors} />
        </div>
      )}

      {/* Aba Equipe */}
      {coordTab === 'equipe' && (
      <div className="p-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-gold-deep" />
              <p className="text-sm text-gray-500">Total Eleitores</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{grandTotal}</p>
            <p className="text-xs text-gray-500">Meta: {grandTarget}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-emerald-600" />
              <p className="text-sm text-gray-500">Progresso</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {grandTarget > 0 ? Math.round((grandTotal / grandTarget) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500">da meta geral</p>
          </div>
          {(() => {
            const score = avgScore(electors);
            const color = score >= 65 ? '#16a34a' : score >= 35 ? '#ca8a04' : '#dc2626';
            const label = score >= 65 ? 'Alto' : score >= 35 ? 'Médio' : 'Baixo';
            return (
              <div className="bg-white rounded-xl shadow p-4 col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color }} />
                    <p className="text-sm text-gray-500">Score médio de engajamento</p>
                  </div>
                  <span className="text-xl font-bold" style={{ color }}>{score}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">Engajamento {label} — média de {electors.length} eleitor{electors.length !== 1 ? 'es' : ''}</p>
              </div>
            );
          })()}
        </div>

        {canExport && (
          <button
            onClick={handleExportGeral}
            className="w-full py-3 px-4 bg-white border-2 border-gold-deep text-gold-deep rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gold transition-colors"
          >
            <Download className="w-5 h-5" />
            Exportar relatório completo (CSV)
          </button>
        )}

        {/* Drill-down por região */}
        <div className="space-y-2">
          {regionalCoords.map(rc => {
            const captadores = users.filter(u => u.coordenadorRegionalId === rc.id);
            const regionTotal = captadores.reduce((s, c) => s + countByCaptador(c.id), 0);
            const regionTarget = captadores.length * META_POR_CAPTADOR;
            const regionPct = regionTarget > 0 ? Math.round((regionTotal / regionTarget) * 100) : 0;
            const isOpen = expanded === rc.id;

            return (
              <div key={rc.id} className="bg-white rounded-xl shadow overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : rc.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{rc.regiao}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      {rc.name} • {captadores.length} captador{captadores.length !== 1 ? 'es' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-gold-deep">{regionTotal}</p>
                      <p className="text-xs text-gray-500">{regionPct}%</p>
                    </div>
                    {isOpen
                      ? <ChevronDown className="w-5 h-5 text-gray-500" />
                      : <ChevronRight className="w-5 h-5 text-gray-500" />}
                  </div>
                </button>

                {/* Progress bar da região */}
                <div className="px-4 pb-3">
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor(regionPct)}`} style={{ width: `${regionPct}%` }} />
                  </div>
                </div>

                {/* Captadores expandidos */}
                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {captadores.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500 text-center">Nenhum captador nesta região.</p>
                    ) : (
                      captadores.map(c => {
                        const count = countByCaptador(c.id);
                        const p = pct(count);
                        const last = lastCadastro(c.id);
                        return (
                          <div key={c.id} className="px-6 py-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div>
                                <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                                {last ? (
                                  <p className="text-xs text-gray-500">
                                    Último: {new Date(last).toLocaleDateString('pt-BR')}
                                  </p>
                                ) : (
                                  <p className="text-xs text-gray-500">Nenhum cadastro</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-gold-deep">{count}</p>
                                <p className="text-xs text-gray-500">{p}%</p>
                              </div>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor(p)}`} style={{ width: `${p}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}

