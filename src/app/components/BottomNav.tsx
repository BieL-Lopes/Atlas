import { Home, Users, Calendar, BarChart3, Settings, Map, Trophy, FileText, TrendingUp } from 'lucide-react';
import { UserRole, canAccessTab, Tab } from '../lib/rbac';

interface BottomNavProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
  userRole: UserRole;
}

export function BottomNav({ currentTab, onTabChange, userRole }: BottomNavProps) {
  const allTabs = [
    { id: 'home' as const, icon: Home, label: 'Inicio' },
    { id: 'contacts' as const, icon: Users, label: 'Contatos' },
    { id: 'agenda' as const, icon: Calendar, label: 'Agenda' },
    { id: 'results' as const, icon: Trophy, label: 'Resultados' },
    { id: 'polls' as const, icon: BarChart3, label: 'Enquetes' },
    { id: 'reports' as const, icon: TrendingUp, label: 'Relatórios' },
    { id: 'coordination' as const, icon: Map, label: 'Coordenação' },
    { id: 'logs' as const, icon: FileText, label: 'Logs' },
    { id: 'admin' as const, icon: Settings, label: 'Admin' }
  ];

  // Filtra tabs baseado no papel do usuario
  const tabs = allTabs.filter(tab => canAccessTab(userRole, tab.id));

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg z-50">
      <div className={`grid grid-cols-${tabs.length}`} style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-3 transition-all ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-[10px] leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
