import 'leaflet/dist/leaflet.css';
import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, MapPin, Flame, Calendar, Users } from 'lucide-react';
import { User } from '../lib/auth';
import { ElectorData } from './CaptureForm';
import { computeStreak } from '../lib/gamification';

// ── Types ────────────────────────────────────────────────────────────
interface Props {
  /** The logged-in user */
  user: User;
  /** Full list of electors (will be filtered to relevant ones) */
  electors: ElectorData[];
  /** Full user list (needed for coordinator mode) */
  users: User[];
  onBack: () => void;
  /**
   * Coordinator mode: show all captadores.
   * Captador mode: show only the current user's check-ins.
   */
  mode?: 'captador' | 'coordinator';
}

const CAPTADOR_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

// ── Map bounds fitter ────────────────────────────────────────────────
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

// ── Helpers ──────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function groupByDay(electors: ElectorData[]) {
  const map: Record<string, ElectorData[]> = {};
  electors.forEach(e => {
    const day = new Date(e.dataCadastro).toLocaleDateString('pt-BR');
    if (!map[day]) map[day] = [];
    map[day].push(e);
  });
  return Object.entries(map).sort((a, b) => {
    const parse = (d: string) => d.split('/').reverse().join('-');
    return parse(b[0]) > parse(a[0]) ? 1 : -1;
  });
}

// ── Main Component ───────────────────────────────────────────────────
export function CheckinMapScreen({ user, electors, users, onBack, mode = 'captador' }: Props) {
  const isCaptador = mode === 'captador';

  // --- Captador mode ---
  const myElectors = useMemo(
    () => electors.filter(e => e.createdBy === user.id),
    [electors, user.id]
  );
  const myGPS = useMemo(
    () => myElectors.filter(e => e.gpsLatitude != null && e.gpsLongitude != null),
    [myElectors]
  );
  const myStreak = useMemo(() => computeStreak(electors, user.id), [electors, user.id]);
  const myDayGroups = useMemo(() => groupByDay(myGPS), [myGPS]);

  // --- Coordinator mode ---
  const captadores = useMemo(
    () => users.filter(u => u.role === 'colaborador'),
    [users]
  );
  const captadorColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    captadores.forEach((c, i) => { m[c.id] = CAPTADOR_COLORS[i % CAPTADOR_COLORS.length]; });
    return m;
  }, [captadores]);

  const allGPS = useMemo(
    () => electors.filter(e => e.gpsLatitude != null && e.gpsLongitude != null),
    [electors]
  );

  // Which points to show on the map
  const points: [number, number][] = isCaptador
    ? myGPS.map(e => [e.gpsLatitude!, e.gpsLongitude!])
    : allGPS.map(e => [e.gpsLatitude!, e.gpsLongitude!]);

  const defaultCenter: [number, number] = [-15.77, -47.93]; // Brasília

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col pb-24">
      {/* Header */}
      <div className="bg-gold-deep text-white p-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-gold-deep rounded-lg transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">
              {isCaptador ? 'Minha Rota' : 'Mapa de Captadores'}
            </h1>
            <p className="text-xs text-gold-soft">
              {isCaptador
                ? `${myGPS.length} check-ins com localização`
                : `${allGPS.length} check-ins registrados`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats bar (captador mode) */}
      {isCaptador && (
        <div className="bg-white border-b border-gray-200 px-4 py-3 grid grid-cols-3 text-center divide-x divide-gray-100">
          <div>
            <p className="text-lg font-bold text-gold-deep">{myElectors.length}</p>
            <p className="text-xs text-gray-500">Cadastros</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-600">{myGPS.length}</p>
            <p className="text-xs text-gray-500">Com GPS</p>
          </div>
          <div>
            <p className="text-lg font-bold text-orange-500 flex items-center justify-center gap-0.5">
              <Flame className="w-4 h-4" />{myStreak}
            </p>
            <p className="text-xs text-gray-500">Streak</p>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="relative" style={{ height: '45vh', minHeight: 240 }}>
        {points.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center bg-gray-200 text-gray-500">
            <MapPin className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">Nenhum check-in com localização ainda.</p>
            <p className="text-xs text-gray-500 mt-1">GPS é capturado automaticamente ao cadastrar.</p>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={5}
            className="h-full w-full z-0"
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            />
            <FitBounds points={points} />

            {isCaptador
              ? myGPS.map(e => (
                  <CircleMarker
                    key={e.id}
                    center={[e.gpsLatitude!, e.gpsLongitude!]}
                    radius={9}
                    pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.85, weight: 2 }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold">{e.nome}</p>
                        <p className="text-gray-500">{e.bairro}, {e.cidade}</p>
                        <p className="text-gray-500 text-xs mt-1">{formatDate(e.dataCadastro)}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))
              : allGPS.map(e => {
                  const color = captadorColorMap[e.createdBy ?? ''] ?? '#6b7280';
                  const captName = users.find(u => u.id === e.createdBy)?.name ?? 'Desconhecido';
                  return (
                    <CircleMarker
                      key={e.id}
                      center={[e.gpsLatitude!, e.gpsLongitude!]}
                      radius={8}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 2 }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-bold text-xs" style={{ color }}>● {captName}</p>
                          <p>{e.nome}</p>
                          <p className="text-gray-500">{e.bairro}, {e.cidade}</p>
                          <p className="text-gray-500 text-xs mt-1">{formatDate(e.dataCadastro)}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
          </MapContainer>
        )}
      </div>

      {/* Content below map */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-3">
        {/* Coordinator: legend */}
        {!isCaptador && captadores.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-gold-deep" />
              <h3 className="font-bold text-gray-900 text-sm">Legenda</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {captadores.map((c, i) => {
                const count = allGPS.filter(e => e.createdBy === c.id).length;
                return (
                  <div key={c.id} className="flex items-center gap-1.5 text-xs bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: CAPTADOR_COLORS[i % CAPTADOR_COLORS.length] }}
                    />
                    <span className="font-medium text-gray-700">{c.name}</span>
                    <span className="text-gray-500">({count})</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Captador: day-by-day timeline */}
        {isCaptador && (
          <>
            {myGPS.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-6 text-center text-gray-500">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Histórico aparecerá aqui conforme você cadastrar eleitores com GPS ativo.</p>
              </div>
            ) : (
              myDayGroups.map(([day, group]) => (
                <div key={day} className="bg-white rounded-2xl shadow overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <Calendar className="w-4 h-4 text-gold-deep" />
                    <span className="text-sm font-semibold text-gray-700">{day}</span>
                    <span className="ml-auto text-xs font-medium text-gold-deep bg-blue-50 px-2 py-0.5 rounded-full">
                      {group.length} cadastro{group.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {group.map(e => (
                      <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                        <MapPin className="w-4 h-4 text-gold-soft shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{e.nome}</p>
                          <p className="text-xs text-gray-500">{e.bairro}, {e.cidade}</p>
                        </div>
                        <p className="text-xs text-gray-500 shrink-0">
                          {new Date(e.dataCadastro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Coordinator: summary per captador */}
        {!isCaptador && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-bold text-gray-900">Resumo por captador</p>
            </div>
            {captadores.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">Nenhum captador cadastrado.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {captadores.map((c, i) => {
                  const total = electors.filter(e => e.createdBy === c.id).length;
                  const withGPS = allGPS.filter(e => e.createdBy === c.id).length;
                  const lastDate = electors
                    .filter(e => e.createdBy === c.id)
                    .map(e => e.dataCadastro)
                    .sort()
                    .reverse()[0];
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ background: CAPTADOR_COLORS[i % CAPTADOR_COLORS.length] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                        <p className="text-xs text-gray-500">
                          {lastDate ? `Último: ${formatDate(lastDate)}` : 'Sem cadastros'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gold-deep">{total}</p>
                        <p className="text-xs text-gray-500">{withGPS} GPS</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
