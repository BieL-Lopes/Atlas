import { useState } from 'react';
import { Save, MapPin, Plus, Trash2 } from 'lucide-react';
import { SystemSettings, saveSystemSettings } from '../lib/settings';
import { ModalShell } from './ModalShell';

interface Props {
  settings: SystemSettings;
  onClose: () => void;
  onSave: (newSettings: SystemSettings) => void;
}

export function SettingsRegionsModal({ settings, onClose, onSave }: Props) {
  const [regions, setRegions] = useState<string[]>(settings.regions);
  const [newRegion, setNewRegion] = useState('');

  const handleAdd = () => {
    if (newRegion.trim() && !regions.includes(newRegion.trim())) {
      setRegions([...regions, newRegion.trim()]);
      setNewRegion('');
    }
  };

  const handleRemove = (regionToRemove: string) => {
    setRegions(regions.filter(r => r !== regionToRemove));
  };

  const handleSave = () => {
    const updatedSettings = { ...settings, regions };
    saveSystemSettings(updatedSettings);
    onSave(updatedSettings);
    onClose();
  };

  return (
    <ModalShell
      title="Regiões da Cidade"
      subtitle="Gerenciar bairros e regiões"
      icon={MapPin}
      onClose={onClose}
      footerActions={[
        { label: 'Cancelar', onClick: onClose, variant: 'secondary' },
        { label: 'Salvar', onClick: handleSave, icon: Save, variant: 'primary' },
      ]}
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={newRegion}
          onChange={e => setNewRegion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Nova região..."
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-deep"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-gold/10 text-gold-deep rounded-xl font-semibold hover:bg-gold/10 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-100 rounded-xl p-2 bg-gray-50">
        {regions.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-4">Nenhuma região cadastrada.</p>
        ) : (
          regions.map((region, idx) => (
            <div key={idx} className="flex justify-between items-center bg-white p-2 px-3 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-800">{region}</span>
              <button onClick={() => handleRemove(region)} className="text-gray-500 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </ModalShell>
  );
}
