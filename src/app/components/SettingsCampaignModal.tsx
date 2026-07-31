import { useState } from 'react';
import { Save, Settings } from 'lucide-react';
import { SystemSettings, saveSystemSettings } from '../lib/settings';
import { ModalShell } from './ModalShell';

interface Props {
  settings: SystemSettings;
  onClose: () => void;
  onSave: (newSettings: SystemSettings) => void;
}

export function SettingsCampaignModal({ settings, onClose, onSave }: Props) {
  const [name, setName] = useState(settings.campaign.name);
  const [logoUrl, setLogoUrl] = useState(settings.campaign.logoUrl);
  const [generalInfo, setGeneralInfo] = useState(settings.campaign.generalInfo);

  const handleSave = () => {
    const updatedSettings = {
      ...settings,
      campaign: {
        name,
        logoUrl,
        generalInfo
      }
    };
    saveSystemSettings(updatedSettings);
    onSave(updatedSettings);
    onClose();
  };

  return (
    <ModalShell
      title="Dados da Campanha"
      subtitle="Nome e logo principal"
      icon={Settings}
      onClose={onClose}
      footerActions={[
        { label: 'Cancelar', onClick: onClose, variant: 'secondary' },
        { label: 'Salvar', onClick: handleSave, icon: Save, variant: 'primary' },
      ]}
    >
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Nome da Campanha
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: João para Prefeito 2024"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gold-deep"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          URL do Logo
        </label>
        <input
          type="text"
          value={logoUrl}
          onChange={e => setLogoUrl(e.target.value)}
          placeholder="https://exemplo.com/logo.png"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gold-deep"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Informações Gerais
        </label>
        <textarea
          value={generalInfo}
          onChange={e => setGeneralInfo(e.target.value)}
          placeholder="Informações adicionais da campanha..."
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gold-deep resize-none"
        />
      </div>
    </ModalShell>
  );
}
