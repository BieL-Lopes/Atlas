import { useState } from 'react';
import { Send, Megaphone } from 'lucide-react';
import { User } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toast } from 'sonner';
import { ModalShell } from './ModalShell';

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
    <ModalShell
      title="Enviar Comunicado"
      subtitle={`De: ${user.name}`}
      icon={Megaphone}
      onClose={onClose}
      footerActions={[
        { label: 'Cancelar', onClick: onClose, variant: 'secondary' },
        {
          label: sending ? 'Enviando...' : 'Enviar',
          onClick: handleSend,
          icon: Send,
          variant: 'primary',
          disabled: sending || !titulo.trim() || !mensagem.trim(),
        },
      ]}
    >
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
    </ModalShell>
  );
}
