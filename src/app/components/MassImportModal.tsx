import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, FileText, Info } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ElectorData, StatusFunil } from './CaptureForm';
import { db } from '../lib/db';
import { pushPendingChanges } from '../lib/syncService';
import { isSupabaseConfigured } from '../lib/supabase';
import { logAudit } from '../lib/auditService';
import { toast } from 'sonner';
import { User } from '../lib/auth';

interface Props {
  user: User;
  onClose: () => void;
  onImported: () => void;
}

interface ParsedRow {
  nome: string;
  whatsapp: string;
  email?: string;
  cidade: string;
  bairro?: string;
  nivelVoto?: string;
  statusFunil?: string;
  dataNascimento?: string;
  observacoes?: string;
  nichos?: string;
}

interface ValidationResult {
  row: ParsedRow;
  index: number;
  errors: string[];
  isValid: boolean;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

const VALID_NIVEL_VOTO = ['forte', 'medio', 'fraco', 'indeciso', 'oposicao'];
const VALID_STATUS_FUNIL: StatusFunil[] = ['contato', 'interessado', 'simpatizante', 'apoiador', 'multiplicador'];

// Column name aliases for smart mapping
const COLUMN_MAP: Record<string, keyof ParsedRow> = {
  nome: 'nome', name: 'nome', 'nome completo': 'nome',
  whatsapp: 'whatsapp', telefone: 'whatsapp', celular: 'whatsapp', phone: 'whatsapp', tel: 'whatsapp',
  email: 'email', 'e-mail': 'email',
  cidade: 'cidade', city: 'cidade', municipio: 'cidade',
  bairro: 'bairro', neighborhood: 'bairro',
  'nivel voto': 'nivelVoto', 'nível voto': 'nivelVoto', nivel_voto: 'nivelVoto', voto: 'nivelVoto',
  'status funil': 'statusFunil', status_funil: 'statusFunil', funil: 'statusFunil', status: 'statusFunil',
  'data nascimento': 'dataNascimento', nascimento: 'dataNascimento', data_nascimento: 'dataNascimento',
  observacoes: 'observacoes', observações: 'observacoes', obs: 'observacoes', notas: 'observacoes',
  nichos: 'nichos', interesses: 'nichos', tags: 'nichos',
};

const normalizeString = (str?: string) => {
  if (!str) return '';
  return str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export function MassImportModal({ user, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [rawData, setRawData] = useState<ParsedRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [importedCount, setImportedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mapColumns = (headers: string[], rows: Record<string, string>[]): ParsedRow[] => {
    const headerMap: Record<number, keyof ParsedRow> = {};
    headers.forEach((h, i) => {
      const normalized = h.toLowerCase().trim();
      if (COLUMN_MAP[normalized]) {
        headerMap[i] = COLUMN_MAP[normalized];
      }
    });

    return rows.map(row => {
      const mapped: Record<string, string> = {};
      const values = Object.values(row);
      Object.entries(headerMap).forEach(([i, key]) => {
        mapped[key] = values[Number(i)]?.trim() ?? '';
      });
      return mapped as unknown as ParsedRow;
    });
  };

  const validate = (rows: ParsedRow[]): ValidationResult[] => {
    return rows.map((row, index) => {
      const errors: string[] = [];
      if (!row.nome?.trim()) errors.push('Nome obrigatório');
      if (!row.whatsapp?.trim()) errors.push('WhatsApp obrigatório');
      if (!row.cidade?.trim()) errors.push('Cidade obrigatória');
      const nv = normalizeString(row.nivelVoto);
      if (row.nivelVoto && !VALID_NIVEL_VOTO.includes(nv)) {
        errors.push(`Nível de voto inválido: ${row.nivelVoto}`);
      }
      
      const sf = normalizeString(row.statusFunil);
      if (row.statusFunil && !VALID_STATUS_FUNIL.includes(sf as StatusFunil)) {
        errors.push(`Status funil inválido: ${row.statusFunil}`);
      }
      return { row, index: index + 1, errors, isValid: errors.length === 0 };
    });
  };

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => {
          const headers = results.meta.fields ?? [];
          const mapped = mapColumns(headers, results.data as Record<string, string>[]);
          setRawData(mapped);
          setValidationResults(validate(mapped));
          setStep('preview');
        },
        error: () => {
          toast.error('Erro ao ler arquivo CSV');
        }
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target?.result, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
          if (jsonData.length === 0) {
            toast.error('Planilha vazia');
            return;
          }
          const headers = Object.keys(jsonData[0]);
          const mapped = mapColumns(headers, jsonData);
          setRawData(mapped);
          setValidationResults(validate(mapped));
          setStep('preview');
        } catch {
          toast.error('Erro ao ler arquivo Excel');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('Formato não suportado. Use .csv ou .xlsx');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    const validRows = validationResults.filter(v => v.isValid);
    if (validRows.length === 0) return;

    setStep('importing');
    setProgress({ current: 0, total: validRows.length });

    let imported = 0;
    let errors = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < validRows.length; i++) {
      try {
        const row = validRows[i].row;
        const elector: ElectorData = {
          id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          nome: row.nome.trim(),
          whatsapp: row.whatsapp.trim(),
          email: row.email?.trim() || '',
          tituloEleitor: '',
          dataNascimento: row.dataNascimento?.trim() || '',
          bairro: row.bairro?.trim() || '',
          cidade: row.cidade.trim(),
          nivelVoto: (row.nivelVoto && VALID_NIVEL_VOTO.includes(normalizeString(row.nivelVoto)) ? normalizeString(row.nivelVoto) : 'medio') as ElectorData['nivelVoto'],
          nivelEngajamento: 'eleitor_comum',
          statusFunil: (row.statusFunil && VALID_STATUS_FUNIL.includes(normalizeString(row.statusFunil) as StatusFunil) ? normalizeString(row.statusFunil) : 'contato') as StatusFunil,
          nichos: row.nichos ? row.nichos.split(/[;,]/).map(n => n.trim()).filter(Boolean) : [],
          aceitaWhatsapp: true,
          observacoes: row.observacoes?.trim() || '',
          dataCadastro: now,
          updatedAt: now,
          atendimentos: [],
          createdBy: user.id,
          createdByName: user.name,
          regiao: user.regiao,
        };

        await db.electors.add(elector);
        await db.pendingChanges.add({
          operation: 'create',
          entityId: elector.id,
          payload: elector,
          timestamp: now,
        });

        imported++;
      } catch {
        errors++;
      }

      setProgress({ current: i + 1, total: validRows.length });
    }

    // Push para Supabase se online
    if (isSupabaseConfigured && navigator.onLine) {
      try {
        await pushPendingChanges();
      } catch {
        // Silencioso — será sincronizado depois
      }
    }

    // Log de auditoria
    logAudit({
      userId: user.id,
      userName: user.name,
      action: 'IMPORT',
      entity: 'eleitores',
      details: { total: validRows.length, imported, errors, fileName: 'bulk_import' },
    });

    setImportedCount(imported);
    setErrorCount(errors);
    setStep('done');
  };

  const validCount = validationResults.filter(v => v.isValid).length;
  const invalidCount = validationResults.filter(v => !v.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-gold-deep" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-900">Importar Contatos</h2>
                <div className="relative group">
                  <Info className="w-4 h-4 text-gray-500 cursor-help transition-colors hover:text-gold" />
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl border border-gray-700 pointer-events-none">
                    <p className="font-semibold mb-2 border-b border-gray-700 pb-1">Colunas esperadas:</p>
                    <ul className="space-y-1.5 text-gray-300">
                      <li><span className="font-mono text-[10px] bg-gray-700/50 text-white px-1.5 py-0.5 rounded border border-gray-600">nome</span> <span className="text-red-400 font-bold">*</span></li>
                      <li><span className="font-mono text-[10px] bg-gray-700/50 text-white px-1.5 py-0.5 rounded border border-gray-600">whatsapp</span> <span className="text-red-400 font-bold">*</span></li>
                      <li><span className="font-mono text-[10px] bg-gray-700/50 text-white px-1.5 py-0.5 rounded border border-gray-600">cidade</span> <span className="text-red-400 font-bold">*</span></li>
                      <li><span className="font-mono text-[10px] bg-gray-700/50 text-white px-1.5 py-0.5 rounded border border-gray-600">bairro</span></li>
                      <li><span className="font-mono text-[10px] bg-gray-700/50 text-white px-1.5 py-0.5 rounded border border-gray-600">email</span></li>
                      <li><span className="font-mono text-[10px] bg-gray-700/50 text-white px-1.5 py-0.5 rounded border border-gray-600">nivel_voto</span></li>
                      <li><span className="font-mono text-[10px] bg-gray-700/50 text-white px-1.5 py-0.5 rounded border border-gray-600">status_funil</span></li>
                      <li><span className="font-mono text-[10px] bg-gray-700/50 text-white px-1.5 py-0.5 rounded border border-gray-600">data_nascimento</span></li>
                      <li><span className="font-mono text-[10px] bg-gray-700/50 text-white px-1.5 py-0.5 rounded border border-gray-600">nichos</span></li>
                      <li><span className="font-mono text-[10px] bg-gray-700/50 text-white px-1.5 py-0.5 rounded border border-gray-600">observacoes</span></li>
                    </ul>
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-800 border-l border-t border-gray-700 rotate-45"></div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">CSV ou Excel (.xlsx)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 1 — Upload */}
          {step === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-gold-deep bg-blue-50'
                  : 'border-gray-300 hover:border-gold-deep hover:bg-gray-50'
              }`}
            >
              <FileSpreadsheet className={`w-14 h-14 mx-auto mb-4 ${isDragging ? 'text-gold-deep' : 'text-gray-500'}`} />
              <p className="text-lg font-semibold text-gray-700 mb-1">
                {isDragging ? 'Solte o arquivo aqui' : 'Arraste o arquivo ou clique para selecionar'}
              </p>
              <p className="text-sm text-gray-500">Suporta .csv e .xlsx (máx. 10MB)</p>
              <div className="mt-4 flex gap-2 justify-center text-xs text-gray-500">
                <span className="px-2 py-1 bg-gray-100 rounded">nome</span>
                <span className="px-2 py-1 bg-gray-100 rounded">whatsapp</span>
                <span className="px-2 py-1 bg-gray-100 rounded">cidade</span>
                <span className="px-2 py-1 bg-gray-100 rounded">bairro</span>
                <span className="px-2 py-1 bg-gray-100 rounded">...</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      toast.error('Arquivo maior que 10MB');
                      return;
                    }
                    handleFile(file);
                  }
                }}
              />
            </div>
          )}

          {/* Step 2 — Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{rawData.length}</p>
                  <p className="text-xs text-gray-500">Total de linhas</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-emerald-600">{validCount}</p>
                  <p className="text-xs text-gray-500">Válidos</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${invalidCount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className={`text-xl font-bold ${invalidCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>{invalidCount}</p>
                  <p className="text-xs text-gray-500">Com erros</p>
                </div>
              </div>

              {/* Preview table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-600">Preview (primeiras 5 linhas)</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-3 py-2 text-xs font-semibold text-gray-500">#</th>
                        <th className="px-3 py-2 text-xs font-semibold text-gray-500">Nome</th>
                        <th className="px-3 py-2 text-xs font-semibold text-gray-500">WhatsApp</th>
                        <th className="px-3 py-2 text-xs font-semibold text-gray-500">Cidade</th>
                        <th className="px-3 py-2 text-xs font-semibold text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {validationResults.slice(0, 5).map((v) => (
                        <tr key={v.index} className={v.isValid ? '' : 'bg-red-50'}>
                          <td className="px-3 py-2 text-xs text-gray-500">{v.index}</td>
                          <td className="px-3 py-2 font-medium text-gray-900 max-w-[120px] truncate">{v.row.nome || '—'}</td>
                          <td className="px-3 py-2 text-gray-600 max-w-[100px] truncate">{v.row.whatsapp || '—'}</td>
                          <td className="px-3 py-2 text-gray-600 max-w-[100px] truncate">{v.row.cidade || '—'}</td>
                          <td className="px-3 py-2">
                            {v.isValid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <span className="text-xs text-red-600 truncate">{v.errors[0]}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invalid rows summary */}
              {invalidCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-red-800 mb-1">
                    ⚠ {invalidCount} linha{invalidCount !== 1 ? 's' : ''} com erros (serão ignoradas)
                  </p>
                  <p className="text-xs text-red-600">
                    Apenas os {validCount} registros válidos serão importados.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Importing */}
          {step === 'importing' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-gold-deep animate-spin mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900 mb-2">Importando contatos...</p>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className="bg-gold-deep h-3 rounded-full transition-all"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">{progress.current} de {progress.total}</p>
            </div>
          )}

          {/* Step 4 — Done */}
          {step === 'done' && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <p className="text-xl font-bold text-gray-900 mb-2">Importação concluída!</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-emerald-600">{importedCount}</p>
                  <p className="text-xs text-gray-600">Importados com sucesso</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                  <p className="text-xs text-gray-600">Erros</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Os contatos serão sincronizados automaticamente com o servidor.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex gap-3">
          {step === 'upload' && (
            <button onClick={onClose} className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => { setStep('upload'); setRawData([]); setValidationResults([]); }} className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                Voltar
              </button>
              <button
                onClick={handleImport}
                disabled={validCount === 0}
                className="flex-1 py-3 px-4 bg-gold-deep hover:bg-gold-deep disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Importar {validCount} contato{validCount !== 1 ? 's' : ''}
              </button>
            </>
          )}
          {step === 'done' && (
            <button
              onClick={() => { onImported(); onClose(); }}
              className="flex-1 py-3 px-4 bg-gold-deep hover:bg-gold-deep text-white rounded-xl font-semibold transition-colors"
            >
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
