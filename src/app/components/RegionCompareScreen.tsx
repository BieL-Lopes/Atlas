import { useState } from 'react';
import { GitCompare, Users, FlaskConical } from 'lucide-react';
import { ElectorData } from './CaptureForm';

// ---------------------------------------------------------------------------
// MOCK — usado quando não há eleitores reais com ≥2 regiões distintas
// ---------------------------------------------------------------------------
function d(daysAgo: number) {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  return dt.toISOString();
}

const MOCK_ELECTORS: ElectorData[] = [
  // Região Centro — 12 eleitores
  { id: 'm1',  nome: 'Ana Lima',        whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Centro', cidade: 'Cidade', nivelVoto: 'forte',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(1),  atendimentos: [], regiao: 'Centro' },
  { id: 'm2',  nome: 'Bruno Souza',     whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Centro', cidade: 'Cidade', nivelVoto: 'forte',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(2),  atendimentos: [], regiao: 'Centro' },
  { id: 'm3',  nome: 'Carla Matos',     whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Centro', cidade: 'Cidade', nivelVoto: 'forte',    nivelEngajamento: 'cabo_eleitoral', nichos: [], aceitaWhatsapp: true, observacoes: '', dataCadastro: d(3),  atendimentos: [], regiao: 'Centro' },
  { id: 'm4',  nome: 'Diego Ferreira',  whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Centro', cidade: 'Cidade', nivelVoto: 'medio',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: false, observacoes: '', dataCadastro: d(5),  atendimentos: [], regiao: 'Centro' },
  { id: 'm5',  nome: 'Elisa Rocha',     whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Centro', cidade: 'Cidade', nivelVoto: 'medio',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(6),  atendimentos: [], regiao: 'Centro' },
  { id: 'm6',  nome: 'Felipe Nunes',    whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Centro', cidade: 'Cidade', nivelVoto: 'indeciso',  nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(8),  atendimentos: [], regiao: 'Centro' },
  { id: 'm7',  nome: 'Gabriela Costa',  whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Centro', cidade: 'Cidade', nivelVoto: 'forte',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(10), atendimentos: [], regiao: 'Centro' },
  { id: 'm8',  nome: 'Hugo Alves',      whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Centro', cidade: 'Cidade', nivelVoto: 'fraco',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: false, observacoes: '', dataCadastro: d(12), atendimentos: [], regiao: 'Centro' },
  { id: 'm9',  nome: 'Isabela Pinto',   whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Centro', cidade: 'Cidade', nivelVoto: 'oposicao', nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: false, observacoes: '', dataCadastro: d(15), atendimentos: [], regiao: 'Centro' },
  { id: 'm10', nome: 'João Mendes',     whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Centro', cidade: 'Cidade', nivelVoto: 'forte',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(20), atendimentos: [], regiao: 'Centro' },
  { id: 'm11', nome: 'Karen Dias',      whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Centro', cidade: 'Cidade', nivelVoto: 'medio',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(25), atendimentos: [], regiao: 'Centro' },
  { id: 'm12', nome: 'Lucas Teixeira',  whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Centro', cidade: 'Cidade', nivelVoto: 'indeciso',  nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(28), atendimentos: [], regiao: 'Centro' },
  // Região Norte — 10 eleitores
  { id: 'm13', nome: 'Marina Silva',    whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Norte',  cidade: 'Cidade', nivelVoto: 'forte',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(0),  atendimentos: [], regiao: 'Norte' },
  { id: 'm14', nome: 'Nelson Ramos',    whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Norte',  cidade: 'Cidade', nivelVoto: 'medio',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(1),  atendimentos: [], regiao: 'Norte' },
  { id: 'm15', nome: 'Olivia Santos',   whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Norte',  cidade: 'Cidade', nivelVoto: 'medio',    nivelEngajamento: 'cabo_eleitoral', nichos: [], aceitaWhatsapp: true, observacoes: '', dataCadastro: d(3),  atendimentos: [], regiao: 'Norte' },
  { id: 'm16', nome: 'Paulo Barros',    whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Norte',  cidade: 'Cidade', nivelVoto: 'indeciso',  nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: false, observacoes: '', dataCadastro: d(4),  atendimentos: [], regiao: 'Norte' },
  { id: 'm17', nome: 'Quintina Moura',  whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Norte',  cidade: 'Cidade', nivelVoto: 'fraco',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(6),  atendimentos: [], regiao: 'Norte' },
  { id: 'm18', nome: 'Rafael Gomes',    whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Norte',  cidade: 'Cidade', nivelVoto: 'forte',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(9),  atendimentos: [], regiao: 'Norte' },
  { id: 'm19', nome: 'Sofia Cardoso',   whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Norte',  cidade: 'Cidade', nivelVoto: 'oposicao', nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: false, observacoes: '', dataCadastro: d(11), atendimentos: [], regiao: 'Norte' },
  { id: 'm20', nome: 'Thiago Leal',     whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Norte',  cidade: 'Cidade', nivelVoto: 'oposicao', nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: false, observacoes: '', dataCadastro: d(14), atendimentos: [], regiao: 'Norte' },
  { id: 'm21', nome: 'Ursula Franco',   whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Norte',  cidade: 'Cidade', nivelVoto: 'indeciso',  nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(18), atendimentos: [], regiao: 'Norte' },
  { id: 'm22', nome: 'Victor Cunha',    whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Norte',  cidade: 'Cidade', nivelVoto: 'medio',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(22), atendimentos: [], regiao: 'Norte' },
  // Região Sul — 8 eleitores
  { id: 'm23', nome: 'Wanda Freitas',   whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Sul',    cidade: 'Cidade', nivelVoto: 'forte',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(2),  atendimentos: [], regiao: 'Sul' },
  { id: 'm24', nome: 'Xavier Melo',     whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Sul',    cidade: 'Cidade', nivelVoto: 'forte',    nivelEngajamento: 'cabo_eleitoral', nichos: [], aceitaWhatsapp: true, observacoes: '', dataCadastro: d(4),  atendimentos: [], regiao: 'Sul' },
  { id: 'm25', nome: 'Yasmin Torres',   whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Sul',    cidade: 'Cidade', nivelVoto: 'medio',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(7),  atendimentos: [], regiao: 'Sul' },
  { id: 'm26', nome: 'Zara Oliveira',   whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Sul',    cidade: 'Cidade', nivelVoto: 'indeciso',  nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(9),  atendimentos: [], regiao: 'Sul' },
  { id: 'm27', nome: 'André Castro',    whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Sul',    cidade: 'Cidade', nivelVoto: 'forte',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(13), atendimentos: [], regiao: 'Sul' },
  { id: 'm28', nome: 'Beatriz Neves',   whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Sul',    cidade: 'Cidade', nivelVoto: 'fraco',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: false, observacoes: '', dataCadastro: d(17), atendimentos: [], regiao: 'Sul' },
  { id: 'm29', nome: 'Caio Peixoto',    whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Sul',    cidade: 'Cidade', nivelVoto: 'medio',    nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: true,  observacoes: '', dataCadastro: d(19), atendimentos: [], regiao: 'Sul' },
  { id: 'm30', nome: 'Débora Macedo',   whatsapp: '', tituloEleitor: '', dataNascimento: '', bairro: 'Sul',    cidade: 'Cidade', nivelVoto: 'oposicao', nivelEngajamento: 'eleitor_comum', nichos: [], aceitaWhatsapp: false, observacoes: '', dataCadastro: d(21), atendimentos: [], regiao: 'Sul' },
];

type Periodo = 'hoje' | 'semana' | 'mes' | 'tudo';

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: '7 dias' },
  { id: 'mes', label: '30 dias' },
  { id: 'tudo', label: 'Tudo' },
];

function filterByPeriodo(electors: ElectorData[], periodo: Periodo): ElectorData[] {
  if (periodo === 'tudo') return electors;
  const start = new Date();
  if (periodo === 'hoje') {
    start.setHours(0, 0, 0, 0);
  } else if (periodo === 'semana') {
    start.setDate(start.getDate() - 7);
  } else {
    start.setDate(start.getDate() - 30);
  }
  return electors.filter(e => new Date(e.dataCadastro) >= start);
}

function calcStats(electors: ElectorData[], regiao: string, periodo: Periodo) {
  const base = filterByPeriodo(
    electors.filter(e => (e.regiao ?? 'Sem região') === regiao),
    periodo
  );
  const total = base.length;
  const forte = base.filter(e => e.nivelVoto === 'forte').length;
  const medio = base.filter(e => e.nivelVoto === 'medio').length;
  const indeciso = base.filter(e => e.nivelVoto === 'indeciso').length;
  const oposicao = base.filter(e => e.nivelVoto === 'oposicao').length;
  const projecao = Math.round(forte * 1.0 + medio * 0.6 + indeciso * 0.2);
  const conversao = total > 0 ? Math.round((forte / total) * 100) : 0;
  const dates = base.map(e => e.dataCadastro).sort().reverse();
  const ultimaAtividade = dates[0]
    ? new Date(dates[0]).toLocaleDateString('pt-BR')
    : '—';
  return { total, forte, medio, indeciso, oposicao, projecao, conversao, ultimaAtividade };
}

interface Props {
  electors: ElectorData[];
}

export function RegionCompareScreen({ electors }: Props) {
  const realRegioes = [...new Set(electors.map(e => e.regiao ?? 'Sem região'))].filter(Boolean);
  const usingMock = realRegioes.length < 2;
  const activeElectors = usingMock ? MOCK_ELECTORS : electors;
  const regioes = [...new Set(activeElectors.map(e => e.regiao ?? 'Sem região'))].sort();

  const [regiaoA, setRegiaoA] = useState(regioes[0] ?? '');
  const [regiaoB, setRegiaoB] = useState(regioes[1] ?? regioes[0] ?? '');
  const [periodo, setPeriodo] = useState<Periodo>('tudo');

  const statsA = regiaoA ? calcStats(activeElectors, regiaoA, periodo) : null;
  const statsB = regiaoB ? calcStats(activeElectors, regiaoB, periodo) : null;

  type Winner = 'a' | 'b' | 'tie';
  const w = (va: number, vb: number): Winner => va > vb ? 'a' : vb > va ? 'b' : 'tie';

  const rows: { label: string; a: string; b: string; winner: Winner }[] =
    statsA && statsB
      ? [
          { label: 'Cadastros', a: String(statsA.total), b: String(statsB.total), winner: w(statsA.total, statsB.total) },
          { label: 'Votos Fortes', a: String(statsA.forte), b: String(statsB.forte), winner: w(statsA.forte, statsB.forte) },
          { label: 'Projeção de Votos', a: String(statsA.projecao), b: String(statsB.projecao), winner: w(statsA.projecao, statsB.projecao) },
          { label: 'Conversão (%)', a: `${statsA.conversao}%`, b: `${statsB.conversao}%`, winner: w(statsA.conversao, statsB.conversao) },
          { label: 'Indeciso', a: String(statsA.indeciso), b: String(statsB.indeciso), winner: 'tie' },
          { label: 'Oposição', a: String(statsA.oposicao), b: String(statsB.oposicao), winner: w(statsB.oposicao, statsA.oposicao) }, // menor = melhor
          { label: 'Última Atividade', a: statsA.ultimaAtividade, b: statsB.ultimaAtividade, winner: 'tie' },
        ]
      : [];

  if (regioes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <GitCompare className="w-12 h-12 mb-3 opacity-40" />
        <p className="font-medium">Nenhum eleitor cadastrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner de mock */}
      {usingMock && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium rounded-lg px-3 py-2">
          <FlaskConical className="w-4 h-4 shrink-0" />
          Dados de exemplo — adicione eleitores em ≥2 regiões para ver dados reais.
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-3">
        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Período</p>
        <div className="flex gap-2">
          {PERIODOS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                periodo === p.id
                  ? 'bg-gold-deep text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Seletor de regiões */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow p-3 border-t-4 border-gold-deep">
          <p className="text-xs font-bold text-gold-deep mb-2 uppercase tracking-wide">Região A</p>
          <select
            value={regiaoA}
            onChange={e => setRegiaoA(e.target.value)}
            className="w-full text-sm font-semibold text-gray-800 bg-transparent border-0 focus:outline-none cursor-pointer"
          >
            {regioes.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="bg-white rounded-xl shadow p-3 border-t-4 border-purple-500">
          <p className="text-xs font-bold text-purple-600 mb-2 uppercase tracking-wide">Região B</p>
          <select
            value={regiaoB}
            onChange={e => setRegiaoB(e.target.value)}
            className="w-full text-sm font-semibold text-gray-800 bg-transparent border-0 focus:outline-none cursor-pointer"
          >
            {regioes.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Cards de destaque */}
      {statsA && statsB && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gold-deep rounded-xl shadow p-4 text-white">
            <p className="text-xs text-gold-soft uppercase tracking-wide mb-1 truncate">{regiaoA}</p>
            <p className="text-3xl font-bold">{statsA.projecao.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-gold-soft mt-1">votos projetados</p>
            <p className="text-xs text-gold-soft mt-2">{statsA.total} cadastros · {statsA.forte} fortes</p>
          </div>
          <div className="bg-purple-600 rounded-xl shadow p-4 text-white">
            <p className="text-xs text-purple-200 uppercase tracking-wide mb-1 truncate">{regiaoB}</p>
            <p className="text-3xl font-bold">{statsB.projecao.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-purple-200 mt-1">votos projetados</p>
            <p className="text-xs text-purple-100 mt-2">{statsB.total} cadastros · {statsB.forte} fortes</p>
          </div>
        </div>
      )}

      {/* Tabela comparativa */}
      {rows.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {/* Cabeçalho */}
          <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-100">
            <div className="p-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Métrica</div>
            <div className="p-3 text-xs font-bold text-gold-deep uppercase tracking-wide text-center truncate">{regiaoA}</div>
            <div className="p-3 text-xs font-bold text-purple-600 uppercase tracking-wide text-center truncate">{regiaoB}</div>
          </div>

          {rows.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-3 border-b border-gray-50 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}
            >
              <div className="p-3 text-sm text-gray-600 font-medium">{row.label}</div>
              <div className={`p-3 text-sm font-bold text-center ${row.winner === 'a' ? 'text-gold-deep' : 'text-gray-700'}`}>
                {row.winner === 'a' && <span className="mr-1">🏆</span>}
                {row.a}
              </div>
              <div className={`p-3 text-sm font-bold text-center ${row.winner === 'b' ? 'text-purple-600' : 'text-gray-700'}`}>
                {row.winner === 'b' && <span className="mr-1">🏆</span>}
                {row.b}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
