import React, { useState, useEffect } from 'react';

interface LocationFieldsProps {
  uf: string;
  setUf: (val: string) => void;
  cidade: string;
  setCidade: (val: string) => void;
  bairro: string;
  setBairro: (val: string) => void;
  disabled?: boolean;
  theme?: 'auth' | 'app';
}

export function LocationFields({
  uf,
  setUf,
  cidade,
  setCidade,
  bairro,
  setBairro,
  disabled = false,
  theme = 'app'
}: LocationFieldsProps) {
  const [estados, setEstados] = useState<{ id: number; sigla: string; nome: string }[]>([]);
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);

  // Define styling based on theme
  const labelClass = theme === 'auth' 
    ? "text-sm font-medium" 
    : "block text-sm font-medium text-gray-700 mb-2";
    
  const inputClass = theme === 'auth'
    ? "flex h-9 w-full min-w-0 rounded-md border border-input bg-input-background px-3 py-1 text-base transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
    : "w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500";

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados')
      .then(res => res.json())
      .then(data => {
        const sortedEstados = data.sort((a: any, b: any) => a.sigla.localeCompare(b.sigla));
        setEstados(sortedEstados);
      })
      .catch(err => console.error('Erro ao buscar estados:', err));
  }, []);

  useEffect(() => {
    if (!uf) {
      setMunicipios([]);
      return;
    }
    if (uf === 'DF') {
      setMunicipios([{ id: 5300108, nome: 'Brasília' }]);
      setCidade('Brasília');
      return;
    }
    
    setLoadingMunicipios(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
      .then(res => res.json())
      .then(data => {
        setMunicipios(data);
        if (!data.find((m: any) => m.nome === cidade)) {
          setCidade('');
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingMunicipios(false));
  }, [uf]);

  return (
    <div className={theme === 'auth' ? 'space-y-4' : 'space-y-4'}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Estado (UF) *</label>
          <select
            value={uf}
            onChange={(e) => {
              setUf(e.target.value);
              setCidade('');
              if (e.target.value === 'DF') setBairro('');
            }}
            className={inputClass}
            required
            disabled={disabled}
          >
            <option value="" disabled>Selecione...</option>
            {estados.map(estado => (
              <option key={estado.id} value={estado.sigla}>{estado.sigla} - {estado.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Município *</label>
          <select
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className={inputClass}
            required
            disabled={disabled || !uf || uf === 'DF' || loadingMunicipios}
          >
            <option value="" disabled>{loadingMunicipios ? 'Carregando...' : 'Selecione...'}</option>
            {municipios.map(m => (
              <option key={m.id} value={m.nome}>{m.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Bairro *</label>
        <input
          type="text"
          value={bairro}
          onChange={(e) => setBairro(e.target.value)}
          className={inputClass}
          placeholder="Seu bairro"
          required
          disabled={disabled}
        />
      </div>
    </div>
  );
}
