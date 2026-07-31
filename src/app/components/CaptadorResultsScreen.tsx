import { useEffect, useState } from 'react';
import { Trophy, Flame, Target, Star, LogOut, ChevronUp, MapPin } from 'lucide-react';
import { User } from '../lib/auth';
import { ElectorData } from './CaptureForm';
import {
  MEDALS, META_DIARIA, fetchMyStats, RankEntry
} from '../lib/gamification';
import { Leaderboard } from './Leaderboard';

interface Props {
  user: User;
  electors: ElectorData[];
  onLogout: () => void;
  onViewRoute: () => void;
}

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7f32'];
const RANK_LABELS = ['1º', '2º', '3º'];

export function CaptadorResultsScreen({ user, electors, onLogout, onViewRoute }: Props) {
  const [myStats, setMyStats] = useState<RankEntry | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      const isOnline = navigator.onLine;
      const stats = await fetchMyStats(user.id, user.deputadoId || '', isOnline, electors);
      setMyStats(stats);
    };
    
    loadStats();
    
    const handleOnline = () => loadStats();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user.id, user.deputadoId, electors]);

  const myTotal = myStats?.total ?? 0;
  const myToday = myStats?.today ?? 0;
  const myStreak = myStats?.streak ?? 0;
  const myRank = myStats?.rank ?? 999;

  const todayPct = Math.min((myToday / META_DIARIA) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header */}
      <div className="bg-gold-deep text-white p-6 pb-20">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gold-soft mb-1">Meus Resultados</p>
            <h1 className="text-2xl font-bold">{user.name}</h1>
          </div>
          <button
            onClick={onLogout}
            className="p-2 hover:bg-gold-deep rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 -mt-12 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Rank */}
          <div className="bg-white rounded-2xl shadow p-4 flex flex-col items-center justify-center">
            <Trophy className="w-6 h-6 text-yellow-500 mb-1" />
            <p className="text-2xl font-bold text-gray-900">
              {myRank <= 3
                ? <span style={{ color: RANK_COLORS[myRank - 1] }}>{RANK_LABELS[myRank - 1]}</span>
                : myRank === 999 ? '-' : `#${myRank}`}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Ranking</p>
          </div>

          {/* Streak */}
          <div className="bg-white rounded-2xl shadow p-4 flex flex-col items-center justify-center">
            <Flame className={`w-6 h-6 mb-1 transition-all ${myStreak > 0 ? 'text-orange-500 scale-110 animate-pulse' : 'text-gray-300'}`} />
            <p className="text-2xl font-bold text-gray-900">{myStreak}</p>
            <p className="text-xs text-gray-500 mt-0.5">Dias seguidos</p>
          </div>

          {/* Total */}
          <div className="bg-white rounded-2xl shadow p-4 flex flex-col items-center justify-center">
            <Star className="w-6 h-6 text-gold-deep mb-1" />
            <p className="text-2xl font-bold text-gray-900">{myTotal}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total</p>
          </div>
        </div>

        {/* Meta Diária */}
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-gold-deep" />
              <span className="font-semibold text-gray-900 text-sm">Meta de hoje</span>
            </div>
            <span className="text-sm font-bold text-gold-deep">{myToday}/{META_DIARIA}</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${myToday >= META_DIARIA ? 'bg-emerald-500' : 'bg-gold-deep'}`}
              style={{ width: `${todayPct}%` }}
            />
          </div>
          {myToday >= META_DIARIA && (
            <p className="text-xs text-emerald-600 font-medium mt-1.5">✅ Meta atingida hoje!</p>
          )}
        </div>

        {/* Minha Rota */}
        <button
          onClick={onViewRoute}
          className="w-full flex items-center justify-between bg-white rounded-2xl shadow p-4 hover:bg-gray-50 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900 text-sm">Minha Rota</p>
              <p className="text-xs text-gray-500">Histórico de check-ins no mapa</p>
            </div>
          </div>
          <ChevronUp className="w-4 h-4 text-gray-500 rotate-90" />
        </button>

        {/* Medalhas */}
        <div className="bg-white rounded-2xl shadow p-4">
          <h3 className="font-bold text-gray-900 mb-3">Medalhas</h3>
          <div className="grid grid-cols-3 gap-3">
            {MEDALS.map(medal => {
              const earned = myTotal >= medal.threshold;
              return (
                <div
                  key={medal.id}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                    earned
                      ? 'border-yellow-300 bg-yellow-50 scale-105'
                      : 'border-gray-100 bg-gray-50 grayscale opacity-50'
                  }`}
                >
                  <span className="text-2xl mb-1">{medal.icon}</span>
                  <p className={`text-xs font-bold text-center ${earned ? 'text-gray-900' : 'text-gray-500'}`}>
                    {medal.label}
                  </p>
                  <p className="text-xs text-gray-500">{medal.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <Leaderboard tenantId={user.deputadoId || ''} currentUserId={user.id} />
      </div>
    </div>
  );
}
