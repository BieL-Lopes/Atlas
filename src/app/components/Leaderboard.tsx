import { useEffect, useState } from 'react';
import { Trophy, CloudOff, Medal } from 'lucide-react';
import { RankEntry, fetchLeaderboard } from '../lib/gamification';

interface LeaderboardProps {
  tenantId: string;
  currentUserId: string;
}

export function Leaderboard({ tenantId, currentUserId }: LeaderboardProps) {
  const [entries, setEntries] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const loadData = async () => {
      const online = navigator.onLine;
      setIsOffline(!online);
      const data = await fetchLeaderboard(tenantId, online);
      setEntries(data);
      setLoading(false);
    };

    loadData();

    const handleOnline = () => { setIsOffline(false); loadData(); };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [tenantId]);

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Carregando ranking...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 bg-gold-deep text-white flex justify-between items-center">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-300" />
          Top 10 Captadores
        </h3>
        {isOffline && (
          <div className="flex items-center gap-1 text-xs bg-gold-deep/50 px-2 py-1 rounded-full text-gold-soft">
            <CloudOff className="w-3 h-3" />
            Em Cache
          </div>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum dado de ranking disponível.
          </div>
        ) : (
          entries.map((entry) => {
            const isMe = entry.id === currentUserId;
            
            let rankStyles: string;
            let rankIcon = null;
            
            if (entry.rank === 1) {
              rankStyles = "bg-yellow-50/50 border-l-4 border-yellow-400";
              rankIcon = <Medal className="w-6 h-6 text-yellow-500" />;
            } else if (entry.rank === 2) {
              rankStyles = "bg-gray-50/50 border-l-4 border-gray-400";
              rankIcon = <Medal className="w-6 h-6 text-gray-400" />;
            } else if (entry.rank === 3) {
              rankStyles = "bg-orange-50/50 border-l-4 border-orange-500";
              rankIcon = <Medal className="w-6 h-6 text-orange-500" />;
            } else {
              rankStyles = "border-l-4 border-transparent";
            }

            return (
              <div 
                key={entry.id} 
                className={`p-4 flex items-center gap-4 transition-colors ${rankStyles} ${isMe ? 'ring-2 ring-inset ring-blue-500' : ''}`}
              >
                <div className="w-8 flex justify-center font-bold text-gray-500">
                  {rankIcon ? rankIcon : `#${entry.rank}`}
                </div>
                
                <div className="flex-1">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {entry.name}
                    {isMe && (
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-gold/10 text-gold-deep px-2 py-0.5 rounded-full">
                        Você
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                    <span>{entry.total} cadastros</span>
                    {entry.streak >= 3 && (
                      <span className="text-orange-500 flex items-center text-xs font-medium">
                        🔥 {entry.streak} dias
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
