import { CheckCircle, ArrowRight, FileEdit, Share2, Network } from 'lucide-react';
import { Button } from './ui/button';

interface ConfirmRegistrationScreenProps {
  onContinue: () => void;
  referrerName?: string;
  candidateName?: string;
}

export function ConfirmRegistrationScreen({ 
  onContinue, 
  referrerName = '',
  candidateName = 'NOME DO CANDIDATO' 
}: ConfirmRegistrationScreenProps) {
  const campaignPhone = import.meta.env.VITE_CAMPAIGN_PHONE || '';

  const handleWhatsAppClick = () => {
    if (campaignPhone) {
      window.open(`https://wa.me/55${campaignPhone}?text=CONFIRMAR`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg-main p-4 text-text-primary">
      <div className="min-h-screen flex items-center justify-center py-8">
        <div className="w-full max-w-lg bg-bg-card rounded-3xl shadow-2xl border border-border-gold p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8 text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
              Bem-vindo à rede!
            </h1>
            <p className="text-text-muted text-sm sm:text-base leading-relaxed mb-6">
              Você já está dentro do sistema. Siga os passos abaixo: confirme seu cadastro pelo WhatsApp da campanha, revise seus dados, convide novas pessoas, acompanhe sua rede e, por fim, entre no painel.
            </p>
            
            <div className="bg-surface-input rounded-xl p-4 border border-border-gold">
              <h2 className="text-lg font-bold text-gold-deep uppercase tracking-wide">
                {candidateName}
              </h2>
              {referrerName && (
                <p className="text-sm text-text-muted mt-1">
                  Indicado por: <span className="font-semibold text-text-primary">{referrerName}</span>
                </p>
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-8">
            {/* Card 1 */}
            <div className="bg-surface-input rounded-2xl p-5 border border-gold-soft shadow-sm relative overflow-hidden text-left">
              <div className="absolute top-0 left-0 w-1 h-full bg-gold"></div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-gold-deep font-bold text-sm">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-text-primary text-lg mb-1">Confirmar seu cadastro</h3>
                  <p className="text-sm text-text-muted mb-3">
                    Para ativar sua conta, envie uma mensagem para o nosso sistema via WhatsApp.
                  </p>
                  <div className="inline-block bg-bg-main border border-border-gold rounded-full px-3 py-1 mb-4">
                    <span className="text-xs text-text-muted font-medium">Mensagem a enviar: </span>
                    <span className="text-xs font-bold text-text-primary">CONFIRMAR</span>
                  </div>
                  <Button 
                    onClick={handleWhatsAppClick}
                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 font-bold"
                  >
                    Confirmar cadastro no WhatsApp
                  </Button>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-surface-input/50 rounded-2xl p-5 border border-border-gold shadow-sm text-left opacity-90 hover:opacity-100 transition-opacity">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-bg-main border border-border-gold flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-text-muted font-bold text-sm">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-text-primary text-lg mb-1">Atualizar seu cadastro</h3>
                  <p className="text-sm text-text-muted mb-3">
                    Complete ou corrija seus dados para manter a rede sempre correta.
                  </p>
                  <Button variant="outline" className="w-full justify-center gap-2 border-border-gold text-text-primary hover:bg-bg-main" onClick={onContinue}>
                    <FileEdit className="w-4 h-4" /> Editar meus dados
                  </Button>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-surface-input/50 rounded-2xl p-5 border border-border-gold shadow-sm text-left opacity-90 hover:opacity-100 transition-opacity">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-bg-main border border-border-gold flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-text-muted font-bold text-sm">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-text-primary text-lg mb-1">Convidar mais pessoas</h3>
                  <p className="text-sm text-text-muted mb-3">
                    Compartilhe seu link e materiais da campanha com novos apoiadores.
                  </p>
                  <Button variant="ghost" className="w-full justify-center gap-2 bg-bg-main text-text-primary hover:bg-surface-input border border-transparent" onClick={onContinue}>
                    <Share2 className="w-4 h-4" /> Convidar
                  </Button>
                </div>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-surface-input/50 rounded-2xl p-5 border border-border-gold shadow-sm text-left opacity-90 hover:opacity-100 transition-opacity">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-bg-main border border-border-gold flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-text-muted font-bold text-sm">4</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-text-primary text-lg mb-1">Acompanhar pela rede</h3>
                  <p className="text-sm text-text-muted mb-3">
                    Visualize a árvore de relacionamento e métricas da sua campanha.
                  </p>
                  <Button variant="ghost" className="w-full justify-center gap-2 bg-bg-main text-text-primary hover:bg-surface-input border border-transparent" onClick={onContinue}>
                    <Network className="w-4 h-4" /> Acessar a rede
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onContinue}
              className="w-full flex items-center justify-center gap-2 py-4 text-gold-deep hover:text-gold-soft font-semibold transition-colors"
            >
              Já confirmei / Acessar Painel <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
