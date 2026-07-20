import { useState } from 'react';
import { X, Send, Megaphone } from 'lucide-react';
import { User } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toast } from 'sonner';

interface Props {
  user: User;
  onClose: () => void;
}

const DESTINO_OPTIONS: Record<string, { label: string; roles: string[] }[]> = {
  candidato: [
    { label: 'Todos', roles: ['todos'] },
    { label: 'Coordenadores + Lideranças', roles: ['coordenador', 'lideranca'] },
    { label: 'Apenas Lideranças', roles: ['lideranca'] },
    { label: 'Colaboradores / Voluntários', roles: ['colaborador'] },
    { label: 'Cabos Eleitorais', roles: ['cabo_eleitoral'] },
  ],
  coordenador: [
    { label: 'Lideranças', roles: ['lideranca'] },
    { label: 'Colaboradores / Voluntários', roles: ['colaborador'] },
    { label: 'Lideranças e Colaboradores', roles: ['lideranca', 'colaborador'] },
  ],
};

export function ComunicadoModal({ user, onClose }: Props) {
  const options = DESTINO_OPTIONS[user.role] ?? [];
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [destinoIdx, setDestinoIdx] = useState(0);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!titulo.trim() || !mensagem.trim()) {
      toast.error('Preencha título e mensagem');
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      toast.error('Supabase não configurado');
      return;
    }

    setSending(true);
    const destino = options[destinoIdx];
    const tituloTrimmed = titulo.trim();
    const mensagemTrimmed = mensagem.trim();

    const { error } = await supabase.from('comunicados').insert({
      titulo: tituloTrimmed,
      mensagem: mensagemTrimmed,
      remetente_id: user.id,
      remetente_nome: user.name,
      destino_roles: destino.roles,
    });

    if (error) {
      setSending(false);
      toast.error('Erro ao enviar comunicado');
      return;
    }

    // Disparar push e aguardar resultado para mostrar feedback
    const { data: pushData, error: pushError } = await supabase.functions.invoke('send-push', {
      body: {
        titulo: tituloTrimmed,
        mensagem: mensagemTrimmed,
        destino_roles: destino.roles,
        remetente_nome: user.name,
      },
    });

    if (pushError) {
      console.error('[Push] Edge function error:', pushError);
      // Não bloqueia o sucesso do comunicado, apenas avisa
      toast.warning(`Comunicado salvo, mas push falhou: ${pushError.message}`);
    } else {
      const sent = (pushData as { sent?: number })?.sent ?? 0;
      console.log(`[Push] ${sent} notificações enviadas`);
    }

    setSending(false);
    toast.success(`✅ Comunicado enviado para: ${destino.label}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gold/10 rounded-xl flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-gold-deep" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Enviar Comunicado</h2>
              <p className="text-xs text-gray-400">De: {user.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Destinatário */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Para
            </label>
            <select
              value={destinoIdx}
              onChange={e => setDestinoIdx(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gold-deep focus:border-transparent"
            >
              {options.map((opt, i) => (
                <option key={i} value={i}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Título
            </label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Reunião amanhã às 19h"
              maxLength={100}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gold-deep focus:border-transparent placeholder-gray-400"
            />
          </div>

          {/* Mensagem */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Mensagem
            </label>
            <textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              placeholder="Escreva o comunicado aqui..."
              rows={4}
              maxLength={1000}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gold-deep focus:border-transparent placeholder-gray-400 resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{mensagem.length}/1000</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !titulo.trim() || !mensagem.trim()}
            className="flex-1 py-2.5 bg-gold-deep hover:bg-gold-deep disabled:opacity-50 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
