import { ElectorData } from '../components/CaptureForm';
import { User } from './auth';

export type InsightType = 'danger' | 'warning' | 'success' | 'info';

export interface Insight {
  id: string;
  type: InsightType;
  emoji: string;
  title: string;
  description: string;
  priority: 1 | 2 | 3; // 1 = mais urgente
}

export interface RegionRisk {
  nome: string;
  total: number;
  riskScore: number; // 0-100
  fraco: number;
  indeciso: number;
  oposicao: number;
  forte: number;
}

export interface RedistribuicaoSugestao {
  captador: string;
  motivo: string;
  regiaoSugerida: string;
}

// -- Helper ------------------------------------------------------------------

function noIntervalo(electors: ElectorData[], daysAgo: number, offset = 0): ElectorData[] {
  const now = Date.now();
  const from = now - (daysAgo + offset) * 864e5;
  const to   = now - offset * 864e5;
  return electors.filter(e => {
    const t = new Date(e.dataCadastro).getTime();
    return t >= from && t < to;
  });
}

// -- Motor de alertas --------------------------------------------------------

export function generateInsights(electors: ElectorData[], users: User[]): Insight[] {
  const insights: Insight[] = [];
  const now = Date.now();

  // 1. Captadores sem atividade
  const captadores = users.filter(u => u.role === 'captador_votos');
  for (const c of captadores) {
    const proprios = electors.filter(e => e.createdBy === c.id);
    if (!proprios.length) continue;
    const ultimo = proprios.reduce((a, b) =>
      new Date(a.dataCadastro) > new Date(b.dataCadastro) ? a : b
    );
    const dias = Math.floor((now - new Date(ultimo.dataCadastro).getTime()) / 864e5);
    if (dias >= 3) {
      insights.push({
        id: `inativo-${c.id}`,
        type: dias >= 7 ? 'danger' : 'warning',
        emoji: dias >= 7 ? '🚨' : '⚠️',
        title: `${c.name} sem atividade`,
        description: `Sem novos cadastros ha ${dias} dia${dias !== 1 ? 's' : ''}`,
        priority: dias >= 7 ? 1 : 2,
      });
    }
  }

  // 2. Queda de cadastros por bairro
  const recente7: Record<string, number> = {};
  const anterior7: Record<string, number> = {};
  noIntervalo(electors, 7).forEach(e => {
    const b = e.bairro || e.cidade || 'Sem bairro';
    recente7[b] = (recente7[b] || 0) + 1;
  });
  noIntervalo(electors, 7, 7).forEach(e => {
    const b = e.bairro || e.cidade || 'Sem bairro';
    anterior7[b] = (anterior7[b] || 0) + 1;
  });
  for (const [bairro, anterior] of Object.entries(anterior7)) {
    if (anterior < 3) continue;
    const recente = recente7[bairro] ?? 0;
    if (recente < anterior * 0.7) {
      const queda = Math.round(((anterior - recente) / anterior) * 100);
      insights.push({
        id: `queda-bairro-${bairro}`,
        type: 'warning',
        emoji: '📉',
        title: `Queda em ${bairro}`,
        description: `${queda}% menos cadastros nos ultimos 7 dias (${recente} vs ${anterior} na semana anterior)`,
        priority: 2,
      });
    }
  }

  // 3. Tendencia geral
  const semAtual   = noIntervalo(electors, 7).length;
  const semPassada = noIntervalo(electors, 7, 7).length;
  if (semPassada >= 5) {
    const delta = semAtual - semPassada;
    const pct   = Math.round(Math.abs(delta / semPassada) * 100);
    if (delta < -(semPassada * 0.2)) {
      insights.push({
        id: 'tendencia-queda',
        type: 'danger',
        emoji: '📊',
        title: 'Ritmo de cadastros caindo',
        description: `Esta semana: ${semAtual} cadastros — ${pct}% menos que na semana passada (${semPassada})`,
        priority: 1,
      });
    } else if (delta > semPassada * 0.2) {
      insights.push({
        id: 'tendencia-alta',
        type: 'success',
        emoji: '📈',
        title: 'Ritmo de cadastros crescendo',
        description: `Esta semana: ${semAtual} cadastros — +${pct}% em relacao a semana passada (${semPassada})`,
        priority: 3,
      });
    }
  }

  // 4. Oportunidade: bairro com muitos indecisos
  const bairroInd: Record<string, { total: number; indeciso: number }> = {};
  electors.forEach(e => {
    const b = e.bairro || e.cidade || 'Sem bairro';
    if (!bairroInd[b]) bairroInd[b] = { total: 0, indeciso: 0 };
    bairroInd[b].total++;
    if (e.nivelVoto === 'indeciso') bairroInd[b].indeciso++;
  });
  const melhorOp = Object.entries(bairroInd)
    .filter(([, { total }]) => total >= 5)
    .map(([bairro, { total, indeciso }]) => ({ bairro, pct: Math.round((indeciso / total) * 100), indeciso }))
    .sort((a, b) => b.pct - a.pct)[0];
  if (melhorOp && melhorOp.pct >= 30) {
    insights.push({
      id: `oportunidade-${melhorOp.bairro}`,
      type: 'info',
      emoji: '🎯',
      title: `Oportunidade em ${melhorOp.bairro}`,
      description: `${melhorOp.pct}% dos eleitores estao indecisos (${melhorOp.indeciso} pessoas) — alto potencial de conversao`,
      priority: 2,
    });
  }

  // 5. Alta concentracao de oposicao
  const bairroOp: Record<string, { total: number; oposicao: number }> = {};
  electors.forEach(e => {
    const b = e.bairro || e.cidade || 'Sem bairro';
    if (!bairroOp[b]) bairroOp[b] = { total: 0, oposicao: 0 };
    bairroOp[b].total++;
    if (e.nivelVoto === 'oposicao') bairroOp[b].oposicao++;
  });
  const piorOp = Object.entries(bairroOp)
    .filter(([, { total }]) => total >= 5)
    .map(([bairro, { total, oposicao }]) => ({ bairro, pct: Math.round((oposicao / total) * 100) }))
    .sort((a, b) => b.pct - a.pct)[0];
  if (piorOp && piorOp.pct >= 25) {
    insights.push({
      id: `oposicao-${piorOp.bairro}`,
      type: 'danger',
      emoji: '🔴',
      title: `Alta oposicao em ${piorOp.bairro}`,
      description: `${piorOp.pct}% dos eleitores em ${piorOp.bairro} sao oposicao — reavaliar esforco nessa area`,
      priority: 2,
    });
  }

  // 6. Captador destaque da semana
  const semContagem: Record<string, number> = {};
  noIntervalo(electors, 7).forEach(e => {
    if (e.createdBy) semContagem[e.createdBy] = (semContagem[e.createdBy] || 0) + 1;
  });
  const topEntry = Object.entries(semContagem).sort(([, a], [, b]) => b - a)[0];
  if (topEntry && topEntry[1] >= 3) {
    const topUser = users.find(u => u.id === topEntry[0]);
    if (topUser) {
      insights.push({
        id: `destaque-${topUser.id}`,
        type: 'success',
        emoji: '🏆',
        title: `${topUser.name} em destaque`,
        description: `Melhor captador da semana com ${topEntry[1]} cadastros`,
        priority: 3,
      });
    }
  }

  return insights.sort((a, b) => a.priority - b.priority);
}

// -- Score de risco por regiao ------------------------------------------------

export function computeRegionRisks(electors: ElectorData[]): RegionRisk[] {
  const map: Record<string, RegionRisk> = {};
  electors.forEach(e => {
    const r = e.bairro || e.cidade || 'Sem regiao';
    if (!map[r]) map[r] = { nome: r, total: 0, riskScore: 0, fraco: 0, indeciso: 0, oposicao: 0, forte: 0 };
    map[r].total++;
    if (e.nivelVoto === 'fraco')    map[r].fraco++;
    if (e.nivelVoto === 'indeciso') map[r].indeciso++;
    if (e.nivelVoto === 'oposicao') map[r].oposicao++;
    if (e.nivelVoto === 'forte')    map[r].forte++;
  });
  return Object.values(map)
    .filter(r => r.total >= 2)
    .map(r => ({
      ...r,
      riskScore: Math.min(
        100,
        Math.round(((r.fraco * 0.5 + r.indeciso * 0.3 + r.oposicao * 1.0) / r.total) * 100)
      ),
    }))
    .sort((a, b) => b.riskScore - a.riskScore);
}

// -- Sugestoes de redistribuicao ---------------------------------------------

export function computeRedistribuicao(
  electors: ElectorData[],
  users: User[]
): RedistribuicaoSugestao[] {
  const sugestoes: RedistribuicaoSugestao[] = [];
  const now = Date.now();
  const captadores = users.filter(u => u.role === 'captador_votos');

  const inativos = captadores.filter(c => {
    const proprios = electors.filter(e => e.createdBy === c.id);
    if (!proprios.length) return false;
    const ultimo = proprios.reduce((a, b) =>
      new Date(a.dataCadastro) > new Date(b.dataCadastro) ? a : b
    );
    return (now - new Date(ultimo.dataCadastro).getTime()) / 864e5 >= 5;
  });

  const bairroAtiv: Record<string, number> = {};
  noIntervalo(electors, 7).forEach(e => {
    const b = e.bairro || e.cidade || 'Sem bairro';
    bairroAtiv[b] = (bairroAtiv[b] || 0) + 1;
  });

  const bairroInd: Record<string, number> = {};
  electors.filter(e => e.nivelVoto === 'indeciso').forEach(e => {
    const b = e.bairro || e.cidade || 'Sem bairro';
    bairroInd[b] = (bairroInd[b] || 0) + 1;
  });
  const topIndeciso = Object.entries(bairroInd).sort(([, a], [, b]) => b - a)[0]?.[0];
  const topAtivo    = Object.entries(bairroAtiv).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'regiao central';

  for (const cap of inativos) {
    sugestoes.push({
      captador: cap.name,
      motivo: 'Sem atividade nos ultimos 5+ dias',
      regiaoSugerida: topIndeciso ?? topAtivo,
    });
  }
  return sugestoes;
}
