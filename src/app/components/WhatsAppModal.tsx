import { useState, useMemo, useEffect } from 'react';
import {
  MessageCircle, X, Send, Users, ChevronRight,
  CheckCircle, AlertTriangle, Info, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { ElectorData } from './CaptureForm';
import { User } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────

type TemplateTipo = 'livre' | 'evento' | 'mobilizacao' | 'confirmacao';
type NivelVoto = ElectorData['nivelVoto'];

interface Filtros {
  niveisVoto: NivelVoto[];
  bairro: string;
  regiao: string;
}

const TEMPLATE_LABELS: Record<TemplateTipo, string> = {
  livre:        'Livre',
  evento:       'Evento',
  mobilizacao:  'Mobilização',
  confirmacao:  'Confirmação de presença',
};

const TEMPLATE_TEXTS: Record<TemplateTipo, string> = {
  livre:       '',
  evento:      'Olá! 👋 Você está convidado(a) para o nosso evento. Contamos com a sua presença!',
  mobilizacao: 'Olá! 📣 A campanha precisa de você. Juntos somos mais fortes. Vamos mobilizar nossa comunidade!',
  confirmacao: 'Olá! ✅ Por favor, confirme sua presença no evento de amanhã respondendo "SIM" para esta mensagem.',
};

const NIVEL_LABELS: Record<NivelVoto, string> = {
  forte:    'Forte',
  medio:    'Médio',
  fraco:    'Fraco',
  indeciso: 'Indeciso',
  oposicao: 'Oposição',
};

const NIVEL_COLORS: Record<NivelVoto, string> = {
  forte:    'bg-emerald-100 text-emerald-800 border-emerald-300',
  medio:    'bg-yellow-100 text-yellow-800 border-yellow-300',
  fraco:    'bg-red-100   text-red-800   border-red-300',
  indeciso: 'bg-gray-100  text-gray-700  border-gray-300',
  oposicao: 'bg-purple-100 text-purple-800 border-purple-300',
};

const ALL_NIVEIS: NivelVoto[] = ['forte', 'medio', 'fraco', 'indeciso'];

interface Props {
  user: User;
  electors: ElectorData[];
  onClose: () => void;
  onSent: () => void; // callback para recarregar histórico
}

// ── Component ──────────────────────────────────────────────────────────────

export function WhatsAppModal({ user, electors, onClose, onSent }: Props) {
  const [step, setStep] = useState<'compose' | 'confirm' | 'sending' | 'done'>('compose');
  const [template, setTemplate] = useState<TemplateTipo>('livre');
  const [mensagem, setMensagem] = useState('');
  const [filtros, setFiltros] = useState<Filtros>({ niveisVoto: ['forte', 'medio'], bairro: '', regiao: '' });
  const [isIndividual, setIsIndividual] = useState(false);
  const [individualNumber, setIndividualNumber] = useState('');

  // Opções únicas de bairro e região
  const bairros = useMemo(() => {
    const s = new Set(electors.map(e => e.bairro).filter(Boolean));
    return Array.from(s).sort();
  }, [electors]);

  const regioes = useMemo(() => {
    const s = new Set(electors.map(e => e.regiao ?? '').filter(Boolean));
    return Array.from(s).sort();
  }, [electors]);

  // Destinatários filtrados (aceitaWhatsapp=true é sempre obrigatório)
  const destinatarios = useMemo(() => {
    return electors.filter(e => {
      if (!e.aceitaWhatsapp) return false;
      if (!e.whatsapp) return false;
      if (filtros.niveisVoto.length > 0 && !filtros.niveisVoto.includes(e.nivelVoto)) return false;
      if (filtros.bairro && e.bairro !== filtros.bairro) return false;
      if (filtros.regiao && (e.regiao ?? '') !== filtros.regiao) return false;
      return true;
    });
  }, [electors, filtros]);

  // Ao mudar template, preencher texto
  useEffect(() => {
    if (TEMPLATE_TEXTS[template]) {
      setMensagem(TEMPLATE_TEXTS[template]);
    }
  }, [template]);

  const toggleNivel = (nivel: NivelVoto) => {
    setFiltros(f => ({
      ...f,
      niveisVoto: f.niveisVoto.includes(nivel)
        ? f.niveisVoto.filter(n => n !== nivel)
        : [...f.niveisVoto, nivel],
    }));
  };

  const handleEnviar = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error('Supabase não configurado');
      return;
    }
    if (!mensagem.trim()) {
      toast.error('Digite a mensagem antes de enviar');
      return;
    }
    if (isIndividual && individualNumber.replace(/\D/g, '').length < 10) {
      toast.error('Digite um número de WhatsApp válido');
      return;
    }
    if (!isIndividual && destinatarios.length === 0) {
      toast.error('Nenhum destinatário com os filtros selecionados');
      return;
    }
    setStep('confirm');
  };

  const handleConfirmar = async () => {
    if (!supabase) return;
    setStep('sending');

    try {
      // 1. Registrar o disparo no banco
      const { data: disparo, error: insertErr } = await supabase
        .from('disparos_whatsapp')
        .insert({
          mensagem: mensagem.trim(),
          template_tipo: template,
          filtros: isIndividual ? { individual: individualNumber } : { niveisVoto: filtros.niveisVoto, bairro: filtros.bairro || null, regiao: filtros.regiao || null },
          total_destinatarios: isIndividual ? 1 : destinatarios.length,
          remetente_id: user.id,
          remetente_nome: user.name,
          status: 'pendente',
        })
        .select('id')
        .single();

      if (insertErr || !disparo) {
        toast.error('Erro ao registrar disparo no banco');
        setStep('compose');
        return;
      }

      // 2. Invocar Edge Function com os números
      const numeros = isIndividual ? [individualNumber] : destinatarios.map(e => e.whatsapp).filter(Boolean) as string[];
      const { error: fnErr } = await supabase.functions.invoke('send-whatsapp', {
        body: { disparo_id: disparo.id, mensagem: mensagem.trim(), numeros },
      });

      if (fnErr) {
        const msg = (fnErr as { message?: string }).message ?? '';
        if (msg.includes('não configurada')) {
          toast.error('Evolution API não configurada. Configure os secrets no Supabase.');
        } else {
          toast.error(`Erro ao enviar: ${msg}`);
        }
        setStep('compose');
        return;
      }

      setStep('done');
      onSent();
    } catch (err) {
      console.error(err);
      toast.error('Erro inesperado ao enviar disparos');
      setStep('compose');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Novo Disparo WhatsApp</p>
              <p className="text-xs text-gray-500">Apenas eleitores com opt-in ativo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Step: Compose ── */}
        {(step === 'compose' || step === 'confirm') && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Templates */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Template</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TEMPLATE_LABELS) as TemplateTipo[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTemplate(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      template === t
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400'
                    }`}
                  >
                    {TEMPLATE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Tipo de Disparo */}
            <div className="flex items-center gap-2 mb-2">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={isIndividual} onChange={(e) => setIsIndividual(e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${isIndividual ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isIndividual ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <div className="ml-3 text-sm font-semibold text-gray-700">
                  Disparo Individual / Teste
                </div>
              </label>
            </div>

            {isIndividual ? (
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Número do WhatsApp</label>
                <input
                  type="text"
                  value={individualNumber}
                  onChange={(e) => {
                    const numbers = e.target.value.replace(/\D/g, '');
                    let formatted = numbers;
                    if (numbers.length <= 11) {
                      if (numbers.length > 6) formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
                      else if (numbers.length > 2) formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
                    } else {
                      if (numbers.length >= 13) {
                        formatted = `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`;
                      } else {
                        formatted = `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4)}`;
                      }
                    }
                    setIndividualNumber(formatted);
                  }}
                  placeholder="(11) 99999-9999"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            ) : (
              <>
                {/* Filtro: Nível de Voto */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Nível de apoio</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_NIVEIS.map(nivel => (
                      <button
                        key={nivel}
                        onClick={() => toggleNivel(nivel)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          filtros.niveisVoto.includes(nivel)
                            ? NIVEL_COLORS[nivel]
                            : 'bg-white text-gray-400 border-gray-200'
                        }`}
                      >
                        {NIVEL_LABELS[nivel]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Oposição nunca incluída em disparos de campanha
                  </p>
                </div>

                {/* Filtros: Bairro / Região */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Bairro</label>
                    <select
                      value={filtros.bairro}
                      onChange={e => setFiltros(f => ({ ...f, bairro: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value="">Todos</option>
                      {bairros.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Região</label>
                    <select
                      value={filtros.regiao}
                      onChange={e => setFiltros(f => ({ ...f, regiao: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value="">Todas</option>
                      {regioes.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                {/* Preview de destinatários */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  destinatarios.length > 0
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <Users className={`w-5 h-5 flex-shrink-0 ${destinatarios.length > 0 ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <div>
                    <p className={`font-bold text-sm ${destinatarios.length > 0 ? 'text-emerald-800' : 'text-gray-500'}`}>
                      {destinatarios.length} destinatário{destinatarios.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500">com WhatsApp opt-in ativo e filtros aplicados</p>
                  </div>
                </div>
              </>
            )}

            {/* Textarea */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase">Mensagem</p>
                <p className={`text-xs ${mensagem.length > 900 ? 'text-red-500' : 'text-gray-400'}`}>
                  {mensagem.length}/1000
                </p>
              </div>
              <textarea
                value={mensagem}
                onChange={e => setMensagem(e.target.value.slice(0, 1000))}
                placeholder="Digite a mensagem..."
                rows={5}
                className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Confirm step: preview */}
            {step === 'confirm' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <p className="font-semibold text-yellow-800 text-sm">Confirmar envio</p>
                </div>
                <p className="text-sm text-yellow-700">
                  Você está prestes a enviar uma mensagem para{' '}
                  <strong>{isIndividual ? 1 : destinatarios.length} pessoa{(!isIndividual && destinatarios.length !== 1) ? 's' : ''}</strong>.
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Step: Sending ── */}
        {step === 'sending' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            <div>
              <p className="font-bold text-gray-800">Enviando mensagens...</p>
              <p className="text-sm text-gray-500 mt-1">
                Processando {isIndividual ? 1 : destinatarios.length} destinatário{(!isIndividual && destinatarios.length !== 1) ? 's' : ''} com intervalo de segurança
              </p>
            </div>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <div>
              <p className="font-bold text-gray-800">Disparo enviado!</p>
              <p className="text-sm text-gray-500 mt-1">
                As mensagens foram processadas. Confira o histórico para detalhes.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Footer buttons */}
        {step !== 'sending' && step !== 'done' && (
          <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
            {step === 'compose' ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEnviar}
                  disabled={(isIndividual ? !individualNumber : destinatarios.length === 0) || !mensagem.trim()}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                  Continuar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep('compose')}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleConfirmar}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Enviar agora
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
