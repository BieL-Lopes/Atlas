import { useState, useEffect, useMemo } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { HomeScreen } from './components/HomeScreen';
import { CaptureForm, ElectorData } from './components/CaptureForm';
import { ContactList } from './components/ContactList';
import { ElectorProfile } from './components/ElectorProfile';
import { AgendaScreen } from './components/AgendaScreen';
import { PollsScreen } from './components/PollsScreen';
import { CoordinationScreen } from './components/CoordinationScreen';
import { AdminScreen } from './components/AdminScreen';
import { CaptadorResultsScreen } from './components/CaptadorResultsScreen';
import { CheckinMapScreen } from './components/CheckinMapScreen';
import { AuditLogsScreen } from './components/AuditLogsScreen';
import { StrategicReportsScreen } from './components/StrategicReportsScreen';
import { BottomNav } from './components/BottomNav';
import { OfflineBanner } from './components/OfflineBanner';
import { MassImportModal } from './components/MassImportModal';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { Tab, getAllowedTabs, getPermissions, ROLE_LABELS } from './lib/rbac';
import { User, signOut } from './lib/auth';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { db } from './lib/db';
import { pushPendingChanges, resetLastSync, pullChanges } from './lib/syncService';
import { subscribeToPush, unsubscribeFromPush } from './lib/pushService';
import { buildRanking, todayCount, computeStreak, MEDALS } from './lib/gamification';
import { useSync } from './lib/useSync';
import { logAudit } from './lib/auditService';

type Screen = 'login' | 'home' | 'form' | 'list' | 'profile' | 'agenda' | 'polls' | 'coordination' | 'admin' | 'results' | 'checkin' | 'logs' | 'reports';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [currentTab, setCurrentTab] = useState<Tab>('home');
  const [user, setUser] = useState<User | null>(null);
  const [electors, setElectors] = useState<ElectorData[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedElector, setSelectedElector] = useState<ElectorData | null>(null);
  const [electorToEdit, setElectorToEdit] = useState<ElectorData | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const { isOnline, pendingCount, refreshCount, syncedAt } = useSync();

  const captadorStats = useMemo(() => {
    if (!user || user.role !== 'colaborador') return undefined;
    const total = electors.filter(e => e.createdBy === user.id).length;
    const ranking = buildRanking(users, electors);
    const rank = ranking.find(r => r.id === user.id)?.rank ?? ranking.length + 1;
    return {
      total,
      today: todayCount(electors, user.id),
      streak: computeStreak(electors, user.id),
      rank,
      earnedMedalIds: MEDALS.filter(m => total >= m.threshold).map(m => m.id),
    };
  }, [user, electors, users]);

  const fetchUsers = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data } = await supabase
      .from('perfis')
      .select('id, nome, role, regiao, deputado_id, coordenador_regional_id');
    if (data) {
      setUsers(data.map((p: Record<string, unknown>) => ({
        id: p.id as string,
        name: p.nome as string,
        role: p.role as User['role'],
        regiao: (p.regiao as string) ?? undefined,
        deputadoId: (p.deputado_id as string) ?? undefined,
        coordenadorRegionalId: (p.coordenador_regional_id as string) ?? undefined,
      })));
    }
  };

  // Carrega dados do IndexedDB na inicialização (com migração do localStorage)
  useEffect(() => {
    const loadData = async () => {
      const savedUser = localStorage.getItem('atlas_user');
      if (savedUser) {
        // Valida que existe uma sessão Supabase ativa para o projeto atual
        let sessionValid = true;
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            // Sessão expirada ou de projeto diferente — força novo login
            localStorage.removeItem('atlas_user');
            sessionValid = false;
          }
        }
        if (sessionValid) {
          setUser(JSON.parse(savedUser));
          setCurrentScreen('home');
        }
      }

      // Migração one-time: move dados do localStorage para IndexedDB
      const lsElectors = localStorage.getItem('atlas_electors');
      if (lsElectors) {
        const parsed: ElectorData[] = JSON.parse(lsElectors);
        const migrated = parsed.map(e => ({
          createdBy: 'desconhecido',
          createdByName: 'Desconhecido',
          statusFunil: 'contato' as const,
          ...e,
        }));
        await db.electors.bulkPut(migrated);
        localStorage.removeItem('atlas_electors');
      }

      const all = await db.electors.orderBy('dataCadastro').reverse().toArray();
      setElectors(all);

      // Busca usuários do Supabase somente se já há sessão ativa
      if (savedUser) {
        await fetchUsers();
        // Pull imediato ao carregar: garante que o app mostra dados do servidor
        // sem precisar de page refresh (especialmente quando Dexie está vazio)
        if (isSupabaseConfigured) {
          await pullChanges();
          const synced = await db.electors.orderBy('dataCadastro').reverse().toArray();
          setElectors(synced);
        }
      }
    };
    loadData();
  }, []);

  // Recarrega eleitores do Dexie quando o sync traz dados novos do servidor
  useEffect(() => {
    if (syncedAt) {
      db.electors.orderBy('dataCadastro').reverse().toArray().then(setElectors);
    }
  }, [syncedAt]);

  // Ouve mensagens do Service Worker (ex: clique em notificação push)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE_TO_COMUNICADOS') {
        setCurrentScreen('home');
        setCurrentTab('home');
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  // Listener: detecta token expirado/revogado e força logout automático
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') {
        // Token renovado com sucesso — nada a fazer
        return;
      }
      if (event === 'SIGNED_OUT') {
        // Sessão encerrada (logout ou token revogado)
        setUser(null);
        localStorage.removeItem('atlas_user');
        setCurrentScreen('login');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (userData: User) => {
    setUser(userData);
    localStorage.setItem('atlas_user', JSON.stringify(userData));
    resetLastSync(); // força pull completo na próxima sincronização
    setCurrentScreen('home');
    subscribeToPush(userData.id); // solicita permissão push (fire-and-forget)
    // Define a primeira tab permitida para o papel do usuario
    const allowedTabs = getAllowedTabs(userData.role);
    setCurrentTab(allowedTabs[0]);
    toast.success(`Bem-vindo(a), ${userData.name}! (${ROLE_LABELS[userData.role]})`);
    // Log de auditoria — login
    logAudit({ userId: userData.id, userName: userData.name, action: 'LOGIN', entity: 'sessao' });
    // Carrega dados imediatamente após login (sem depender do useEffect inicial)
    fetchUsers();
    if (isSupabaseConfigured) {
      await pullChanges();
      const synced = await db.electors.orderBy('dataCadastro').reverse().toArray();
      setElectors(synced);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setCurrentTab(tab);
    switch (tab) {
      case 'home':
        setCurrentScreen('home');
        break;
      case 'contacts':
        setCurrentScreen('list');
        break;
      case 'agenda':
        setCurrentScreen('agenda');
        break;
      case 'polls':
        setCurrentScreen('polls');
        break;
      case 'coordination':
        setCurrentScreen('coordination');
        break;
      case 'results':
        setCurrentScreen('results');
        break;
      case 'admin':
        setCurrentScreen('admin');
        break;
      case 'logs':
        setCurrentScreen('logs');
        break;
      case 'reports':
        setCurrentScreen('reports');
        break;
    }
  };

  const handleSaveElector = async (electorData: Omit<ElectorData, 'id' | 'dataCadastro' | 'atendimentos'>) => {
    const now = new Date().toISOString();
    const newElector: ElectorData = {
      ...electorData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dataCadastro: now,
      updatedAt: now,
      atendimentos: [],
      createdBy: user?.id ?? 'desconhecido',
      createdByName: user?.name ?? 'Desconhecido',
      regiao: user?.regiao ?? electorData.regiao
    };

    await db.electors.add(newElector);
    await db.pendingChanges.add({
      operation: 'create',
      entityId: newElector.id,
      payload: newElector,
      timestamp: new Date().toISOString(),
    });
    if (isOnline && isSupabaseConfigured) await pushPendingChanges();
    await refreshCount();
    setElectors(prev => [newElector, ...prev]);
    setCurrentScreen('home');
    toast.success('✅ Contato cadastrado com sucesso!');

    // Log de auditoria — criação
    if (user) {
      logAudit({ userId: user.id, userName: user.name, action: 'CREATE', entity: 'eleitores', entityId: newElector.id, details: { nome: newElector.nome } });
    }

    // Background GPS capture — updates the record silently after save
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const withGPS: ElectorData = {
            ...newElector,
            gpsLatitude: pos.coords.latitude,
            gpsLongitude: pos.coords.longitude,
            updatedAt: new Date().toISOString(),
          };
          await db.electors.put(withGPS);
          await db.pendingChanges.add({
            operation: 'update',
            entityId: withGPS.id,
            payload: withGPS,
            timestamp: new Date().toISOString(),
          });
          setElectors(prev => prev.map(e => e.id === withGPS.id ? withGPS : e));
        },
        () => { /* GPS negado ou indisponível — silencioso */ },
        { timeout: 8000, enableHighAccuracy: true, maximumAge: 30000 }
      );
    }
  };

  const handleDeleteElector = async (id: string) => {
    const elector = electors.find(e => e.id === id);

    // IDOR defense-in-depth: valida permissão no frontend antes de enviar ao Supabase
    if (user && elector && elector.createdBy !== user.id) {
      const { canDeleteElector } = getPermissions(user.role);
      if (!canDeleteElector) {
        toast.error('Sem permissão para excluir este contato.');
        return;
      }
    }

    await db.electors.delete(id);
    await db.pendingChanges.add({
      operation: 'delete',
      entityId: id,
      timestamp: new Date().toISOString(),
    });
    if (isOnline && isSupabaseConfigured) await pushPendingChanges();
    await refreshCount();
    setElectors(prev => prev.filter(e => e.id !== id));
    toast.success('Contato excluído');

    // Log de auditoria — exclusão
    if (user) {
      logAudit({ userId: user.id, userName: user.name, action: 'DELETE', entity: 'eleitores', entityId: id, details: { nome: elector?.nome } });
    }
  };

  const handleViewProfile = (elector: ElectorData) => {
    setSelectedElector(elector);
    setCurrentScreen('profile');
  };

  const handleUpdateElector = async (updatedElector: ElectorData) => {
    const updated = { ...updatedElector, updatedAt: new Date().toISOString() };
    await db.electors.put(updated);
    await db.pendingChanges.add({
      operation: 'update',
      entityId: updated.id,
      payload: updated,
      timestamp: new Date().toISOString(),
    });
    if (isOnline && isSupabaseConfigured) await pushPendingChanges();
    await refreshCount();
    setElectors(prev => prev.map(e => e.id === updated.id ? updated : e));
    setSelectedElector(updated);
    toast.success('Atendimento registrado!');

    // Log de auditoria — atualização
    if (user) {
      logAudit({ userId: user.id, userName: user.name, action: 'UPDATE', entity: 'eleitores', entityId: updated.id, details: { nome: updated.nome } });
    }
  };

  const handleEditElector = (elector: ElectorData) => {
    setElectorToEdit(elector);
    setCurrentScreen('form');
  };

  const handleSaveEditedElector = async (updatedElector: ElectorData) => {
    const updated = { ...updatedElector, updatedAt: new Date().toISOString() };
    await db.electors.put(updated);
    await db.pendingChanges.add({
      operation: 'update',
      entityId: updated.id,
      payload: updated,
      timestamp: new Date().toISOString(),
    });
    if (isOnline && isSupabaseConfigured) await pushPendingChanges();
    await refreshCount();
    setElectors(prev => prev.map(e => e.id === updated.id ? updated : e));
    setSelectedElector(updated);
    setElectorToEdit(null);
    setCurrentScreen('profile');
    toast.success('✅ Contato atualizado com sucesso!');

    // Log de auditoria — edição
    if (user) {
      logAudit({ userId: user.id, userName: user.name, action: 'UPDATE', entity: 'eleitores', entityId: updated.id, details: { nome: updated.nome } });
    }
  };

  const handleLogout = async () => {
    if (user) unsubscribeFromPush(user.id);
    setUser(null);
    // signOut() limpa localStorage e sessionStorage internamente
    await signOut();
    // Limpa pendências de sync local
    try { await db.pendingChanges.clear(); } catch { /* silencioso */ }
    setElectors([]);
    setCurrentScreen('login');
    toast.info('Até logo!');
  };

  if (currentScreen === 'login') {
    return (
      <>
        <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
        <LoginScreen onLogin={handleLogin} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  // Obtem permissoes do usuario atual
  const userPermissions = user ? getPermissions(user.role) : null;

  if (currentScreen === 'form') {
    // Verifica se o usuario pode criar eleitores
    if (!userPermissions?.canCreateElector) {
      setCurrentScreen('home');
      return null;
    }
    return (
      <>
        <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
        <CaptureForm
          onBack={() => {
            setElectorToEdit(null);
            setCurrentScreen(electorToEdit ? 'profile' : 'home');
            setCurrentTab(electorToEdit ? 'contacts' : 'home');
          }}
          onSave={handleSaveElector}
          electorToEdit={electorToEdit ?? undefined}
          onUpdate={handleSaveEditedElector}
          onImportClick={() => setShowImportModal(true)}
        />
        {showImportModal && user && (
          <MassImportModal
            user={user}
            onClose={() => setShowImportModal(false)}
            onImported={() => {}}
          />
        )}
        <Toaster position="top-center" richColors />
      </>
    );
  }

  if (currentScreen === 'profile' && selectedElector) {
    return (
      <>
        <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
        <ElectorProfile
          elector={selectedElector}
          onBack={() => {
            setCurrentScreen('list');
            setCurrentTab('contacts');
          }}
          onUpdate={handleUpdateElector}
          onEdit={userPermissions?.canCreateElector ? handleEditElector : undefined}
        />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  if (currentScreen === 'agenda') {
    return (
      <>
        <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
        <AgendaScreen user={user!} />
        <BottomNav currentTab={currentTab} onTabChange={handleTabChange} userRole={user?.role || 'cabo_eleitoral'} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  if (currentScreen === 'polls') {
    return (
      <>
        <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
        <PollsScreen user={user!} />
        <BottomNav currentTab={currentTab} onTabChange={handleTabChange} userRole={user?.role || 'cabo_eleitoral'} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  if (currentScreen === 'coordination') {
    return (
      <>
        <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
        <CoordinationScreen
          user={user!}
          electors={electors}
          users={users}
          canExport={userPermissions?.canExport ?? false}
        />
        <BottomNav currentTab={currentTab} onTabChange={handleTabChange} userRole={user?.role || 'cabo_eleitoral'} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  if (currentScreen === 'results' && user) {
    return (
      <>
        <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
        <CaptadorResultsScreen
          user={user}
          electors={electors}
          onLogout={handleLogout}
          onViewRoute={() => setCurrentScreen('checkin')}
        />
        <BottomNav currentTab={currentTab} onTabChange={handleTabChange} userRole={user?.role || 'cabo_eleitoral'} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  if (currentScreen === 'checkin' && user) {
    return (
      <>
        <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
        <CheckinMapScreen
          user={user}
          electors={electors}
          users={users}
          onBack={() => setCurrentScreen('results')}
          mode="captador"
        />
        <BottomNav currentTab={currentTab} onTabChange={handleTabChange} userRole={user?.role || 'cabo_eleitoral'} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  if (currentScreen === 'admin') {
    return (
      <>
        <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
        <AdminScreen
          user={user!}
          electors={electors}
          users={users}
          canExport={userPermissions?.canExport ?? false}
        />
        <BottomNav currentTab={currentTab} onTabChange={handleTabChange} userRole={user?.role || 'cabo_eleitoral'} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  if (currentScreen === 'logs' && user) {
    return (
      <>
        <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
        <AuditLogsScreen user={user} />
        <BottomNav currentTab={currentTab} onTabChange={handleTabChange} userRole={user?.role || 'cabo_eleitoral'} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  if (currentScreen === 'reports' && user) {
    return (
      <>
        <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
        <StrategicReportsScreen user={user} electors={electors} users={users} />
        <BottomNav currentTab={currentTab} onTabChange={handleTabChange} userRole={user?.role || 'cabo_eleitoral'} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  if (currentScreen === 'list') {
    return (
      <>
        <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
        <ContactList
          contacts={electors}
          onBack={() => {
            setCurrentScreen('home');
            setCurrentTab('home');
          }}
          onDelete={userPermissions?.canDeleteElector ? handleDeleteElector : undefined}
          onViewProfile={handleViewProfile}
          onAdd={userPermissions?.canCreateElector ? () => {
            setElectorToEdit(null);
            setCurrentScreen('form');
          } : undefined}
        />
        <BottomNav currentTab={currentTab} onTabChange={handleTabChange} userRole={user?.role || 'cabo_eleitoral'} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  return (
    <>
      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
      <HomeScreen
        user={user ?? undefined}
        userName={user?.name || 'Usuario'}
        totalCadastros={electors.length}
        votoStats={{
          forte: electors.filter(e => e.nivelVoto === 'forte').length,
          medio: electors.filter(e => e.nivelVoto === 'medio').length,
          fraco: electors.filter(e => e.nivelVoto === 'fraco').length,
          indeciso: electors.filter(e => e.nivelVoto === 'indeciso').length,
          oposicao: electors.filter(e => e.nivelVoto === 'oposicao').length,
        }}
        onNavigate={setCurrentScreen}
        onLogout={handleLogout}
        userRole={user?.role || 'cabo_eleitoral'}
        captadorStats={captadorStats || undefined}
        electors={electors}
      />
      <BottomNav currentTab={currentTab} onTabChange={handleTabChange} userRole={user?.role || 'cabo_eleitoral'} />
      <Toaster position="top-center" richColors />
    </>
  );
}
