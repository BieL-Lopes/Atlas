import { useState } from 'react';
import { ArrowLeft, Phone, MapPin, Calendar, Navigation, Tag, Award, Plus, FileText, Users as UsersIcon, Trash2, Clock, BookOpen, UserCheck, Edit2, QrCode, TrendingUp } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ElectorData, Atendimento } from './CaptureForm';
import { computeScore } from '../lib/score';

interface ElectorProfileProps {
  elector: ElectorData;
  onBack: () => void;
  onUpdate: (updatedElector: ElectorData) => void;
  onEdit?: (elector: ElectorData) => void;
}

export function ElectorProfile({ elector, onBack, onUpdate, onEdit }: ElectorProfileProps) {
  const [activeTab, setActiveTab] = useState<'atendimentos' | 'atividades'>('atendimentos');
  const [showQR, setShowQR] = useState(false);
  const [showNewAtendimento, setShowNewAtendimento] = useState(false);
  const [atendimentoDescricao, setAtendimentoDescricao] = useState('');
  const [atendimentoTipo, setAtendimentoTipo] = useState<'demanda' | 'visita' | 'reuniao' | 'ligacao'>('demanda');

  const handleAddAtendimento = () => {
    if (!atendimentoDescricao.trim()) {
      alert('Digite a descrição do atendimento');
      return;
    }

    const novoAtendimento: Atendimento = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: new Date().toISOString(),
      descricao: atendimentoDescricao,
      tipo: atendimentoTipo
    };

    const updatedElector: ElectorData = {
      ...elector,
      atendimentos: [novoAtendimento, ...elector.atendimentos]
    };

    onUpdate(updatedElector);
    setAtendimentoDescricao('');
    setShowNewAtendimento(false);
  };

  const handleDeleteAtendimento = (id: string) => {
    const updatedElector: ElectorData = {
      ...elector,
      atendimentos: elector.atendimentos.filter(a => a.id !== id)
    };
    onUpdate(updatedElector);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNivelVotoBadge = (nivel: 'forte' | 'medio' | 'fraco' | 'indeciso' | 'oposicao') => {
    const styles = {
      forte:    'bg-emerald-100 text-emerald-800 border-emerald-300',
      medio:    'bg-yellow-100 text-yellow-800 border-yellow-300',
      fraco:    'bg-red-100 text-red-800 border-red-300',
      indeciso: 'bg-slate-100 text-slate-700 border-slate-300',
      oposicao: 'bg-purple-100 text-purple-800 border-purple-300',
    };
    const labels = {
      forte:    'Voto Forte',
      medio:    'Voto Médio',
      fraco:    'Voto Fraco',
      indeciso: 'Indeciso',
      oposicao: 'Oposição',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${styles[nivel]}`}>
        {labels[nivel]}
      </span>
    );
  };

  const getNivelEngajamentoBadge = (nivel: 'lideranca' | 'cabo_eleitoral' | 'eleitor_comum') => {
    const styles = {
      lideranca: 'bg-purple-100 text-purple-800 border-purple-300',
      cabo_eleitoral: 'bg-gold/10 text-gold-deep border-gold-deep',
      eleitor_comum: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    const labels = {
      lideranca: '⭐ Liderança',
      cabo_eleitoral: '👥 Cabo Eleitoral',
      eleitor_comum: '👤 Eleitor Comum'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${styles[nivel]}`}>
        {labels[nivel]}
      </span>
    );
  };

  const getTipoAtendimentoIcon = (tipo: string) => {
    switch (tipo) {
      case 'demanda': return '📋';
      case 'visita': return '🏠';
      case 'reuniao': return '🤝';
      case 'ligacao': return '📞';
      default: return '📝';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gold-deep text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="mr-3 p-2 hover:bg-gold-deep rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Perfil do Eleitor</h1>
          </div>
          {onEdit && (
            <button
              onClick={() => onEdit(elector)}
              className="p-2 hover:bg-gold-deep rounded-lg transition-colors"
              title="Editar eleitor"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 pb-6">
        {/* Informações Básicas */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{elector.nome}</h2>

          <div className="flex flex-wrap gap-2 mb-4">
            {getNivelVotoBadge(elector.nivelVoto)}
            {getNivelEngajamentoBadge(elector.nivelEngajamento)}
          </div>

          {/* Score de engajamento */}
          {(() => {
            const s = computeScore(elector);
            const pct = s.score;
            return (
              <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <TrendingUp className="w-4 h-4" style={{ color: s.hexColor }} />
                    Score de Engajamento
                  </div>
                  <span className="text-lg font-bold" style={{ color: s.hexColor }}>
                    {s.score}/100
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: s.hexColor }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Engajamento {s.label}</p>
              </div>
            );
          })()}

          <div className="space-y-3 text-sm">
            <div className="flex items-center text-gray-700">
              <Phone className="w-4 h-4 mr-3 text-gold-deep" />
              <a
                href={`https://wa.me/55${elector.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-deep hover:underline font-medium"
              >
                {elector.whatsapp}
              </a>
              {elector.aceitaWhatsapp && (
                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                  ✓ Aceita mensagens
                </span>
              )}
            </div>

            <div className="flex items-center text-gray-700">
              <MapPin className="w-4 h-4 mr-3 text-gold-deep" />
              <span>{elector.bairro ? `${elector.bairro}, ` : ''}{elector.cidade}</span>
            </div>

            {elector.tituloEleitor && (
              <div className="flex items-center text-gray-700">
                <BookOpen className="w-4 h-4 mr-3 text-gold-deep" />
                <span>Título de Eleitor: <span className="font-mono font-semibold">{elector.tituloEleitor}</span></span>
              </div>
            )}

            {elector.dataNascimento && (
              <div className="flex items-center text-gray-700">
                <Calendar className="w-4 h-4 mr-3 text-gold-deep" />
                <span>Nascimento: {formatDate(elector.dataNascimento)}</span>
              </div>
            )}

            {elector.gpsLatitude && elector.gpsLongitude && (
              <div className="flex items-center text-gray-700">
                <Navigation className="w-4 h-4 mr-3 text-gold-deep" />
                <span className="text-xs">
                  GPS: {elector.gpsLatitude.toFixed(6)}, {elector.gpsLongitude.toFixed(6)}
                </span>
              </div>
            )}

            {elector.createdByName && elector.createdByName !== 'Desconhecido' && (
              <div className="flex items-center text-gray-500 text-xs border-t border-gray-100 pt-2 mt-2">
                <UserCheck className="w-4 h-4 mr-3 text-gray-400" />
                <span>Cadastrado por <span className="font-medium">{elector.createdByName}</span>
                  {elector.regiao ? ` — ${elector.regiao}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* QR Code do Título */}
        {elector.tituloEleitor && (
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-gold-deep" />
                QR Code do Título
              </h3>
              <button
                onClick={() => setShowQR(v => !v)}
                className="text-sm text-gold-deep font-medium hover:text-gold transition-colors"
              >
                {showQR ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {showQR && (
              <div className="flex flex-col items-center gap-3 mt-4">
                <div className="p-3 bg-white border-2 border-gray-200 rounded-xl">
                  <QRCodeSVG
                    value={elector.tituloEleitor.replace(/\D/g, '')}
                    size={200}
                    level="M"
                  />
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Escaneie para preencher o título automaticamente
                </p>
              </div>
            )}
          </div>
        )}

        {/* Nichos */}
        {elector.nichos && elector.nichos.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold text-gray-900 flex items-center mb-3">
              <Tag className="w-5 h-5 mr-2 text-gold-deep" />
              Nichos e Interesses
            </h3>
            <div className="flex flex-wrap gap-2">
              {elector.nichos.map(nicho => (
                <span
                  key={nicho}
                  className="px-3 py-1 bg-blue-50 text-gold-deep rounded-lg text-sm font-medium border border-gold-deep"
                >
                  {nicho}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Observações */}
        {elector.observacoes && (
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold text-gray-900 mb-2">Observações Iniciais</h3>
            <p className="text-gray-700 text-sm italic">"{elector.observacoes}"</p>
          </div>
        )}

        {/* Tabs: Atendimentos vs Atividades */}
        <div className="bg-white rounded-xl shadow">
          <div className="grid grid-cols-2 border-b-2 border-gray-200">
            <button
              onClick={() => setActiveTab('atendimentos')}
              className={`py-4 px-4 font-semibold transition-all ${
                activeTab === 'atendimentos'
                  ? 'text-gold-deep border-b-4 border-gold-deep -mb-0.5'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <FileText className="w-5 h-5 inline mr-2" />
              Atendimentos
            </button>
            <button
              onClick={() => setActiveTab('atividades')}
              className={`py-4 px-4 font-semibold transition-all ${
                activeTab === 'atividades'
                  ? 'text-purple-600 border-b-4 border-purple-600 -mb-0.5'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Clock className="w-5 h-5 inline mr-2" />
              Atividades
            </button>
          </div>

          <div className="p-4">
            {activeTab === 'atendimentos' ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900">Histórico de Demandas</h3>
                  <button
                    onClick={() => setShowNewAtendimento(!showNewAtendimento)}
                    className="p-2 bg-gold-deep text-white rounded-lg hover:bg-gold-deep transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Formulário Novo Atendimento */}
                {showNewAtendimento && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-gold-deep">
                    <h4 className="font-semibold text-gray-900 mb-3">Registrar Nova Demanda</h4>

                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'demanda', label: '📋 Demanda' },
                          { value: 'ligacao', label: '📞 Ligação' }
                        ].map(tipo => (
                          <button
                            key={tipo.value}
                            type="button"
                            onClick={() => setAtendimentoTipo(tipo.value as any)}
                            className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                              atendimentoTipo === tipo.value
                                ? 'bg-gold-deep text-white border-gold-deep'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {tipo.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                      <textarea
                        value={atendimentoDescricao}
                        onChange={(e) => setAtendimentoDescricao(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-gold-deep focus:outline-none resize-none"
                        rows={3}
                        placeholder="Ex: Solicitou consulta médica no posto de saúde..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleAddAtendimento}
                        className="flex-1 bg-gold-deep text-white py-2 rounded-lg font-semibold hover:bg-gold-deep"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => {
                          setShowNewAtendimento(false);
                          setAtendimentoDescricao('');
                        }}
                        className="px-4 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de Atendimentos */}
                {elector.atendimentos.filter(a => a.tipo === 'demanda' || a.tipo === 'ligacao').length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Nenhuma demanda registrada</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {elector.atendimentos
                      .filter(a => a.tipo === 'demanda' || a.tipo === 'ligacao')
                      .map(atendimento => (
                        <div
                          key={atendimento.id}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center">
                              <span className="text-xl mr-2">{getTipoAtendimentoIcon(atendimento.tipo)}</span>
                              <span className="text-xs text-gray-500">{formatDate(atendimento.data)}</span>
                            </div>
                            <button
                              onClick={() => {
                                if (confirm('Deseja excluir este atendimento?')) {
                                  handleDeleteAtendimento(atendimento.id);
                                }
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm text-gray-700">{atendimento.descricao}</p>
                        </div>
                      ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="font-bold text-gray-900 mb-4">Visitas e Reuniões</h3>
                {elector.atendimentos.filter(a => a.tipo === 'visita' || a.tipo === 'reuniao').length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Nenhuma visita ou reunião registrada</p>
                    <p className="text-xs text-gray-400 mt-2">Use a aba Agenda para criar atividades</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {elector.atendimentos
                      .filter(a => a.tipo === 'visita' || a.tipo === 'reuniao')
                      .map(atendimento => (
                        <div
                          key={atendimento.id}
                          className="p-3 bg-purple-50 rounded-lg border border-purple-200"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center">
                              <span className="text-xl mr-2">{getTipoAtendimentoIcon(atendimento.tipo)}</span>
                              <span className="text-xs text-purple-700">{formatDate(atendimento.data)}</span>
                            </div>
                            <button
                              onClick={() => {
                                if (confirm('Deseja excluir esta atividade?')) {
                                  handleDeleteAtendimento(atendimento.id);
                                }
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm text-gray-700">{atendimento.descricao}</p>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Info de Cadastro */}
        <div className="text-center text-xs text-gray-500">
          Cadastrado em {formatDate(elector.dataCadastro)}
        </div>
      </div>
    </div>
  );
}
