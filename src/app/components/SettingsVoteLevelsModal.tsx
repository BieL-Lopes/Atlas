import { useState } from 'react';
import { Save, BarChart } from 'lucide-react';
import { SystemSettings, saveSystemSettings } from '../lib/settings';
import { ModalShell } from './ModalShell';

interface Props {
  settings: SystemSettings;
  onClose: () => void;
  onSave: (newSettings: SystemSettings) => void;
}

export function SettingsVoteLevelsModal({ settings, onClose, onSave }: Props) {
  const [levels, setLevels] = useState(settings.voteLevels);

  const handleChange = (key: keyof typeof settings.voteLevels, value: string) => {
    setLevels(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const updatedSettings = { ...settings, voteLevels: levels };
    saveSystemSettings(updatedSettings);
    onSave(updatedSettings);
    onClose();
  };

  return (
    <ModalShell
      title="Níveis de Voto"
      subtitle="Rótulos do termômetro de votos"
      icon={BarChart}
      onClose={onClose}
      footerActions={[
        { label: 'Cancelar', onClick: onClose, variant: 'secondary' },
        { label: 'Salvar', onClick: handleSave, icon: Save, variant: 'primary' },
      ]}
    >
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Forte</label>
        <input
          type="text"
          value={levels.forte}
          onChange={e => handleChange('forte', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Médio</label>
        <input
          type="text"
          value={levels.medio}
          onChange={e => handleChange('medio', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fraco</label>
        <input
          type="text"
          value={levels.fraco}
          onChange={e => handleChange('fraco', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Indeciso</label>
        <input
          type="text"
          value={levels.indeciso}
          onChange={e => handleChange('indeciso', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Oposição</label>
        <input
          type="text"
          value={levels.oposicao}
          onChange={e => handleChange('oposicao', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
    </ModalShell>
  );
}
