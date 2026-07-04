import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { inviteLimiter } from '../lib/rateLimiter';

interface InviteModalProps {
  onClose: () => void;
  onInviteValidated: (role: string, inviteKey: string) => void;
}

export function InviteModal({ onClose, onInviteValidated }: InviteModalProps) {
  const [step, setStep] = useState<'input' | 'validated'>('input');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validatedRole, setValidatedRole] = useState('');
  const [validatedKey, setValidatedKey] = useState('');

  const handleValidateCode = async () => {
    setError('');
    if (!code || code.length !== 6) {
      setError('Código deve ter 6 caracteres');
      return;
    }

    // Rate limit check
    if (!inviteLimiter.canAttempt()) {
      const retry = inviteLimiter.getRetryAfterSeconds();
      setError(`Muitas tentativas. Aguarde ${retry} segundos.`);
      return;
    }
    inviteLimiter.recordAttempt();

    setLoading(true);
    try {
      if (!isSupabaseConfigured || !supabase) {
        setError('Supabase não configurado');
        setLoading(false);
        return;
      }

      // Busca a chave no banco
      const { data, error: fetchError } = await supabase
        .from('invites')
        .select('id, role, usado')
        .eq('chave_unica', code.toUpperCase())
        .eq('usado', false)
        .single();

      if (fetchError || !data) {
        setError('Código inválido ou já utilizado');
        setLoading(false);
        return;
      }

      // Validação bem-sucedida
      setValidatedRole(data.role);
      setValidatedKey(code.toUpperCase());
      setStep('validated');
    } catch (err) {
      console.error('Erro ao validar convite:', err);
      setError('Erro ao validar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    onInviteValidated(validatedRole, validatedKey);
    onClose();
  };

  const roleDisplayNames: Record<string, string> = {
    lideranca: 'Liderança',
    coordenador_geral: 'Coordenador Geral',
    coordenador_regional: 'Coordenador Regional',
    captador_votos: 'Captador',
    eleitor: 'Eleitor'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 relative">
        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-200 rounded"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'input' ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Primeiro Acesso
              </h2>
              <p className="text-gray-600 text-sm">
                Digite o código de convite que você recebeu para ativar sua conta.
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="invite-code" className="text-sm font-medium">
                Código de Convite
              </Label>
              <Input
                id="invite-code"
                placeholder="XXXXXX"
                value={code.toUpperCase()}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase().slice(0, 6));
                  setError('');
                }}
                maxLength={6}
                disabled={loading}
                className="text-center text-lg font-mono tracking-widest"
              />
              <p className="text-xs text-gray-500">6 caracteres</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              onClick={handleValidateCode}
              disabled={code.length !== 6 || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                'Validar Código'
              )}
            </Button>

            <div className="text-center pt-4 border-t">
              <p className="text-xs text-gray-600">
                Já tem uma conta?{' '}
                <button
                  onClick={onClose}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Voltar ao Login
                </button>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Código Validado!
              </h2>
              <p className="text-gray-600 text-sm">
                Seu perfil de acesso foi confirmado como{' '}
                <strong>{roleDisplayNames[validatedRole]}</strong>
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded space-y-2">
              <p className="text-xs font-medium text-blue-900">Próximo passo:</p>
              <p className="text-sm text-blue-800">
                Você será redirecionado para criar sua senha com seu CPF e e-mail.
              </p>
            </div>

            <Button onClick={handleProceed} className="w-full">
              Continuar para Cadastro
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
