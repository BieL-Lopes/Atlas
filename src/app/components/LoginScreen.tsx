import { useState, useEffect, useCallback } from 'react';
import { User as UserIcon, Lock, Eye, EyeOff, AtSign, CreditCard } from 'lucide-react';
import { User, authenticate } from '../lib/auth';
import { InviteModal } from './InviteModal';
import { SignupForm } from './SignupForm';
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
  const [signupData, setSignupData] = useState<{ role: string; inviteKey: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Logo/Título */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <UserIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">ATLAS</h1>
            <p className="text-gray-600">Sistema de Captação de Eleitores</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo CPF/Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CPF ou E-mail
              </label>
              <div className="relative">
                {inputType === 'email' ? (
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                ) : inputType === 'cpf' ? (
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                ) : (
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                )}
                <input
                  type="text"
                  value={login}
                  onChange={handleLoginChange}
                  onBlur={handleLoginBlur}
                  className={`w-full pl-12 pr-24 py-4 text-lg border-2 rounded-xl focus:outline-none transition-colors ${
                    fieldError
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-300 focus:border-blue-600'
                  }`}
                  placeholder="CPF ou e-mail"
                  autoComplete="username"
                  inputMode={inputType === 'cpf' ? 'numeric' : 'email'}
                  maxLength={inputType === 'cpf' ? 14 : undefined}
                />
                {inputType !== 'unknown' && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-1 rounded-lg ${
                    inputType === 'cpf'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {inputType === 'cpf' ? 'CPF' : 'E-mail'}
                  </span>
                )}
              </div>
              {fieldError && (
                <p className="mt-1 text-xs text-red-600 pl-1">{fieldError}</p>
              )}
            </div>

            {/* Campo Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none transition-colors"
                  placeholder="Senha"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all active:scale-98"
            >
              {loading ? 'Entrando...' : cooldown > 0 ? `Aguarde ${cooldown}s` : 'Entrar'}
            </button>

            {/* Link Esqueci Senha + Primeiro Acesso */}
            <div className="flex flex-col gap-2 text-center text-sm">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700 font-medium"
                onClick={() => alert('Em produção, enviaria e-mail de recuperação')}
              >
                Esqueci minha senha
              </button>
              <button
                type="button"
                className="text-purple-600 hover:text-purple-700 font-medium"
                onClick={() => setShowInviteModal(true)}
              >
                Primeiro Acesso? Usar Chave de Convite
              </button>
            </div>
          </form>
        </div>
      </div>

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
      {signupData && (
        <SignupForm
          role={signupData.role}
          inviteKey={signupData.inviteKey}
          onSignupComplete={(success, message) => {
            if (success) {
              setError(message || '');
              setSignupData(null);
              setLogin('');
              setPassword('');
            }
          }}
          onCancel={() => setSignupData(null)}
        />
      )}
    </div>
  );
}
