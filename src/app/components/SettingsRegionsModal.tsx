import { useState } from 'react';
import { X, Save, MapPin, Plus, Trash2 } from 'lucide-react';
import { SystemSettings, saveSystemSettings } from '../lib/settings';

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gold/10 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-gold-deep" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Regiões da Cidade</h2>
              <p className="text-xs text-gray-400">Gerenciar bairros e regiões</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
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
              <p className="text-center text-sm text-gray-400 py-4">Nenhuma região cadastrada.</p>
            ) : (
              regions.map((region, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-2 px-3 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-800">{region}</span>
                  <button onClick={() => handleRemove(region)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
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
