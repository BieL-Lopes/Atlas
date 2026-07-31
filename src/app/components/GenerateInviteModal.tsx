import { useState } from 'react';
import { Copy, Check, UserPlus, MapPin } from 'lucide-react';
import { UserRole, ROLE_LABELS } from '../lib/rbac';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User } from '../lib/auth';
import { getSystemSettings } from '../lib/settings';
import { ModalShell } from './ModalShell';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface GenerateInviteModalProps {
  user: User;
  onClose: () => void;
}

export function GenerateInviteModal({ user, onClose }: GenerateInviteModalProps) {
  const [role, setRole] = useState<UserRole>('colaborador');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { copied, copyToClipboard } = useCopyToClipboard();
  const regions = getSystemSettings().regions;

  // Região é obrigatória para todos os papéis exceto candidato
  const requiresRegion = role !== 'candidato';

  const handleGenerate = async () => {
    setLoading(true);
    setError('');

    if (requiresRegion && !selectedRegion) {
      setError('Selecione uma região para este perfil.');
      setLoading(false);
      return;
    }
    
    // Generate 6 uppercase alphanumeric chars
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: insertError } = await supabase
          .from('invites')
          .insert([{
            chave_unica: code,
            role: role,
            codigo_regiao: requiresRegion ? selectedRegion : null,
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

  const inviteLink = generatedCode
    ? `${window.location.origin}/convite/${generatedCode}`
    : '';

  return (
    <ModalShell
      title="Gerar Convite"
      subtitle="Crie um link de acesso"
      icon={UserPlus}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      {!generatedCode ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Perfil de Acesso
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full border-gray-300 rounded-xl shadow-sm py-2.5 px-3 focus:ring-gold-deep focus:border-gold-deep"
            >
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Um código único será gerado para que o usuário crie sua conta com este perfil.
            </p>
          </div>

          {requiresRegion && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gold-deep" />
                  Região *
                </span>
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full border-gray-300 rounded-xl shadow-sm py-2.5 px-3 focus:ring-gold-deep focus:border-gold-deep"
              >
                <option value="">Selecione a região...</option>
                {regions.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                O voluntário será vinculado a esta região ao se cadastrar.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-gold-deep hover:bg-gold-deep text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Gerando...' : 'Gerar Código de Convite'}
          </button>
        </div>
      ) : (
        <div className="space-y-6 text-center">
          <div>
            <p className="text-sm text-gray-600 mb-2">Link gerado com sucesso!</p>
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 flex items-center justify-between overflow-x-auto">
              <span className="text-lg font-mono font-bold text-gray-900 mx-auto whitespace-nowrap">
                {inviteLink}
              </span>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(inviteLink)}
            className="w-full py-3 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition-colors"
          >
            {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
            {copied ? 'Link Copiado!' : 'Copiar Link'}
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 bg-gold-deep hover:bg-gold-deep text-white rounded-xl font-semibold transition-colors"
          >
            Concluir
          </button>
        </div>
      )}
    </ModalShell>
  );
}
