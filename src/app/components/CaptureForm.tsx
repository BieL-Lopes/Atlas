import { useState, useEffect } from 'react';
import { ArrowLeft, Save, User, Phone, Calendar, MapPin, MessageSquare, Navigation, Tag, Award, Upload } from 'lucide-react';
import { getSystemSettings } from '../lib/settings';
import { db } from '../lib/db';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Atendimento {
  id: string;
  data: string;
  descricao: string;
  tipo: 'demanda' | 'visita' | 'reuniao' | 'ligacao';
}

// Status no funil de relacionamento CRM
export type StatusFunil = 'contato' | 'interessado' | 'simpatizante' | 'apoiador' | 'multiplicador';

export const STATUS_FUNIL_CONFIG: Record<StatusFunil, { label: string; icon: string; color: string; bgColor: string; borderColor: string; bgSelected: string }> = {
  contato:       { label: 'Contato',       icon: '📋', color: 'text-gray-700',   bgColor: 'bg-gray-50',    borderColor: 'border-gray-200',  bgSelected: 'bg-gray-600' },
  interessado:   { label: 'Interessado',   icon: '👀', color: 'text-sky-700',    bgColor: 'bg-sky-50',     borderColor: 'border-sky-200',   bgSelected: 'bg-sky-600' },
  simpatizante:  { label: 'Simpatizante',  icon: '🤝', color: 'text-gold-deep',   bgColor: 'bg-blue-50',    borderColor: 'border-gold-deep',  bgSelected: 'bg-gold-deep' },
  apoiador:      { label: 'Apoiador',      icon: '💪', color: 'text-emerald-700',bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200',bgSelected: 'bg-emerald-600' },
  multiplicador: { label: 'Multiplicador', icon: '⭐', color: 'text-amber-700',  bgColor: 'bg-amber-50',   borderColor: 'border-amber-200', bgSelected: 'bg-amber-600' },
};

export const STATUS_FUNIL_ORDER: StatusFunil[] = ['contato', 'interessado', 'simpatizante', 'apoiador', 'multiplicador'];

export interface ElectorData {
  id: string;
  nome: string;
  cpf?: string;
  whatsapp: string;
  email?: string;
  tituloEleitor: string;
  dataNascimento: string;
  bairro: string;
  cidade: string;
  nivelVoto: 'forte' | 'medio' | 'fraco' | 'indeciso' | 'oposicao';
  nivelEngajamento: 'lideranca' | 'cabo_eleitoral' | 'eleitor_comum'; // Tipo de Contato (perfil)
  statusFunil: StatusFunil; // CRM — temperatura do relacionamento
  nichos: string[];
  gpsLatitude?: number;
  gpsLongitude?: number;
  aceitaWhatsapp: boolean;
  observacoes: string;
  dataCadastro: string;
  atendimentos: Atendimento[];
  createdBy?: string;       // id do captador responsavel
  createdByName?: string;   // nome desnormalizado para exibicao rapida
  regiao?: string;          // herdada do captador no momento do cadastro
  updatedAt?: string;       // timestamp da última modificação (usado para sincronização)
}

interface CaptureFormProps {
  onBack: () => void;
  onSave: (elector: Omit<ElectorData, 'id' | 'dataCadastro' | 'atendimentos'>) => void;
  electorToEdit?: ElectorData;
  onUpdate?: (elector: ElectorData) => void;
  onImportClick?: () => void;
}

const NICHOS_DISPONIVEIS = [
  'Saúde',
  'Educação',
  'Esporte',
  'Religião',
  'Empresário',
  'Agricultura',
  'Cultura',
  'Meio Ambiente',
  'Segurança',
  'Assistência Social'
];

export function CaptureForm({ onBack, onSave, electorToEdit, onUpdate, onImportClick }: CaptureFormProps) {
  const [nome, setNome] = useState(electorToEdit?.nome ?? '');
  const [whatsapp, setWhatsapp] = useState(electorToEdit?.whatsapp ?? '');
  const [email, setEmail] = useState(electorToEdit?.email ?? '');
  const [dataNascimento, setDataNascimento] = useState(electorToEdit?.dataNascimento ?? '');
  const [bairro, setBairro] = useState(electorToEdit?.bairro ?? '');
  const [cidade, setCidade] = useState(electorToEdit?.cidade ?? '');
  const [nivelVoto, setNivelVoto] = useState<'forte' | 'medio' | 'fraco' | 'indeciso' | 'oposicao' | ''>(electorToEdit?.nivelVoto ?? '');
  const [nivelEngajamento, setNivelEngajamento] = useState<'lideranca' | 'cabo_eleitoral' | 'eleitor_comum' | ''>(electorToEdit?.nivelEngajamento ?? '');
  const [statusFunil, setStatusFunil] = useState<StatusFunil>(electorToEdit?.statusFunil ?? 'contato');

  const [nichos, setNichos] = useState<string[]>(electorToEdit?.nichos ?? []);
  const [gpsLatitude, setGpsLatitude] = useState<number | undefined>(electorToEdit?.gpsLatitude ?? undefined);
  const [gpsLongitude, setGpsLongitude] = useState<number | undefined>(electorToEdit?.gpsLongitude ?? undefined);
  const [aceitaWhatsapp, setAceitaWhatsapp] = useState(electorToEdit?.aceitaWhatsapp ?? false);
  const [observacoes, setObservacoes] = useState(electorToEdit?.observacoes ?? '');
  const [capturandoGps, setCapturandoGps] = useState(false);
  const [systemSettings] = useState(() => getSystemSettings());

  const [uf, setUf] = useState('');
  const [estados, setEstados] = useState<{ id: number; sigla: string; nome: string }[]>([]);
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);

  // Carrega a lista de estados (UF) do IBGE
  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados')
      .then(res => res.json())
      .then(data => {
        const sortedEstados = data.sort((a: any, b: any) => a.sigla.localeCompare(b.sigla));
        setEstados(sortedEstados);
      })
      .catch(err => console.error('Erro ao buscar estados:', err));
  }, []);

  // Carrega municípios via IBGE quando a UF muda
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
        // Limpa a cidade se a nova lista não contiver a cidade atual
        if (!data.find((m: any) => m.nome === cidade)) {
          setCidade('');
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingMunicipios(false));
  }, [uf]);

  // Captura GPS automaticamente apenas no modo criacao
  useEffect(() => {
    if (!electorToEdit) {
      captureGPS();
    }
  }, []);

  const captureGPS = () => {
    setCapturandoGps(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLatitude(position.coords.latitude);
          setGpsLongitude(position.coords.longitude);
          setCapturandoGps(false);
        },
        (error) => {
          // Silencia o erro - GPS é opcional
          setCapturandoGps(false);
        },
        {
          timeout: 5000,
          enableHighAccuracy: false,
          maximumAge: 300000 // 5 minutos
        }
      );
    } else {
      setCapturandoGps(false);
    }
  };

  const toggleNicho = (nicho: string) => {
    setNichos(prev =>
      prev.includes(nicho)
        ? prev.filter(n => n !== nicho)
        : [...prev, nicho]
    );
  };

  const handleWhatsappChange = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    // Formata (XX) XXXXX-XXXX
    let formatted = numbers;
    if (numbers.length > 10) {
      formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    } else if (numbers.length > 6) {
      formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    } else if (numbers.length > 2) {
      formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    }
    setWhatsapp(formatted);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !whatsapp || !dataNascimento || !nivelVoto || !nivelEngajamento || !cidade) {
      alert('Preencha pelo menos: Nome, WhatsApp, Data de Nascimento, Cidade, Nível de Voto e Nível de Engajamento');
      return;
    }

    // Validação Anti-Fraude (Prevenção de Duplicidade por WhatsApp)
    const isDuplicateLocal = await db.electors.where('whatsapp').equals(whatsapp).count();
    if (isDuplicateLocal > 0 && (!electorToEdit || electorToEdit.whatsapp !== whatsapp)) {
      alert('Erro Anti-Fraude: Este número de WhatsApp já está cadastrado localmente.');
      return;
    }

    if (navigator.onLine && isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('eleitores').select('id').eq('whatsapp', whatsapp).limit(1);
      if (data && data.length > 0 && (!electorToEdit || data[0].id !== electorToEdit.id)) {
        alert('Erro Anti-Fraude: Este número de WhatsApp já está cadastrado no servidor por outro captador.');
        return;
      }
    }

    const formData = {
      nome,
      whatsapp,
      email,
      tituloEleitor: '',
      dataNascimento,
      bairro,
      cidade,
      nivelVoto: nivelVoto as 'forte' | 'medio' | 'fraco' | 'indeciso' | 'oposicao',
      nivelEngajamento: nivelEngajamento as 'lideranca' | 'cabo_eleitoral' | 'eleitor_comum',
      statusFunil,
      nichos,
      gpsLatitude,
      gpsLongitude,
      aceitaWhatsapp,
      observacoes
    };

    if (electorToEdit && onUpdate) {
      onUpdate({ ...electorToEdit, ...formData });
    } else {
      onSave(formData);
      // Limpa o formulario apenas no modo criacao
      setNome('');
      setWhatsapp('');
      setEmail('');
      setDataNascimento('');
      setBairro('');
      setCidade('');
      setNivelVoto('');
      setNivelEngajamento('');
      setStatusFunil('contato');
      setNichos([]);
      setAceitaWhatsapp(false);
      setObservacoes('');
      captureGPS();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gold-deep text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="mr-3 p-2 hover:bg-gold-deep rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">{electorToEdit ? 'Editar Cadastro' : 'Novo Cadastro'}</h1>
          </div>
          {!electorToEdit && onImportClick && (
            <button
              type="button"
              onClick={onImportClick}
              className="flex items-center gap-2 px-3 py-1.5 bg-gold-deep hover:bg-gold-deep rounded-lg text-sm font-semibold transition-colors shadow-sm"
              title="Importar em Massa (CSV/Excel)"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Importar</span>
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 pb-24 space-y-4">
        {/* Dados Pessoais */}
        <div className="bg-white rounded-xl shadow p-4 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center mb-2">
            <User className="w-5 h-5 mr-2 text-gold-deep" />
            Dados Pessoais
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none"
              placeholder="Digite o nome completo"
              required
            />
          </div>



          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => handleWhatsappChange(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none"
                placeholder="(00) 00000-0000"
                maxLength={15}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none"
              placeholder="exemplo@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Nascimento *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none"
                required
              />
            </div>
          </div>

        </div>

        {/* Localização */}
        <div className="bg-white rounded-xl shadow p-4 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center mb-2">
            <MapPin className="w-5 h-5 mr-2 text-gold-deep" />
            Localização
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado (UF) *
              </label>
              <select
                value={uf}
                onChange={(e) => {
                  setUf(e.target.value);
                  setCidade('');
                  if (e.target.value === 'DF') setBairro('');
                }}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none bg-white"
                required
              >
                <option value="">Selecione...</option>
                {estados.map(estado => (
                  <option key={estado.id} value={estado.sigla}>{estado.sigla} - {estado.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Município *
              </label>
              <select
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500"
                required
                disabled={!uf || uf === 'DF' || loadingMunicipios}
              >
                <option value="">{loadingMunicipios ? 'Carregando...' : 'Selecione...'}</option>
                {municipios.map(m => (
                  <option key={m.id} value={m.nome}>{m.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bairro
            </label>
            <input
              type="text"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none"
              placeholder="Digite o bairro"
            />
          </div>
        </div>

        {/* Termômetro de Voto */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-900 mb-3">
            Termômetro de Voto *
          </h2>
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => setNivelVoto('forte')}
              className={`py-4 px-6 rounded-xl text-lg font-semibold transition-all border-3 ${
                nivelVoto === 'forte'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-lg scale-105'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              ✓ {systemSettings.voteLevels.forte}
            </button>

            <button
              type="button"
              onClick={() => setNivelVoto('medio')}
              className={`py-4 px-6 rounded-xl text-lg font-semibold transition-all border-3 ${
                nivelVoto === 'medio'
                  ? 'bg-yellow-500 text-white border-yellow-600 shadow-lg scale-105'
                  : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
              }`}
            >
              ~ {systemSettings.voteLevels.medio}
            </button>

            <button
              type="button"
              onClick={() => setNivelVoto('fraco')}
              className={`py-4 px-6 rounded-xl text-lg font-semibold transition-all border-3 ${
                nivelVoto === 'fraco'
                  ? 'bg-red-600 text-white border-red-700 shadow-lg scale-105'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              }`}
            >
              ✗ {systemSettings.voteLevels.fraco}
            </button>

            <button
              type="button"
              onClick={() => setNivelVoto('indeciso')}
              className={`py-4 px-6 rounded-xl text-lg font-semibold transition-all border-3 ${
                nivelVoto === 'indeciso'
                  ? 'bg-slate-500 text-white border-slate-600 shadow-lg scale-105'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              ? {systemSettings.voteLevels.indeciso}
            </button>

            <button
              type="button"
              onClick={() => setNivelVoto('oposicao')}
              className={`py-4 px-6 rounded-xl text-lg font-semibold transition-all border-3 ${
                nivelVoto === 'oposicao'
                  ? 'bg-purple-700 text-white border-purple-800 shadow-lg scale-105'
                  : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
              }`}
            >
              ⛔ {systemSettings.voteLevels.oposicao}
            </button>
          </div>
        </div>

        {/* Status no Funil CRM */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-900 flex items-center mb-3">
            <Award className="w-5 h-5 mr-2 text-gold-deep" />
            Status no Funil *
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {STATUS_FUNIL_ORDER.map(status => {
              const cfg = STATUS_FUNIL_CONFIG[status];
              const isSelected = statusFunil === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFunil(status)}
                  className={`py-3 px-5 rounded-lg font-semibold transition-all border-2 flex items-center gap-2 ${
                    isSelected
                      ? `${cfg.bgSelected} text-white border-transparent shadow-lg`
                      : `${cfg.bgColor} ${cfg.color} ${cfg.borderColor} hover:opacity-80`
                  }`}
                >
                  <span className="text-lg">{cfg.icon}</span>
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tipo de Contato (perfil) */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-900 flex items-center mb-3">
            <Award className="w-5 h-5 mr-2 text-gold-deep" />
            Tipo de Contato *
          </h2>
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => setNivelEngajamento('lideranca')}
              className={`py-3 px-5 rounded-lg font-semibold transition-all border-2 ${
                nivelEngajamento === 'lideranca'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-lg'
                  : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
              }`}
            >
              ⭐ Liderança
            </button>

            <button
              type="button"
              onClick={() => setNivelEngajamento('cabo_eleitoral')}
              className={`py-3 px-5 rounded-lg font-semibold transition-all border-2 ${
                nivelEngajamento === 'cabo_eleitoral'
                  ? 'bg-gold-deep text-white border-gold-deep shadow-lg'
                  : 'bg-blue-50 text-gold-deep border-gold-deep hover:bg-gold/10'
              }`}
            >
              👥 Cabo Eleitoral
            </button>

            <button
              type="button"
              onClick={() => setNivelEngajamento('eleitor_comum')}
              className={`py-3 px-5 rounded-lg font-semibold transition-all border-2 ${
                nivelEngajamento === 'eleitor_comum'
                  ? 'bg-gray-600 text-white border-gray-700 shadow-lg'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              👤 Eleitor Comum
            </button>
          </div>
        </div>

        {/* Nichos e Interesses */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-900 flex items-center mb-3">
            <Tag className="w-5 h-5 mr-2 text-gold-deep" />
            Nichos e Interesses
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {NICHOS_DISPONIVEIS.map(nicho => (
              <button
                key={nicho}
                type="button"
                onClick={() => toggleNicho(nicho)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border-2 ${
                  nichos.includes(nicho)
                    ? 'bg-gold-deep text-white border-gold-deep'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {nichos.includes(nicho) ? '✓ ' : ''}{nicho}
              </button>
            ))}
          </div>
        </div>

        {/* GPS e Localização */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-900 flex items-center mb-3">
            <Navigation className="w-5 h-5 mr-2 text-gold-deep" />
            Geolocalização
          </h2>
          {gpsLatitude && gpsLongitude ? (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-3">
              <p className="text-sm text-emerald-800 font-medium mb-1">✓ Localização capturada</p>
              <p className="text-xs text-emerald-700">
                Lat: {gpsLatitude.toFixed(6)} / Long: {gpsLongitude.toFixed(6)}
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 flex items-center justify-between">
              <p className="text-sm text-yellow-800">
                {capturandoGps ? 'Capturando GPS...' : 'GPS não disponível'}
              </p>
              <button
                type="button"
                onClick={captureGPS}
                className="px-3 py-1 bg-gold-deep text-white text-sm rounded-lg hover:bg-gold-deep"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {/* Opt-in WhatsApp */}
        <div className="bg-white rounded-xl shadow p-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={aceitaWhatsapp}
              onChange={(e) => setAceitaWhatsapp(e.target.checked)}
              className="w-6 h-6 mt-1 text-gold-deep border-gray-300 rounded focus:ring-gold-deep"
            />
            <div>
              <p className="font-medium text-gray-900">Aceita mensagens automáticas</p>
              <p className="text-sm text-gray-600">
                Permite receber informações da campanha via WhatsApp
              </p>
            </div>
          </label>
        </div>

        {/* Observações */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold text-gray-900 flex items-center mb-3">
            <MessageSquare className="w-5 h-5 mr-2 text-gold-deep" />
            Observações
          </h2>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none resize-none"
            rows={4}
            placeholder="Ex: Morador pediu asfalto na Rua João Silva..."
          />
        </div>

        {/* Botão Salvar Fixo */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-2 border-gray-200 shadow-lg">
          <button
            type="submit"
            className="w-full bg-gold-deep hover:bg-gold-deep text-white py-4 rounded-xl text-lg font-bold shadow-lg flex items-center justify-center transition-all active:scale-95"
          >
            <Save className="w-6 h-6 mr-2" />
            {electorToEdit ? 'Salvar Alterações' : 'Salvar Cadastro'}
          </button>
        </div>
      </form>


    </div>
  );
}

