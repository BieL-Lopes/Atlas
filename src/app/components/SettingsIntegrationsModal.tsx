import { useState } from 'react';
import { Save, Globe } from 'lucide-react';
import { SystemSettings, saveSystemSettings } from '../lib/settings';
import { ModalShell } from './ModalShell';

interface Props {
  settings: SystemSettings;
  onClose: () => void;
  onSave: (newSettings: SystemSettings) => void;
}

export function SettingsIntegrationsModal({ settings, onClose, onSave }: Props) {
  const [evolutionApiUrl, setEvolutionApiUrl] = useState(settings.integrations.evolutionApiUrl);
  const [evolutionApiKey, setEvolutionApiKey] = useState(settings.integrations.evolutionApiKey);
  const [evolutionInstance, setEvolutionInstance] = useState(settings.integrations.evolutionInstance);

  const handleSave = () => {
    const updatedSettings = {
      ...settings,
      integrations: { evolutionApiUrl, evolutionApiKey, evolutionInstance }
    };
    saveSystemSettings(updatedSettings);
    onSave(updatedSettings);
    onClose();
  };

  return (
    <ModalShell
      title="Integrações (APIs)"
      subtitle="WhatsApp Evolution API"
      icon={Globe}
      onClose={onClose}
      footerActions={[
        { label: 'Cancelar', onClick: onClose, variant: 'secondary' },
        { label: 'Salvar', onClick: handleSave, icon: Save, variant: 'primary' },
      ]}
    >
      <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-800 mb-2">
        Essas configurações substituem as variáveis de ambiente locais caso preenchidas.
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Evolution API URL</label>
        <input
          type="text"
          value={evolutionApiUrl}
          onChange={e => setEvolutionApiUrl(e.target.value)}
          placeholder="https://api.evolution.com"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-deep"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Evolution API Key</label>
        <input
          type="password"
          value={evolutionApiKey}
          onChange={e => setEvolutionApiKey(e.target.value)}
          placeholder="Sua chave de API"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-deep"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Instância do WhatsApp</label>
        <input
          type="text"
          value={evolutionInstance}
          onChange={e => setEvolutionInstance(e.target.value)}
          placeholder="Nome da Instância"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-deep"
        />
      </div>
    </ModalShell>
  );
}
