import { useMemo } from 'react';
import { Bell, AlertTriangle, TrendingUp, Info, CheckCircle, MapPin, Users, RefreshCw } from 'lucide-react';
import { ElectorData } from './CaptureForm';
import { User } from '../lib/auth';
import { generateInsights, computeRegionRisks, computeRedistribuicao, Insight, InsightType } from '../lib/insights';

interface Props {
  electors: ElectorData[];
  users: User[];
}

const TYPE_STYLES: Record<InsightType, { bg: string; border: string; text: string; icon: JSX.Element }> = {
  danger:  { bg: 'bg-red-50',    border: 'border-red-400',    text: 'text-red-800',    icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-800', icon: <AlertTriangle className="w-4 h-4 text-yellow-500" /> },
  success: { bg: 'bg-green-50',  border: 'border-green-400',  text: 'text-green-800',  icon: <CheckCircle   className="w-4 h-4 text-green-500" /> },
  info:    { bg: 'bg-blue-50',   border: 'border-blue-400',   text: 'text-blue-800',   icon: <Info          className="w-4 h-4 text-blue-500" /> },
};

function InsightCard({ insight }: { insight: Insight }) {
  const s = TYPE_STYLES[insight.type];
  return (
    <div className={`flex gap-3 p-4 rounded-xl border-l-4 ${s.bg} ${s.border}`}>
      <span className="text-xl leading-none mt-0.5">{insight.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${s.text}`}>{insight.title}</p>
        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{insight.description}</p>
      </div>
      <div className="flex-shrink-0 mt-0.5">{s.icon}</div>
    </div>
  );
}

function RiskBar({ value }: { value: number }) {
  const color = value >= 60 ? 'bg-red-500' : value >= 35 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value}</span>
    </div>
  );
}

export function InsightsPanel({ electors, users }: Props) {
  const insights      = useMemo(() => generateInsights(electors, users), [electors, users]);
  const regionRisks   = useMemo(() => computeRegionRisks(electors).slice(0, 8), [electors]);
  const redistribuicao = useMemo(() => computeRedistribuicao(electors, users), [electors, users]);

  const dangers  = insights.filter(i => i.type === 'danger');
  const warnings = insights.filter(i => i.type === 'warning');
  const others   = insights.filter(i => i.type === 'success' || i.type === 'info');

  return (
    <div className="space-y-5">

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
          <p className="text-2xl font-bold text-red-600">{dangers.length}</p>
          <p className="text-xs text-red-700 font-medium mt-0.5">Críticos</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 text-center border border-yellow-100">
          <p className="text-2xl font-bold text-yellow-600">{warnings.length}</p>
          <p className="text-xs text-yellow-700 font-medium mt-0.5">Atenção</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
          <p className="text-2xl font-bold text-green-600">{others.length}</p>
          <p className="text-xs text-green-700 font-medium mt-0.5">Positivos</p>
        </div>
      </div>

      {/* Alertas */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          Alertas Inteligentes
          {insights.length > 0 && (
            <span className="ml-auto text-xs bg-blue-600 text-white rounded-full px-2 py-0.5">
              {insights.length}
            </span>
          )}
        </h2>
        {insights.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-400" />
            <div>
              <p className="font-semibold text-gray-700">Tudo em ordem!</p>
              <p className="text-sm text-gray-500 mt-1">Nenhum alerta no momento. Continue assim.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {insights.map(i => <InsightCard key={i.id} insight={i} />)}
          </div>
        )}
      </div>

      {/* Risco por Região */}
      {regionRisks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Risco por Região
          </h2>
          <div className="space-y-3">
            {regionRisks.map(r => (
              <div key={r.nome}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-800 truncate max-w-[55%]">{r.nome}</span>
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span title="Forte" className="text-green-600">{r.forte}✓</span>
                    <span title="Indeciso" className="text-yellow-600">{r.indeciso}?</span>
                    <span title="Oposição" className="text-red-600">{r.oposicao}✗</span>
                    <span className="text-gray-400">/{r.total}</span>
                  </div>
                </div>
                <RiskBar value={r.riskScore} />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Score de risco: ponderação de fracos, indecisos e oposição
          </p>
        </div>
      )}

      {/* Redistribuição de Captadores */}
      {redistribuicao.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Redistribuição Sugerida
          </h2>
          <div className="space-y-2.5">
            {redistribuicao.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <RefreshCw className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-blue-900">{s.captador}</p>
                  <p className="text-xs text-blue-700 mt-0.5">{s.motivo}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Sugestão: realocar para <span className="font-semibold">{s.regiaoSugerida}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {electors.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum eleitor cadastrado ainda</p>
          <p className="text-sm mt-1">Os alertas aparecerão conforme os dados forem inseridos</p>
        </div>
      )}
    </div>
  );
}
