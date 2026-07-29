export interface SystemSettings {
  campaign: {
    name: string;
    logoUrl: string;
    generalInfo: string;
  };
  voteLevels: {
    forte: string;
    medio: string;
    fraco: string;
    indeciso: string;
    oposicao: string;
  };
  regions: string[];
  integrations: {
    evolutionApiUrl: string;
    evolutionApiKey: string;
    evolutionInstance: string;
  };
}

const DEFAULT_SETTINGS: SystemSettings = {
  campaign: {
    name: 'Minha Campanha',
    logoUrl: '',
    generalInfo: ''
  },
  voteLevels: {
    forte: 'Forte / Garantido',
    medio: 'Médio / Simpatizante',
    fraco: 'Fraco / Em Dúvida',
    indeciso: 'Indeciso / Não Sabe',
    oposicao: 'Oposição'
  },
  regions: [
    'Centro', 'Zona Norte', 'Zona Sul', 'Zona Leste', 'Zona Oeste'
  ],
  integrations: {
    evolutionApiUrl: '',
    evolutionApiKey: '',
    evolutionInstance: ''
  }
};

const SETTINGS_KEY = 'atlas_settings';

export function getSystemSettings(): SystemSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data);
    return { ...DEFAULT_SETTINGS, ...parsed }; // Merge to ensure all keys exist
  } catch (err) {
    console.error('Failed to parse settings', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSystemSettings(settings: SystemSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
