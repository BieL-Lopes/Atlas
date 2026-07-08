import { useState, useEffect } from 'react';
import { Plus, BarChart3, Users, Clock, TrendingUp, Download, FileText, FileSpreadsheet, X, Loader2, CheckCircle2, StopCircle } from 'lucide-react';
import { User } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getPermissions } from '../lib/rbac';

interface Poll {
  id: string;
  titulo: string;
  opcoes: string[];
  status: 'ativa' | 'encerrada';
  created_at: string;
  respostas: number;
}

interface PollsScreenProps {
  user: User;
}

export function PollsScreen({ user }: PollsScreenProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Form
  const [formTitulo, setFormTitulo] = useState('');
  const [formOpcoes, setFormOpcoes] = useState(['', '']);

  const canManage = getPermissions(user.role).canManagePolls;

  useEffect(() => { fetchPolls(); }, []);

  const fetchPolls = async () => {
    setLoading(true);
    if (isSupabaseConfigured && supabase) {
      const { data: enquetes } = await supabase
        .from('enquetes')
        .select('id, titulo, opcoes, status, created_at')
        .order('created_at', { ascending: false });

      if (enquetes) {
        // Count votes per enquete
        const withCounts = await Promise.all(
          enquetes.map(async (e: Record<string, unknown>) => {
            const { count } = await supabase
              .from('enquete_votos')
              .select('*', { count: 'exact', head: true })
              .eq('enquete_id', e.id as string);
            return {
              id: e.id as string,
              titulo: e.titulo as string,
              opcoes: (e.opcoes as string[]) ?? [],
              status: e.status as 'ativa' | 'encerrada',
              created_at: e.created_at as string,
              respostas: count ?? 0,
            };
          })
        );
        setPolls(withCounts);
      }
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    const titulo = formTitulo.trim();
    const opcoes = formOpcoes.map(o => o.trim()).filter(Boolean);
    if (!titulo) { alert('Digite o título da enquete'); return; }
    if (opcoes.length < 2) { alert('Adicione pelo menos 2 opções'); return; }

    setSaving(true);
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('enquetes')
        .insert({ titulo, opcoes, status: 'ativa', criado_por: user.id })
        .select()
        .single();
      if (data) {
        setPolls(prev => [{
          id: data.id as string,
          titulo: data.titulo as string,
          opcoes: data.opcoes as string[],
          status: 'ativa',
          created_at: data.created_at as string,
          respostas: 0,
        }, ...prev]);
      }
    }
    setFormTitulo('');
    setFormOpcoes(['', '']);
    setShowForm(false);
    setSaving(false);
  };

  const toggleStatus = async (poll: Poll) => {
    const newStatus = poll.status === 'ativa' ? 'encerrada' : 'ativa';
    if (isSupabaseConfigured && supabase) {
      await supabase.from('enquetes').update({ status: newStatus }).eq('id', poll.id);
    }
    setPolls(prev => prev.map(p => p.id === poll.id ? { ...p, status: newStatus } : p));
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  const totalRespostas = polls.reduce((acc, p) => acc + p.respostas, 0);
  const totalAtivas = polls.filter(p => p.status === 'ativa').length;

  const exportToCSV = () => {
    const headers = ['Titulo', 'Data', 'Respostas', 'Status'];
    const rows = polls.map(p => [
      p.titulo,
      new Date(p.created_at).toLocaleDateString('pt-BR'),
      p.respostas.toString(),
      p.status === 'ativa' ? 'Ativa' : 'Encerrada',
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enquetes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatorio de Enquetes</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}h1{color:#2563eb;font-size:18px}
    .stats{display:flex;gap:30px;margin:20px 0}.stat{text-align:center}
    .stat-value{font-size:24px;font-weight:bold;color:#2563eb}.stat-label{font-size:10px;color:#666}
    table{width:100%;border-collapse:collapse}th{background:#2563eb;color:white;padding:8px;text-align:left;font-size:10px}
    td{padding:8px;border-bottom:1px solid #ddd;font-size:11px}tr:nth-child(even){background:#f9fafb}
    .badge{padding:3px 8px;border-radius:10px;font-size:9px;font-weight:bold}
    .ativa{background:#dcfce7;color:#166534}.encerrada{background:#f3f4f6;color:#374151}</style></head>
    <body><h1>Relatório de Enquetes</h1>
    <p style="color:#666;font-size:11px">Exportado em ${new Date().toLocaleDateString('pt-BR')}</p>
    <div class="stats">
      <div class="stat"><div class="stat-value">${polls.length}</div><div class="stat-label">Total de Enquetes</div></div>
      <div class="stat"><div class="stat-value">${totalRespostas}</div><div class="stat-label">Total de Respostas</div></div>
      <div class="stat"><div class="stat-value">${totalAtivas}</div><div class="stat-label">Enquetes Ativas</div></div>
    </div>
    <table><thead><tr><th>Titulo</th><th>Data</th><th>Respostas</th><th>Status</th></tr></thead>
    <tbody>${polls.map(p => `<tr><td><strong>${p.titulo}</strong></td>
      <td>${new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
      <td>${p.respostas}</td>
      <td><span class="badge ${p.status}">${p.status === 'ativa' ? 'Ativa' : 'Encerrada'}</span></td></tr>`).join('')}
    </tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
    setShowExportMenu(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gold-deep text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Enquetes</h1>
            <p className="text-sm text-gold-soft">Pesquisas de opinião</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 hover:bg-gold-deep rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-12 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-20 min-w-[180px]">
                <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Exportar</span>
                  <button onClick={() => setShowExportMenu(false)} className="p-1 hover:bg-gray-200 rounded">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <button onClick={exportToCSV} className="w-full px-4 py-3 text-left hover:bg-gold flex items-center text-gray-700 transition-colors">
                  <FileSpreadsheet className="w-5 h-5 mr-3 text-emerald-600" />
                  <div><p className="font-medium text-sm">CSV / Excel</p><p className="text-xs text-gray-500">Planilha completa</p></div>
                </button>
                <button onClick={exportToPDF} className="w-full px-4 py-3 text-left hover:bg-gold flex items-center text-gray-700 border-t border-gray-100 transition-colors">
                  <FileText className="w-5 h-5 mr-3 text-red-600" />
                  <div><p className="font-medium text-sm">PDF / Imprimir</p><p className="text-xs text-gray-500">Relatório formatado</p></div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Criar Enquete (só para quem pode gerenciar) */}
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full bg-gold-deep hover:bg-gold-deep text-white py-4 px-6 rounded-xl font-semibold shadow-lg flex items-center justify-center transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />
            Criar Nova Enquete
          </button>
        )}

        {/* Formulário */}
        {showForm && canManage && (
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gold-deep">
            <h3 className="font-bold text-gray-900 mb-4">Nova Enquete</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Pergunta da enquete"
                value={formTitulo}
                onChange={e => setFormTitulo(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none"
              />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Opções de resposta</p>
              {formOpcoes.map((op, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Opção ${i + 1}`}
                    value={op}
                    onChange={e => {
                      const next = [...formOpcoes];
                      next[i] = e.target.value;
                      setFormOpcoes(next);
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none"
                  />
                  {formOpcoes.length > 2 && (
                    <button
                      onClick={() => setFormOpcoes(prev => prev.filter((_, idx) => idx !== i))}
                      className="px-3 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setFormOpcoes(prev => [...prev, ''])}
                className="text-sm text-gold-deep hover:underline font-medium"
              >
                + Adicionar opção
              </button>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 bg-gold-deep hover:bg-gold-deep disabled:opacity-50 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Publicar Enquete
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-gold-deep" />
            Resumo
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{totalRespostas}</p>
              <p className="text-sm text-gray-600">Respostas</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gold-deep">{totalAtivas}</p>
              <p className="text-sm text-gray-600">Ativas</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-700">{polls.length}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>
        </div>

        {/* Lista */}
        <div>
          <h3 className="font-bold text-gray-900 mb-3">Enquetes</h3>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gold-soft" />
            </div>
          ) : polls.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600">Nenhuma enquete criada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {polls.map(poll => (
                <div key={poll.id} className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-900 flex-1 mr-3">{poll.titulo}</h4>
                    <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${
                      poll.status === 'ativa'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {poll.status === 'ativa' ? '✓ Ativa' : 'Encerrada'}
                    </span>
                  </div>

                  {poll.opcoes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {poll.opcoes.map(op => (
                        <span key={op} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{op}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span className="font-semibold text-gold-deep">{poll.respostas} respostas</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDate(poll.created_at)}
                      </span>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => toggleStatus(poll)}
                        className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                          poll.status === 'ativa'
                            ? 'text-red-600 bg-red-50 hover:bg-red-100'
                            : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {poll.status === 'ativa'
                          ? <><StopCircle className="w-3.5 h-3.5" /> Encerrar</>
                          : <><CheckCircle2 className="w-3.5 h-3.5" /> Reabrir</>
                        }
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-gold-deep rounded-xl p-5 border-2 border-gold-deep">
          <div className="flex items-start">
            <BarChart3 className="w-6 h-6 text-gold-deep mr-3 shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-gray-900 mb-1">Enquetes via WhatsApp</h4>
              <p className="text-sm text-gray-700">
                Envie pesquisas de opinião rápidas para eleitores que aceitaram receber mensagens.
                Os resultados aparecem em tempo real.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
