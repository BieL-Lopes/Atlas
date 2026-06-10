import { useState } from 'react';
import { X, Copy, Check, UserPlus } from 'lucide-react';
import { UserRole, ROLE_LABELS } from '../lib/rbac';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User } from '../lib/auth';

interface GenerateInviteModalProps {
  user: User;
  onClose: () => void;
}

export function GenerateInviteModal({ user, onClose }: GenerateInviteModalProps) {
  const [role, setRole] = useState<UserRole>('captador_votos');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    
    // Generate 6 uppercase alphanumeric chars
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: insertError } = await supabase
          .from('invites')
          .insert([{
            chave_unica: code,
            role: role,
            criado_por: user.id
          }]);

        if (insertError) {
          throw insertError;
        }
      } catch (err: any) {
        console.error('Error generating invite:', err);
        setError('Erro ao gerar convite no banco. Você tem permissão?');
        setLoading(false);
        return;
      }
    }

    setGeneratedCode(code);
    setLoading(false);
  };

  const handleCopy = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Gerar Convite
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!generatedCode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil de Acesso
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full border-gray-300 rounded-xl shadow-sm py-2.5 px-3 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Um código único será gerado para que o usuário crie sua conta com este perfil.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? 'Gerando...' : 'Gerar Código de Convite'}
              </button>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <div>
                <p className="text-sm text-gray-600 mb-2">Código gerado com sucesso!</p>
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-3xl font-mono font-bold tracking-widest text-gray-900 mx-auto">
                    {generatedCode}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCopy}
                className="w-full py-3 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition-colors"
              >
                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copiado!' : 'Copiar Código'}
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
              >
                Concluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
