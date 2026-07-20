import { supabase, isSupabaseConfigured } from './supabase';
import { ElectorData } from '../components/CaptureForm';
import { User } from './auth';

export const META_DIARIA = 5;

export interface Medal {
  id: string;
  label: string;
  desc: string;
  icon: string;
  threshold: number;
}

export const MEDALS: Medal[] = [
  { id: 'first',      label: 'Primeiro Passo', desc: '1º cadastro',     icon: '🌱', threshold: 1   },
  { id: 'ten',        label: 'Decolou!',        desc: '10 cadastros',    icon: '🚀', threshold: 10  },
  { id: 'fifty',      label: 'Meio Caminho',    desc: '50 cadastros',    icon: '⭐', threshold: 50  },
  { id: 'hundred',    label: 'Centurião',       desc: '100 cadastros',   icon: '🏅', threshold: 100 },
  { id: 'twofifty',   label: 'Elite',           desc: '250 cadastros',   icon: '💎', threshold: 250 },
  { id: 'fivehundred',label: 'Lendário',        desc: '500 cadastros',   icon: '👑', threshold: 500 },
];

export interface RankEntry {
  id: string;
  name: string;
  total: number;
  today: number;
  streak: number;
  earnedMedalIds: string[];
  rank: number;
}

const CACHE_KEY = 'atlas_leaderboard_cache';

export async function fetchLeaderboard(tenantId: string, isOnline: boolean): Promise<RankEntry[]> {
  if (isOnline && isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('get_gamification_stats', { p_tenant_id: tenantId });
      if (error) throw error;
      
      const entries: RankEntry[] = data.map((row: any) => ({
        id: row.captador_id,
        name: row.captador_nome,
        total: Number(row.total_cadastros),
        today: 0,
        streak: Number(row.streak),
        earnedMedalIds: MEDALS.filter(m => Number(row.total_cadastros) >= m.threshold).map(m => m.id),
        rank: Number(row.rank),
      }));
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
      return entries.slice(0, 10);
    } catch (e) {
      console.error('Erro ao buscar leaderboard:', e);
    }
  }
  
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    return JSON.parse(cached).slice(0, 10);
  }
  return [];
}

export function todayCount(electors: ElectorData[], captadorId: string): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return electors.filter(e => {
    if (e.createdBy !== captadorId) return false;
    return new Date(e.dataCadastro) >= start;
  }).length;
}

export function computeStreak(electors: ElectorData[], captadorId: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const uniqueDays = [
    ...new Set(
      electors
        .filter(e => e.createdBy === captadorId)
        .map(e => {
          const d = new Date(e.dataCadastro);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
    ),
  ].sort((a, b) => b - a);

  if (!uniqueDays.length) return 0;

  let streak = 0;
  let expected = today.getTime();

  for (const day of uniqueDays) {
    if (day === expected) {
      streak++;
      expected -= 86_400_000;
    } else if (day < expected) {
      break;
    }
  }
  return streak;
}

export function buildRanking(users: User[], electors: ElectorData[]): RankEntry[] {
  const captadores = users.filter(u => u.role === 'colaborador');
  const entries: RankEntry[] = captadores.map(c => {
    const total = electors.filter(e => e.createdBy === c.id).length;
    return {
      id: c.id,
      name: c.name,
      total,
      today: todayCount(electors, c.id),
      streak: computeStreak(electors, c.id),
      earnedMedalIds: MEDALS.filter(m => total >= m.threshold).map(m => m.id),
      rank: 0,
    };
  });

  entries.sort((a, b) => b.total - a.total);
  entries.forEach((e, i) => { e.rank = i + 1; });
  return entries;
}

export async function fetchMyStats(
  userId: string, 
  tenantId: string, 
  isOnline: boolean, 
  localElectors: ElectorData[]
): Promise<RankEntry> {
  const localToday = todayCount(localElectors, userId);
  
  if (isOnline && isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('get_gamification_stats', { p_tenant_id: tenantId });
      if (!error && data) {
        const myRow = data.find((row: any) => row.captador_id === userId);
        if (myRow) {
          return {
            id: myRow.captador_id,
            name: myRow.captador_nome,
            total: Number(myRow.total_cadastros),
            today: localToday,
            streak: Number(myRow.streak),
            earnedMedalIds: MEDALS.filter(m => Number(myRow.total_cadastros) >= m.threshold).map(m => m.id),
            rank: Number(myRow.rank),
          };
        }
      }
    } catch (e) {
      console.error('Erro ao buscar stats pessoais:', e);
    }
  }
  
  const total = localElectors.filter(e => e.createdBy === userId).length;
  let rank = 0;
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed: RankEntry[] = JSON.parse(cached);
    const myCached = parsed.find(p => p.id === userId);
    if (myCached) rank = myCached.rank;
  }
  
  return {
    id: userId,
    name: 'Eu',
    total,
    today: localToday,
    streak: computeStreak(localElectors, userId),
    earnedMedalIds: MEDALS.filter(m => total >= m.threshold).map(m => m.id),
    rank: rank || 999,
  };
}
