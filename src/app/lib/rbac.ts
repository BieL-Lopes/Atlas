// Definicao dos 5 papeis do sistema
export type UserRole = 
  | 'candidato'            // Candidato - acesso total
  | 'coordenador'          // Coordenador - acesso a liderancas, colaboradores, cabos, eleitores e ranking
  | 'lideranca'            // Lideranca - cadastros feitos, ranking e disparos redes sociais
  | 'colaborador'          // Colaborador / Voluntario - cadastros feitos, ranking e disparos
  | 'cabo_eleitoral';      // Cabo Eleitoral / Captador de Voto - cadastros feitos, ranking e disparos

// Tabs disponiveis no sistema
export type Tab = 'home' | 'contacts' | 'agenda' | 'polls' | 'admin' | 'coordination' | 'results' | 'logs' | 'reports' | 'invite';

// Labels amigaveis para os papeis
export const ROLE_LABELS: Record<UserRole, string> = {
  candidato: 'Candidato',
  coordenador: 'Coordenador',
  lideranca: 'Liderança',
  colaborador: 'Colaborador / Voluntário',
  cabo_eleitoral: 'Cabo Eleitoral / Captador de Voto'
};

// Definicao de permissoes por papel
export const ROLE_PERMISSIONS: Record<UserRole, {
  tabs: Tab[];
  canCreateElector: boolean;
  canDeleteElector: boolean;
  canExport: boolean;
  canManagePolls: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canViewLogs: boolean;
  canImport: boolean;
}> = {
  // Candidato: acesso total a tudo
  candidato: {
    tabs: ['home', 'contacts', 'agenda', 'polls', 'reports', 'logs', 'admin', 'coordination', 'results', 'invite'],
    canCreateElector: true,
    canDeleteElector: true,
    canExport: true,
    canManagePolls: true,
    canViewReports: true,
    canManageUsers: true,
    canViewLogs: true,
    canImport: true
  },
  // Coordenador: acesso a liderancas, colaboradores, cabos, eleitores e ranking
  coordenador: {
    tabs: ['home', 'contacts', 'agenda', 'polls', 'reports', 'coordination', 'results', 'invite'],
    canCreateElector: true,
    canDeleteElector: true,
    canExport: true,
    canManagePolls: true,
    canViewReports: true,
    canManageUsers: false,
    canViewLogs: false,
    canImport: true
  },
  // Lideranca: cadastros feitos + ranking + disparos redes sociais
  lideranca: {
    tabs: ['home', 'contacts', 'results', 'invite'],
    canCreateElector: true,
    canDeleteElector: false,
    canExport: false,
    canManagePolls: false,
    canViewReports: false,
    canManageUsers: false,
    canViewLogs: false,
    canImport: false
  },
  // Colaborador: cadastros feitos + ranking + disparos redes sociais
  colaborador: {
    tabs: ['home', 'contacts', 'results', 'invite'],
    canCreateElector: true,
    canDeleteElector: false,
    canExport: false,
    canManagePolls: false,
    canViewReports: false,
    canManageUsers: false,
    canViewLogs: false,
    canImport: false
  },
  // Cabo Eleitoral: cadastros feitos + ranking + disparos redes sociais
  cabo_eleitoral: {
    tabs: ['home', 'contacts', 'results', 'invite'],
    canCreateElector: true,
    canDeleteElector: false,
    canExport: false,
    canManagePolls: false,
    canViewReports: false,
    canManageUsers: false,
    canViewLogs: false,
    canImport: false
  }
};

// Funcao para verificar se um papel tem acesso a uma tab
export function canAccessTab(role: UserRole | undefined, tab: Tab): boolean {
  const safeRole = role || 'cabo_eleitoral';
  return ROLE_PERMISSIONS[safeRole]?.tabs?.includes(tab) ?? false;
}

// Funcao para obter as tabs permitidas para um papel
export function getAllowedTabs(role: UserRole | undefined): Tab[] {
  const safeRole = role || 'cabo_eleitoral';
  return ROLE_PERMISSIONS[safeRole]?.tabs ?? ['home'];
}

// Funcao para obter permissoes de um papel
export function getPermissions(role: UserRole | undefined) {
  const safeRole = role || 'cabo_eleitoral';
  return ROLE_PERMISSIONS[safeRole] ?? ROLE_PERMISSIONS.cabo_eleitoral;
}
