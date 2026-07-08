import { useState } from 'react';
import { X, Save, Globe } from 'lucide-react';
import { SystemSettings, saveSystemSettings } from '../lib/settings';

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gold/10 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-gold-deep" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Integrações (APIs)</h2>
              <p className="text-xs text-gray-400">WhatsApp Evolution API</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
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
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-gold-deep hover:bg-gold-deep text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
            <Save className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
