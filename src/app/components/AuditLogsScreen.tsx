import { useState, useEffect } from 'react';
import { Shield, Search, Filter, ChevronLeft, ChevronRight, Clock, User as UserIcon, FileText } from 'lucide-react';
import { fetchAuditLogs, AuditLogEntry, AuditAction } from '../lib/auditService';
import { User } from '../lib/auth';

interface Props {
  user: User;
}

const ACTION_BADGES: Record<AuditAction, { label: string; style: string }> = {
  CREATE: { label: 'Criação', style: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  UPDATE: { label: 'Edição', style: 'bg-gold/10 text-gold-deep border-gold-deep' },
  DELETE: { label: 'Exclusão', style: 'bg-red-100 text-red-800 border-red-200' },
  EXPORT: { label: 'Exportação', style: 'bg-purple-100 text-purple-800 border-purple-200' },
  IMPORT: { label: 'Importação', style: 'bg-amber-100 text-amber-800 border-amber-200' },
  LOGIN:  { label: 'Login', style: 'bg-gray-100 text-gray-800 border-gray-200' },
};

const PAGE_SIZE = 30;

export function AuditLogsScreen({ user }: Props) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    const result = await fetchAuditLogs({
      page,
      pageSize: PAGE_SIZE,
      actionFilter: actionFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    setLogs(result.data);
    setTotalCount(result.count);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter, startDate, endDate]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const filteredLogs = searchTerm
    ? logs.filter(l =>
        l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.entityId ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : logs;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header */}
      <div className="bg-gold-deep text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-7 h-7" />
          <div>
            <h1 className="text-2xl font-bold">Logs do Sistema</h1>
            <p className="text-sm text-gold-soft">Trilha de auditoria • Compliance LGPD</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-deep"
              placeholder="Buscar por usuário ou entidade..."
            />
          </div>
          <button
            type="button"
            aria-label="Abrir filtros"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-lg transition-colors ${
              showFilters ? 'bg-white text-gold-deep' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActionFilter('')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                !actionFilter ? 'bg-gold-deep text-white border-gold-deep' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Todas
            </button>
            {(Object.keys(ACTION_BADGES) as AuditAction[]).map(action => {
              const badge = ACTION_BADGES[action];
              const isActive = actionFilter === action;
              return (
                <button
                  key={action}
                  onClick={() => setActionFilter(isActive ? '' : action)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    isActive ? 'bg-gold-deep text-white border-gold-deep' : `${badge.style} hover:opacity-80`
                  }`}
                >
                  {badge.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">De</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Até</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Counter */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            {totalCount.toLocaleString('pt-BR')} registro{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            Imutável
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-gold-deep border-t-blue-600 rounded-full mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Carregando logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Nenhum log encontrado</p>
            <p className="text-xs text-gray-400 mt-1">Ajuste os filtros ou aguarde novas ações</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filteredLogs.map(log => {
                const badge = ACTION_BADGES[log.action];
                return (
                  <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-4 h-4 text-gold-deep" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{log.userName || 'Sistema'}</p>
                          <p className="text-xs text-gray-400">{formatDate(log.createdAt)}</p>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${badge.style}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="ml-10 space-y-1">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{log.entity}</span>
                        {log.entityId && (
                          <span className="text-gray-400 ml-1 text-xs">#{log.entityId.slice(0, 8)}</span>
                        )}
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 inline-block">
                          {JSON.stringify(log.details).slice(0, 120)}
                          {JSON.stringify(log.details).length > 120 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg bg-white border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm text-gray-600">
              Página {page + 1} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg bg-white border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
