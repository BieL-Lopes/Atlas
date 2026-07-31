import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Map, MapPin } from 'lucide-react';
import { User } from '../lib/auth';
import { ElectorData } from './CaptureForm';

// ── Configuração de cores por nível de voto ───────────────────────────────────
const VOTO_CONFIG = {
  forte:    { color: '#16a34a', label: 'Forte' },
  medio:    { color: '#ca8a04', label: 'Médio' },
  fraco:    { color: '#dc2626', label: 'Fraco' },
  indeciso: { color: '#64748b', label: 'Indeciso' },
  oposicao: { color: '#7c3aed', label: 'Oposição' },
} as const;

type VotoKey = keyof typeof VOTO_CONFIG;
type Period = 'today' | '7d' | '30d' | 'all';

// ── Ajusta zoom do mapa para os pontos visíveis ───────────────────────────────
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [map, points]);
  return null;
}

// ── Componente principal ──────────────────────────────────────────────────────
interface Props {
  electors: ElectorData[];
  users: User[];
}

export function HeatmapScreen({ electors, users }: Props) {
  const [captadorFilter, setCaptadorFilter] = useState('all');
  const [period, setPeriod] = useState<Period>('all');
  const [activeVotos, setActiveVotos] = useState<Set<VotoKey>>(
    new Set(Object.keys(VOTO_CONFIG) as VotoKey[])
  );

  const captadores = useMemo(
    () => users.filter(u => u.role === 'colaborador'),
    [users]
  );

  const filtered = useMemo(() => {
    const cutoffs: Record<Period, number> = {
      today: new Date().setHours(0, 0, 0, 0),
      '7d':  Date.now() - 7 * 86_400_000,
      '30d': Date.now() - 30 * 86_400_000,
      all:   0,
    };
    const cut = cutoffs[period];
    return electors.filter(e => {
      if (!e.gpsLatitude || !e.gpsLongitude) return false;
      if (captadorFilter !== 'all' && e.createdBy !== captadorFilter) return false;
      if (!activeVotos.has(e.nivelVoto as VotoKey)) return false;
      if (cut && new Date(e.dataCadastro).getTime() < cut) return false;
      return true;
    });
  }, [electors, captadorFilter, period, activeVotos]);

  const points = useMemo<[number, number][]>(
    () => filtered.map(e => [e.gpsLatitude!, e.gpsLongitude!]),
    [filtered]
  );

  const totals = useMemo(() => {
    const t = { forte: 0, medio: 0, fraco: 0, indeciso: 0, oposicao: 0 } as Record<VotoKey, number>;
    filtered.forEach(e => {
      const k = e.nivelVoto as VotoKey;
      if (k in t) t[k]++;
    });
    return t;
  }, [filtered]);

  const totalWithoutGPS = useMemo(
    () => electors.filter(e => !e.gpsLatitude).length,
    [electors]
  );

  const toggle = (v: VotoKey) =>
    setActiveVotos(prev => {
      const s = new Set(prev);
      if (s.has(v)) {
        s.delete(v);
      } else {
        s.add(v);
      }
      return s;
    });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── Cabeçalho + Filtros ── */}
      <div className="bg-white border-b border-gray-200 px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center gap-2">
          <Map className="w-5 h-5 text-gold-deep" />
          <span className="font-semibold text-gray-900">Heatmap Eleitoral</span>
          <span className="ml-auto text-xs text-gray-500">
            {filtered.length} ponto{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Captador + Período */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={captadorFilter}
            onChange={e => setCaptadorFilter(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white flex-1 min-w-0"
          >
            <option value="all">Todos os captadores</option>
            {captadores.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as Period)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="all">Todo período</option>
            <option value="today">Hoje</option>
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
          </select>
        </div>

        {/* Toggle de nível de voto */}
        <div className="flex gap-1.5 flex-wrap">
          {(Object.entries(VOTO_CONFIG) as [VotoKey, typeof VOTO_CONFIG[VotoKey]][]).map(([key, cfg]) => {
            const active = activeVotos.has(key);
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all"
                style={
                  active
                    ? { backgroundColor: cfg.color, borderColor: cfg.color, color: '#fff' }
                    : { borderColor: '#d1d5db', color: '#9ca3af', backgroundColor: '#fff' }
                }
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cfg.color }}
                />
                {cfg.label}
                {active && totals[key] > 0 && (
                  <span className="font-bold ml-0.5">{totals[key]}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Mapa ou estado vazio ── */}
      <div className="flex-1 relative min-h-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 px-8 text-center">
            <MapPin className="w-14 h-14 text-gray-200" />
            <p className="font-medium text-gray-600">Nenhum ponto com localização</p>
            {totalWithoutGPS > 0 && (
              <p className="text-xs leading-5 text-gray-400">
                {totalWithoutGPS} eleitor{totalWithoutGPS !== 1 ? 'es' : ''} sem GPS.<br />
                A localização é capturada ao cadastrar com acesso à localização ativo.
              </p>
            )}
          </div>
        ) : (
          <MapContainer
            center={[-15.788, -47.879]}
            zoom={5}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <FitBounds points={points} />
            {filtered.map(e => {
              const cfg = VOTO_CONFIG[e.nivelVoto as VotoKey] ?? VOTO_CONFIG.indeciso;
              return (
                <CircleMarker
                  key={e.id}
                  center={[e.gpsLatitude!, e.gpsLongitude!]}
                  radius={8}
                  pathOptions={{
                    fillColor: cfg.color,
                    fillOpacity: 0.78,
                    color: '#ffffff',
                    weight: 1.5,
                  }}
                >
                  <Popup>
                    <div style={{ fontSize: 13, minWidth: 140 }}>
                      <p style={{ fontWeight: 600, margin: '0 0 2px 0' }}>{e.nome}</p>
                      <p style={{ color: '#6b7280', margin: '0 0 4px 0' }}>
                        {[e.bairro, e.cidade].filter(Boolean).join(', ')}
                      </p>
                      {e.regiao && (
                        <p style={{ color: '#6b7280', margin: '0 0 4px 0' }}>{e.regiao}</p>
                      )}
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 999,
                        backgroundColor: cfg.color,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {cfg.label}
                      </span>
                      {e.createdByName && (
                        <p style={{ color: '#9ca3af', margin: '4px 0 0 0', fontSize: 11 }}>
                          Captador: {e.createdByName}
                        </p>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* ── Barra de estatísticas ── */}
      {filtered.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center gap-4 overflow-x-auto">
          {(Object.entries(VOTO_CONFIG) as [VotoKey, typeof VOTO_CONFIG[VotoKey]][]).map(([key, cfg]) => {
            const count = totals[key];
            if (!count) return null;
            return (
              <div key={key} className="flex items-center gap-1.5 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span className="text-xs text-gray-600">{cfg.label}</span>
                <span className="text-xs font-bold text-gray-900">{count}</span>
              </div>
            );
          })}
          {totalWithoutGPS > 0 && (
            <div className="ml-auto flex items-center gap-1 text-xs text-gray-400 shrink-0">
              <MapPin className="w-3 h-3" />
              {totalWithoutGPS} sem GPS
            </div>
          )}
        </div>
      )}
    </div>
  );
}
