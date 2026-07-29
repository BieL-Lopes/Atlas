import { useState } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, User as UserIcon, UserPlus } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LocationFields } from './LocationFields';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { signupLimiter } from '../lib/rateLimiter';

export interface ReferrerData {
  id: string;
  nome: string;
  regiao?: string;
  deputado_id?: string;
}

interface SignupFormProps {
  role: string;
  inviteKey?: string;
  referrer?: ReferrerData;
  onSignupComplete: (success: boolean, message?: string) => void;
  onCancel: () => void;
}

function formatWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validateWhatsApp(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 11;
}

export function SignupForm({
  role,
  inviteKey,
  referrer,
  onSignupComplete,
  onCancel
}: SignupFormProps) {
  const [step, setStep] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirma, setShowConfirma] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [estado, setEstado] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [bairro, setBairro] = useState('');

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setWhatsapp(formatWhatsApp(raw));
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
    if (!whatsapp.trim()) {
      setErrorMessage('WhatsApp é obrigatório');
      return;
    }
    if (!validateWhatsApp(whatsapp)) {
      setErrorMessage('WhatsApp inválido. Formato: (DDD) 99999-9999');
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
    if (!aceitouTermos) {
      setErrorMessage('Você precisa aceitar os termos para continuar.');
      return;
    }
    if (!dataNascimento) {
      setErrorMessage('Data de nascimento é obrigatória');
      return;
    }
    if (!sexo) {
      setErrorMessage('Sexo é obrigatório');
      return;
    }
    if (!estado) {
      setErrorMessage('Estado (UF) é obrigatório');
      return;
    }
    if (!municipio.trim()) {
      setErrorMessage('Município é obrigatório');
      return;
    }
    if (!bairro.trim()) {
      setErrorMessage('Bairro é obrigatório');
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
            whatsapp: whatsapp.replace(/\D/g, ''),
            nome,
            name: nome, // Trigger looks for 'name'
            role,
            regiao: referrer?.regiao,
            deputado_id: referrer?.deputado_id,
            indicado_por: referrer?.id,
            aceitou_termos: true,
            data_aceite_termos: new Date().toISOString(),
            data_nascimento: dataNascimento,
            sexo,
            estado,
            municipio,
            bairro
          }
        }
      });

      if (authError) {
        let msg = authError.message;
        if (msg.toLowerCase().includes('invalid') && msg.toLowerCase().includes('email')) {
          msg = 'O endereço de e-mail informado é inválido.';
        } else if (msg.toLowerCase().includes('already registered')) {
          msg = 'Este e-mail já está cadastrado em nossa base de dados.';
        } else if (msg.toLowerCase().includes('password')) {
          msg = 'A senha informada é muito fraca ou curta.';
        }
        throw new Error(msg);
      }

      if (!authData.user) {
        throw new Error('Não foi possível criar a conta. Servidor não retornou os dados.');
      }

      // Marca o convite como usado (apenas se existir inviteKey)
      if (inviteKey) {
        const { error: inviteError } = await supabase
          .from('invites')
          .update({
            usado: true,
            usado_por: authData.user.id,
            usado_em: new Date().toISOString()
          })
          .eq('chave_unica', inviteKey);

        if (inviteError) {
          console.error('Erro ao marcar convite como usado:', inviteError);
        }
      }



      signupLimiter.reset();
      setStep('success');
      setTimeout(() => {
        onSignupComplete(true, 'Conta criada com sucesso! Faça login com seu CPF e senha.');
      }, 2000);
    } catch (err: unknown) {
      console.error('Signup error:', err);
      const message = err instanceof Error ? err.message : 'Não foi possível criar a conta. Verifique os dados e tente novamente.';
      setErrorMessage(message);
      setStep('error');
    }
  };

  const roleDisplayNames: Record<string, string> = {
    administrador: 'Administrador',
    sub_coordenador: 'Sub-Coordenador',
    lideranca: 'Liderança',
    colaborador: 'Colaborador / Voluntário',
    cabo_eleitoral: 'Cabo Eleitoral / Captador de Voto'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 max-h-[95vh] overflow-y-auto">
        {step === 'form' && (
          <>
            {/* Banner de Indicação */}
            {referrer && (
              <div className="bg-white rounded-xl p-4 border border-gold-soft shadow-sm mb-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Junte-se à Nossa Rede</h3>
                  <p className="text-gray-600 text-xs">
                    <span className="font-semibold text-gold-deep">{referrer.nome}</span> convidou você a participar.
                  </p>
                </div>
              </div>
            )}

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
                Nome Completo *
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
              <Label htmlFor="whatsapp" className="text-sm font-medium">
                WhatsApp *
              </Label>
              <Input
                id="whatsapp"
                placeholder="(00) 00000-0000"
                value={whatsapp}
                onChange={handleWhatsappChange}
                disabled={step !== 'form'}
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail *
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dataNascimento" className="text-sm font-medium">
                  Nascimento *
                </Label>
                <Input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  disabled={step !== 'form'}
                />
              </div>

              <div>
                <Label htmlFor="sexo" className="text-sm font-medium">
                  Sexo *
                </Label>
                <select
                  id="sexo"
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value)}
                  disabled={step !== 'form'}
                  className="flex h-9 w-full min-w-0 rounded-md border border-input bg-input-background px-3 py-1 text-base transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  <option value="" disabled>Selecione...</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro / Prefiro não informar</option>
                </select>
              </div>
            </div>

            <LocationFields 
              uf={estado}
              setUf={setEstado}
              cidade={municipio}
              setCidade={setMunicipio}
              bairro={bairro}
              setBairro={setBairro}
              disabled={step !== 'form'}
              theme="auth"
            />

            <div>
              <Label htmlFor="senha" className="text-sm font-medium">
                Senha *
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
                Confirmar Senha *
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

            {/* LGPD Consent Checkbox */}
            <div className="flex items-start gap-3 pt-1">
              <input
                type="checkbox"
                id="aceitou-termos"
                checked={aceitouTermos}
                onChange={(e) => { setAceitouTermos(e.target.checked); setErrorMessage(''); }}
                disabled={step !== 'form'}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-gold-deep focus:ring-gold accent-amber-600 cursor-pointer flex-shrink-0"
              />
              <label htmlFor="aceitou-termos" className="text-xs text-gray-600 leading-relaxed cursor-pointer select-none">
                Li e concordo com os{' '}
                <a
                  href="/termos.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-deep font-semibold underline hover:text-gold transition-colors"
                >
                  Termos de Uso e Política de Privacidade
                </a>
                , e aceito receber comunicações da campanha via WhatsApp.
              </label>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            )}

            <div className="pt-4 flex flex-col gap-3">
              <Button type="submit" disabled={step !== 'form' || !aceitouTermos} className="w-full flex items-center justify-center gap-2">
                <UserPlus className="w-5 h-5" />
                Participar
              </Button>

              <a href="https://atlas-campaign-pulse.vercel.app/" className="w-full">
                <Button type="button" variant="outline" className="w-full">
                  Já sou cadastrado? Acessar
                </Button>
              </a>
            </div>

            <div className="text-center mt-6 text-sm text-gray-500">
              <p>
                Base Política. Desenvolvido por{' '}
                <a 
                  href="https://atlas-campaign-pulse.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Atlas
                </a>
              </p>
              <p className="mt-1 text-xs">
                Todos os direitos reservados @ Atlas {new Date().getFullYear()}
              </p>
            </div>
          </form>
          </>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 text-gold-deep animate-spin" />
            <p className="text-gray-600">Criando sua conta...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
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
