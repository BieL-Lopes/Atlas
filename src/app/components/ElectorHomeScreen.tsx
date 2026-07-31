import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  CalendarDays,
  CheckCircle2,
  MessageCircle,
  ChevronRight,
  Vote,
  LogOut,
  MapPin,
  Clock,
  Star,
  Loader2,
} from 'lucide-react';
import { User } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toast } from 'sonner';

interface Evento {
  id: string;
  titulo: string;
  data: string;
  horario: string;
  local: string;
  confirmado: boolean;
}

interface Enquete {
  id: string;
  pergunta: string;
  opcoes: string[];
  votado: string | null;
}

interface Props {
  user: User;
  onLogout: () => void;
}

export function ElectorHomeScreen({ user, onLogout }: Props) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [enquetes, setEnquetes] = useState<Enquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    if (isSupabaseConfigured && supabase) {
      // Busca eventos futuros
      const hoje = new Date().toISOString().split('T')[0];
      const [{ data: evData }, { data: enqData }, { data: confData }, { data: votoData }] =
        await Promise.all([
          supabase
            .from('eventos')
            .select('id, titulo, data, horario, local')
            .gte('data', hoje)
            .order('data', { ascending: true }),
          supabase
            .from('enquetes')
            .select('id, titulo, opcoes')
            .eq('status', 'ativa')
            .order('created_at', { ascending: false }),
          supabase
            .from('evento_confirmacoes')
            .select('evento_id')
            .eq('eleitor_id', user.id),
          supabase
            .from('enquete_votos')
            .select('enquete_id, opcao_escolhida')
            .eq('eleitor_id', user.id),
        ]);

      const confirmedIds = new Set((confData ?? []).map((c: Record<string, string>) => c.evento_id));
      const votedMap = Object.fromEntries(
        (votoData ?? []).map((v: Record<string, string>) => [v.enquete_id, v.opcao_escolhida])
      );

      setEventos((evData ?? []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        titulo: e.titulo as string,
        data: e.data as string,
        horario: e.horario as string,
        local: e.local as string,
        confirmado: confirmedIds.has(e.id as string),
      })));

      setEnquetes((enqData ?? []).map((q: Record<string, unknown>) => ({
        id: q.id as string,
        pergunta: q.titulo as string,
        opcoes: (q.opcoes as string[]) ?? [],
        votado: votedMap[q.id as string] ?? null,
      })));
    }
    setLoading(false);
  };

  const confirmarPresenca = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('evento_confirmacoes')
        .insert({ evento_id: id, eleitor_id: user.id })
        .throwOnError();
    }
    setEventos(prev => prev.map(e => e.id === id ? { ...e, confirmado: true } : e));
    toast.success('✅ Presença confirmada!');
  };

  const votar = async (enqueteId: string, opcao: string) => {
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('enquete_votos')
        .insert({ enquete_id: enqueteId, eleitor_id: user.id, opcao_escolhida: opcao })
        .throwOnError();
    }
    setEnquetes(prev => prev.map(q => q.id === enqueteId ? { ...q, votado: opcao } : q));
    toast.success('Voto registrado! Obrigado.');
  };

  const formatarData = (iso: string) => {
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-gold-deep text-white px-5 pt-10 pb-16 relative">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-gold-soft text-sm">Bem-vindo(a) 👋</p>
            <h1 className="text-2xl font-bold leading-tight">{user.name}</h1>
            {user.regiao && (
              <p className="text-gold-soft text-sm mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {user.regiao}
              </p>
            )}
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>

      {/* Cartão de QR flutuante (sobrepõe o header) */}
      <div className="px-4 -mt-10 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Seu QR pessoal</p>
              <p className="font-semibold text-gray-800 text-sm">Use para check-in em eventos</p>
            </div>
            <button
              onClick={() => setShowQR(v => !v)}
              className="flex items-center gap-1.5 bg-gold-deep text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gold-deep transition-colors"
            >
              <QrCode className="w-4 h-4" />
              {showQR ? 'Ocultar' : 'Ver QR'}
            </button>
          </div>

          {showQR && (
            <div className="flex flex-col items-center py-4 gap-3">
              <div className="p-3 bg-white border-2 border-gold-deep rounded-xl shadow-inner">
                <QRCodeSVG
                  value={user.id}
                  size={180}
                  includeMargin
                  level="M"
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                Mostre este código ao organizador do evento
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 mt-5 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-gold-soft" />
          </div>
        ) : (
        <>
        {/* Eventos Próximos */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-5 h-5 text-gold-deep" />
            <h2 className="font-bold text-gray-800">Próximos Eventos</h2>
          </div>
          {eventos.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm">
              Nenhum evento programado
            </div>
          ) : (
          <div className="space-y-3">
            {eventos.map(evento => (
              <div
                key={evento.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{evento.titulo}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatarData(evento.data)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {evento.horario}
                      </span>
                    </div>
                    <p className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {evento.local}
                    </p>
                  </div>
                  {evento.confirmado ? (
                    <span className="shrink-0 flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmado
                    </span>
                  ) : (
                    <button
                      onClick={() => confirmarPresenca(evento.id)}
                      className="shrink-0 flex items-center gap-1 text-gold-deep text-xs font-semibold bg-blue-50 hover:bg-gold/10 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Star className="w-3.5 h-3.5" />
                      Confirmar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
        </section>

        {/* Enquetes Ativas */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Vote className="w-5 h-5 text-purple-600" />
            <h2 className="font-bold text-gray-800">Enquetes Ativas</h2>
          </div>
          {enquetes.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm">
              Nenhuma enquete ativa no momento
            </div>
          ) : (
          <div className="space-y-4">
            {enquetes.map(enquete => (
              <div
                key={enquete.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <p className="font-semibold text-gray-800 text-sm mb-3">{enquete.pergunta}</p>
                {enquete.votado ? (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium bg-emerald-50 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Você votou em: <span className="font-bold">{enquete.votado}</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {enquete.opcoes.map(opcao => (
                      <button
                        key={opcao}
                        onClick={() => votar(enquete.id, opcao)}
                        className="text-sm text-left bg-gray-50 hover:bg-purple-50 hover:text-purple-700 border border-gray-200 hover:border-purple-300 rounded-lg px-3 py-2 font-medium transition-colors"
                      >
                        {opcao}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </section>

        {/* Contato com Coordenador */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-gray-800">Fale com a Equipe</h2>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
            <a
              href="https://wa.me/?text=Ol%C3%A1%2C+preciso+de+informa%C3%A7%C3%B5es+sobre+a+campanha."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">WhatsApp da Campanha</p>
                  <p className="text-xs text-gray-500">Tire dúvidas ou envie sugestões</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </a>
          </div>
        </section>
        </>
        )}
      </div>
    </div>
  );
}
