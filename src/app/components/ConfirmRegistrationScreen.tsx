import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

interface ConfirmRegistrationScreenProps {
  onContinue: () => void;
}

export function ConfirmRegistrationScreen({ onContinue }: ConfirmRegistrationScreenProps) {
  const campaignPhone = import.meta.env.VITE_CAMPAIGN_PHONE || '';

  const handleWhatsAppClick = () => {
    if (campaignPhone) {
      window.open(`https://wa.me/55${campaignPhone}?text=CONFIRMAR`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-main p-4 text-text-primary">
      <div className="w-full max-w-md bg-bg-card rounded-3xl shadow-2xl border border-border-gold p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Bem-vindo à rede!</h1>
        
        <p className="text-gray-600 text-sm mb-8">
          Você já está dentro do sistema. Siga os passos abaixo: confirme seu cadastro pelo WhatsApp da campanha, revise seus dados e convide novas pessoas.
        </p>

        <div className="space-y-4">
          <Button 
            onClick={handleWhatsAppClick}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-lg font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Confirmar cadastro no WhatsApp
          </Button>

          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 py-4 text-gold-deep hover:text-gold-soft font-semibold transition-colors"
          >
            Já confirmei / Acessar Plataforma <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
