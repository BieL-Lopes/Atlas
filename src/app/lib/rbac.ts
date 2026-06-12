// Definicao dos 5 papeis do sistema
export type UserRole = 
  | 'lideranca'           // Lideranca - acesso total
  | 'coordenador_geral'   // Coordenador Geral - acesso administrativo
  | 'coordenador_regional'// Coordenador Regional - acesso a regiao
  | 'captador_votos'      // Captador de Votos - cadastro e contatos
  | 'eleitor';            // Eleitor - apenas visualizacao basica

// Tabs disponiveis no sistema
export type Tab = 'home' | 'contacts' | 'agenda' | 'polls' | 'admin' | 'coordination' | 'results' | 'logs' | 'reports';

// Labels amigaveis para os papeis
export const ROLE_LABELS: Record<UserRole, string> = {
  lideranca: 'Lideranca',
  coordenador_geral: 'Coordenador Geral',
  coordenador_regional: 'Coordenador Regional',
  captador_votos: 'Captador de Votos',
  eleitor: 'Eleitor'
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
  lideranca: {
    tabs: ['home', 'contacts', 'agenda', 'polls', 'reports', 'logs', 'admin', 'coordination'],
    canCreateElector: true,
    canDeleteElector: true,
    canExport: true,
    canManagePolls: true,
    canViewReports: true,
    canManageUsers: true,
    canViewLogs: true,
    canImport: true
  },
  coordenador_geral: {
    tabs: ['home', 'contacts', 'agenda', 'polls', 'reports', 'logs', 'coordination'],
    canCreateElector: true,
    canDeleteElector: true,
    canExport: true,
    canManagePolls: true,
    canViewReports: true,
    canManageUsers: false,
    canViewLogs: true,
    canImport: true
  },
  coordenador_regional: {
    tabs: ['home', 'contacts', 'agenda', 'polls', 'reports', 'coordination'],
    canCreateElector: true,
    canDeleteElector: true,
    canExport: true,
    canManagePolls: false,
    canViewReports: true,
    canManageUsers: false,
    canViewLogs: false,
    canImport: false
  },
  captador_votos: {
    tabs: ['home', 'contacts', 'agenda', 'results'],
    canCreateElector: true,
    canDeleteElector: false,
    canExport: false,
    canManagePolls: false,
    canViewReports: false,
    canManageUsers: false,
    canViewLogs: false,
    canImport: false
  },
  eleitor: {
    tabs: ['home', 'agenda'],
    canCreateElector: false,
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
  const safeRole = role || 'eleitor';
  return ROLE_PERMISSIONS[safeRole]?.tabs?.includes(tab) ?? false;
}

// Funcao para obter as tabs permitidas para um papel
export function getAllowedTabs(role: UserRole | undefined): Tab[] {
  const safeRole = role || 'eleitor';
  return ROLE_PERMISSIONS[safeRole]?.tabs ?? ['home'];
}

// Funcao para obter permissoes de um papel
export function getPermissions(role: UserRole | undefined) {
  const safeRole = role || 'eleitor';
  return ROLE_PERMISSIONS[safeRole] ?? ROLE_PERMISSIONS.eleitor;
}
