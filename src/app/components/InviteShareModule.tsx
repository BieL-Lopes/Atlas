import { Copy, Check, MessageCircle, Users } from 'lucide-react';
import { User } from '../lib/auth';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface InviteShareModuleProps {
  user: User;
}

export function InviteShareModule({ user }: InviteShareModuleProps) {
  const { copied, copyToClipboard } = useCopyToClipboard();

  // Usa o origin atual para o link dinâmico, formato amigável /convite/CODIGO (fallback para ID se legado)
  const refCode = user.codigoConvite || user.id;
  const inviteLink = `${window.location.origin}/convite/${refCode}`;
  const promotionalText = `Olá! Tudo bem? Passando para te fazer um convite especial. Cadastre-se agora para receber as novidades da nossa campanha em primeira mão e fazer parte desse time. Clique no link e venha com a gente: ${inviteLink}`;

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(promotionalText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gold-soft overflow-hidden">
      {/* Header */}
      <div className="bg-gold-deep p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">Seu Link de Indicação</h3>
            <p className="text-xs text-white/80">Convide amigos e cresça sua rede</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Link Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
            Compartilhe este link único
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2.5 focus:outline-none"
            />
            <button
              onClick={() => copyToClipboard(inviteLink)}
              className="flex items-center justify-center w-12 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
              title="Copiar link"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* WhatsApp CTA */}
        <button
          onClick={handleShareWhatsApp}
          className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebd5b] text-white py-3 rounded-xl font-bold shadow-md transition-all active:scale-95"
        >
          <MessageCircle className="w-5 h-5" />
          Convidar via WhatsApp
        </button>
      </div>
    </div>
  );
}
