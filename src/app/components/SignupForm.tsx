import { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { signupLimiter } from '../lib/rateLimiter';

interface SignupFormProps {
  role: string;
  inviteKey: string;
  onSignupComplete: (success: boolean, message?: string) => void;
  onCancel: () => void;
}

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  
  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(digits.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(digits.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(10, 11))) return false;

  return true;
}

export function SignupForm({
  role,
  inviteKey,
  onSignupComplete,
  onCancel
}: SignupFormProps) {
  const [step, setStep] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirma, setShowConfirma] = useState(false);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setCpf(formatCPF(raw));
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validações
    if (!nome.trim()) {
      setErrorMessage('Nome é obrigatório');
      return;
    }
    if (!cpf.trim()) {
      setErrorMessage('CPF é obrigatório');
      return;
    }
    if (!validateCPF(cpf)) {
      setErrorMessage('CPF inválido');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('E-mail é obrigatório');
      return;
    }
    if (!email.includes('@')) {
      setErrorMessage('E-mail inválido');
      return;
    }
    if (!senha || senha.length < 6) {
      setErrorMessage('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (senha !== confirmaSenha) {
      setErrorMessage('Senhas não conferem');
      return;
    }

    // Rate limit check
    if (!signupLimiter.canAttempt()) {
      const retry = signupLimiter.getRetryAfterSeconds();
      setErrorMessage(`Muitas tentativas. Aguarde ${retry} segundos.`);
      return;
    }
    signupLimiter.recordAttempt();

    setStep('loading');

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase não configurado');
      }

      // Cria user no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            cpf: cpf.replace(/\D/g, ''),
            nome,
            name: nome, // Trigger looks for 'name'
            role
          }
        }
      });

      // Mensagem genérica para TODOS os erros de signup (previne enumeração de usuário)
      if (authError || !authData.user) {
        throw new Error('Não foi possível criar a conta. Verifique os dados e tente novamente.');
      }

      // Marca o convite como usado
      const { error: inviteError } = await supabase
        .from('invites')
        .update({
          usado: true,
          usado_por: authData.user.id,
          usado_em: new Date().toISOString()
        })
        .eq('chave_unica', inviteKey);

      if (inviteError) {
        console.warn('Aviso ao marcar convite como usado:', inviteError);
      }

      signupLimiter.reset();
      setStep('success');
      setTimeout(() => {
        onSignupComplete(true, 'Conta criada com sucesso! Faça login com seu CPF e senha.');
      }, 2000);
    } catch (err: unknown) {
      console.error('Signup error:', err);
      // Mensagem genérica — nunca revelar detalhes específicos do Supabase Auth
      const message = err instanceof Error ? err.message : 'Não foi possível criar a conta. Verifique os dados e tente novamente.';
      setErrorMessage(message);
      setStep('error');
    }
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
      <Card className="w-full max-w-md p-6">
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Criar Conta
              </h2>
              <p className="text-gray-600 text-sm">
                Perfil: <strong>{roleDisplayNames[role]}</strong>
              </p>
            </div>

            <div>
              <Label htmlFor="nome" className="text-sm font-medium">
                Nome Completo
              </Label>
              <Input
                id="nome"
                placeholder="João Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={step !== 'form'}
              />
            </div>

            <div>
              <Label htmlFor="cpf" className="text-sm font-medium">
                CPF
              </Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfChange}
                disabled={step !== 'form'}
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={step !== 'form'}
              />
            </div>

            <div>
              <Label htmlFor="senha" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showSenha ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={step !== 'form'}
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  disabled={step !== 'form'}
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirma" className="text-sm font-medium">
                Confirmar Senha
              </Label>
              <div className="relative">
                <Input
                  id="confirma"
                  type={showConfirma ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  value={confirmaSenha}
                  onChange={(e) => setConfirmaSenha(e.target.value)}
                  disabled={step !== 'form'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirma(!showConfirma)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  disabled={step !== 'form'}
                >
                  {showConfirma ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={step !== 'form'}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={step !== 'form'} className="flex-1">
                Criar Conta
              </Button>
            </div>
          </form>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-gray-600">Criando sua conta...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Sucesso!</h3>
            <p className="text-sm text-gray-600">
              Sua conta foi criada com sucesso. Redirecionando...
            </p>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Erro ao Criar Conta</h3>
            <p className="text-sm text-gray-600">{errorMessage}</p>
            <Button onClick={() => setStep('form')} className="w-full">
              Tentar Novamente
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
