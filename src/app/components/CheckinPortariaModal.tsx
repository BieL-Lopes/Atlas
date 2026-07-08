import { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { QrScannerModal } from './QrScannerModal';

interface Evento {
  id: string;
  titulo: string;
  data: string;
  horario: string;
}

interface CheckinPortariaModalProps {
  onClose: () => void;
}

export function CheckinPortariaModal({ onClose }: CheckinPortariaModalProps) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selectedEventoId, setSelectedEventoId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [lastCheckin, setLastCheckin] = useState<{ name: string; status: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchEventosHoje();
  }, []);

  const fetchEventosHoje = async () => {
    setLoading(true);
    if (isSupabaseConfigured && supabase) {
      // Busca eventos do dia (simplificado para buscar eventos recentes para teste)
      const { data } = await supabase
        .from('eventos')
        .select('id, titulo, data, horario')
        .order('data', { ascending: false })
        .limit(10);
      
      if (data) {
        setEventos(data);
      }
    }
    setLoading(false);
  };

  const handleScan = async (qrData: string) => {
    if (!selectedEventoId) return;
    
    // O QR code gerado no ElectorHomeScreen é o user.id do eleitor
    const eleitorId = qrData;
    setShowScanner(false);

    try {
      if (isSupabaseConfigured && supabase) {
        // Verifica se o eleitor existe
        const { data: perfil } = await supabase
          .from('perfis')
          .select('nome')
          .eq('id', eleitorId)
          .single();

        if (!perfil) {
          setLastCheckin({ name: 'Desconhecido', status: 'error', message: 'QR Code inválido ou eleitor não encontrado.' });
          return;
        }

        // Faz o upsert na confirmação
        const { error } = await supabase
          .from('evento_confirmacoes')
          .upsert({
            evento_id: selectedEventoId,
            eleitor_id: eleitorId,
            presente: true
          }, { onConflict: 'evento_id, eleitor_id' });

        if (error) throw error;

        setLastCheckin({ name: perfil.nome, status: 'success', message: 'Presença confirmada!' });
      }
    } catch (err: any) {
      console.error('Erro no check-in:', err);
      setLastCheckin({ name: 'Erro', status: 'error', message: 'Falha ao registrar check-in.' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex flex-col z-50">
      <div className="bg-white p-4 shadow-md flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 text-lg">Modo Portaria</h2>
          <p className="text-sm text-gray-500">Check-in rápido de eventos</p>
        </div>
        <button onClick={onClose} className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-gold-deep" />
              Selecione o Evento Atual
            </h3>
            
            {loading ? (
              <p className="text-gray-500 text-sm">Carregando eventos...</p>
            ) : eventos.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum evento encontrado.</p>
            ) : (
              <select
                value={selectedEventoId}
                onChange={(e) => setSelectedEventoId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-gold-deep outline-none"
              >
                <option value="" disabled>Escolha um evento...</option>
                {eventos.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.data.split('-').reverse().join('/')} - {ev.titulo}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-10 h-10 text-gold-deep" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Leitor de QR Code</h3>
            <p className="text-gray-500 text-sm mb-6">
              Escaneie o QR Code no celular do eleitor para registrar a presença dele no evento selecionado.
            </p>
            
            <button
              onClick={() => setShowScanner(true)}
              disabled={!selectedEventoId}
              className="w-full bg-gold-deep hover:bg-gold-deep disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all"
            >
              Abrir Câmera
            </button>
          </div>

          {lastCheckin && (
            <div className={`rounded-xl p-4 flex items-start gap-3 ${
              lastCheckin.status === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
            }`}>
              {lastCheckin.status === 'success' ? (
                <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`font-bold ${lastCheckin.status === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
                  {lastCheckin.name}
                </p>
                <p className={`text-sm ${lastCheckin.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {lastCheckin.message}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showScanner && (
        <QrScannerModal
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
