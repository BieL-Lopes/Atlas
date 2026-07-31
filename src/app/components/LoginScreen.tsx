import { useState, useEffect, useCallback } from 'react';
import { User as UserIcon, Lock, Eye, EyeOff, AtSign, CreditCard } from 'lucide-react';
import { User, authenticate } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { InviteModal } from './InviteModal';
import { SignupForm, ReferrerData } from './SignupForm';
import { ConfirmRegistrationScreen } from './ConfirmRegistrationScreen';
import { loginLimiter } from '../lib/rateLimiter';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

type InputType = 'cpf' | 'email' | 'unknown';

function detectInputType(value: string): InputType {
  if (value === '') return 'unknown';
  if (/^\d/.test(value)) return 'cpf';
  if (value.includes('@')) return 'email';
  if (/^[a-zA-Z]/.test(value)) return 'email';
  return 'unknown';
}

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function validateCPF(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 11) return 'CPF incompleto';
  return null;
}

function validateEmail(value: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) return 'E-mail inválido';
  return null;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [signupData, setSignupData] = useState<{ role: string; inviteKey?: string } | null>(null);
  const [referrer, setReferrer] = useState<ReferrerData | null>(null);
  const [showConfirmRegistration, setShowConfirmRegistration] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Lê o formato /convite/ID ou parâmetro ?ref= da URL para MMN
  useEffect(() => {
    const checkReferral = async () => {
      const pathname = window.location.pathname;
      const match = pathname.match(/^\/convite\/(.+)$/);
      
      let refId = null;
      if (match) {
        refId = match[1];
      } else {
        const params = new URLSearchParams(window.location.search);
        refId = params.get('ref');
      }

      if (refId) {
        // Altera imediatamente o estado para forçar a renderização do formulário de cadastro
        setSignupData({ role: 'cabo_eleitoral' });

        if (isSupabaseConfigured && supabase) {
          try {
            const { data } = await supabase
              .rpc('get_referrer_info', { p_id: refId })
              .single();
          
          if (data) {
            const refData: ReferrerData = {
              id: data.id,
              nome: data.nome,
              regiao: data.regiao,
              deputado_id: data.deputado_id
            };
            setReferrer(refData);
          }
        } catch (err) {
          console.error('Ref inválido ou não encontrado', err);
        }
      }
    }
  };
  checkReferral();
}, []);

  // Countdown timer para cooldown do rate limiter
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const checkRateLimit = useCallback((): boolean => {
    if (!loginLimiter.canAttempt()) {
      const retry = loginLimiter.getRetryAfterSeconds();
      setCooldown(retry);
      setError(`Muitas tentativas. Aguarde ${retry}s.`);
      return false;
    }
    return true;
  }, []);

  const inputType = detectInputType(login);

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setFieldError('');
    if (detectInputType(raw) === 'cpf') {
      setLogin(formatCPF(raw));
    } else {
      setLogin(raw);
    }
  };

  const handleLoginBlur = () => {
    if (!login) return;
    if (inputType === 'cpf') {
      const err = validateCPF(login);
      if (err) setFieldError(err);
    } else if (inputType === 'email') {
      const err = validateEmail(login);
      if (err) setFieldError(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldError('');

    if (!login || !password) {
      setError('Preencha todos os campos');
      return;
    }

    if (inputType === 'cpf') {
      const err = validateCPF(login);
      if (err) { setFieldError(err); return; }
    } else if (inputType === 'email') {
      const err = validateEmail(login);
      if (err) { setFieldError(err); return; }
    }

    // Rate limit check
    if (!checkRateLimit()) return;
    loginLimiter.recordAttempt();

    setLoading(true);
    try {
      const user = await authenticate(login, password);
      if (!user) {
        setError('Credenciais inválidas. Verifique e tente novamente.');
        return;
      }
      loginLimiter.reset();
      onLogin(user);
    } catch {
      setError('Erro ao conectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4 text-text-primary">
      {!signupData && !showConfirmRegistration && (
        <div className="w-full max-w-md">
          <div className="bg-bg-card rounded-3xl shadow-2xl border border-border-gold p-8">
          {/* Logo/Título */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-gold rounded-full mx-auto mb-4 flex items-center justify-center shadow-gold">
              <UserIcon className="w-10 h-10 text-text-on-gold" />
            </div>
            <h1 className="text-3xl font-bold text-gradient-gold mb-2">ATLAS</h1>
            <p className="text-text-muted">Sistema de Captação de Eleitores</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo CPF/Email */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">
                CPF ou E-mail
              </label>
              <div className="relative">
                {inputType === 'email' ? (
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold" />
                ) : inputType === 'cpf' ? (
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold" />
                ) : (
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                )}
                <input
                  type="text"
                  value={login}
                  onChange={handleLoginChange}
                  onBlur={handleLoginBlur}
                  className={`w-full pl-12 pr-24 py-4 text-lg border bg-surface-input text-text-primary rounded-xl focus:outline-none transition-all ${
                    fieldError
                      ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive'
                      : 'border-border-gold focus:border-gold focus:ring-1 focus:ring-gold focus:shadow-gold'
                  }`}
                  placeholder="CPF ou e-mail"
                  autoComplete="username"
                  inputMode={inputType === 'cpf' ? 'numeric' : 'email'}
                  maxLength={inputType === 'cpf' ? 14 : undefined}
                />
                {inputType !== 'unknown' && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-1 rounded-lg ${
                    inputType === 'cpf'
                      ? 'bg-gold/10 text-gold-soft'
                      : 'bg-gold/10 text-gold-soft'
                  }`}>
                    {inputType === 'cpf' ? 'CPF' : 'E-mail'}
                  </span>
                )}
              </div>
              {fieldError && (
                <p className="mt-1 text-xs text-destructive pl-1">{fieldError}</p>
              )}
            </div>

            {/* Campo Senha */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 text-lg border bg-surface-input text-text-primary border-border-gold rounded-xl focus:border-gold focus:ring-1 focus:ring-gold focus:shadow-gold focus:outline-none transition-all"
                  placeholder="Senha"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive rounded-xl p-3 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full bg-gradient-gold hover:shadow-gold-lg disabled:opacity-60 text-text-on-gold py-4 rounded-xl text-lg font-bold shadow-lg transition-all active:scale-95"
            >
              {loading ? 'Entrando...' : cooldown > 0 ? `Aguarde ${cooldown}s` : 'Entrar'}
            </button>

            {/* Link Esqueci Senha + Primeiro Acesso */}
            <div className="flex flex-col gap-2 text-center text-sm">
              <button
                type="button"
                className="text-text-muted hover:text-gold font-medium transition-colors"
                onClick={() => alert('Em produção, enviaria e-mail de recuperação')}
              >
                Esqueci minha senha
              </button>
              <button
                type="button"
                className="text-gold-soft hover:text-gold font-medium transition-colors"
                onClick={() => setShowInviteModal(true)}
              >
                Primeiro Acesso? Usar Chave de Convite
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* Modal de Convite */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onInviteValidated={(role, inviteKey) => {
            setSignupData({ role, inviteKey });
            setShowInviteModal(false);
          }}
        />
      )}

      {/* Modal de Signup */}
      {signupData && !showConfirmRegistration && (
        <SignupForm
          role={signupData.role}
          inviteKey={signupData.inviteKey}
          referrer={referrer || undefined}
          onSignupComplete={(success, message) => {
            if (success) {
              setError(message || '');
              setShowConfirmRegistration(true);
            }
          }}
          onCancel={() => {
            setSignupData(null);
            setReferrer(null);
          }}
        />
      )}

      {/* Tela de Confirmação Pós-Cadastro */}
      {showConfirmRegistration && (
        <ConfirmRegistrationScreen 
          referrerName={referrer?.nome}
          onContinue={() => {
            setShowConfirmRegistration(false);
            setSignupData(null);
            setReferrer(null);
            setLogin('');
            setPassword('');
          }} 
        />
      )}
    </div>
  );
}
