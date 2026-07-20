import { describe, it, expect } from 'vitest';
import {
  canAccessTab,
  getAllowedTabs,
  getPermissions,
  ROLE_LABELS,
  type UserRole,
  type Tab,
} from '../rbac';

// ─── ROLE_LABELS ──────────────────────────────────────────────────────────────

describe('ROLE_LABELS', () => {
  it('cobre todos os 5 papéis', () => {
    const roles: UserRole[] = [
      'candidato',
      'coordenador',
      'lideranca',
      'colaborador',
      'cabo_eleitoral',
    ];
    roles.forEach(role => {
      expect(ROLE_LABELS[role]).toBeTruthy();
    });
  });
});

// ─── canAccessTab ─────────────────────────────────────────────────────────────

describe('canAccessTab', () => {
  it('candidato acessa todas as tabs', () => {
    const allTabs: Tab[] = ['home', 'contacts', 'agenda', 'polls', 'admin', 'coordination', 'results', 'logs', 'reports'];
    allTabs.forEach(tab => {
      expect(canAccessTab('candidato', tab)).toBe(true);
    });
  });

  it('cabo_eleitoral acessa home, contacts e results', () => {
    expect(canAccessTab('cabo_eleitoral', 'home')).toBe(true);
    expect(canAccessTab('cabo_eleitoral', 'contacts')).toBe(true);
    expect(canAccessTab('cabo_eleitoral', 'results')).toBe(true);
    expect(canAccessTab('cabo_eleitoral', 'admin')).toBe(false);
    expect(canAccessTab('cabo_eleitoral', 'coordination')).toBe(false);
    expect(canAccessTab('cabo_eleitoral', 'polls')).toBe(false);
  });

  it('lideranca e colaborador não acessam admin nem coordination', () => {
    expect(canAccessTab('lideranca', 'home')).toBe(true);
    expect(canAccessTab('lideranca', 'admin')).toBe(false);
    expect(canAccessTab('lideranca', 'coordination')).toBe(false);

    expect(canAccessTab('colaborador', 'home')).toBe(true);
    expect(canAccessTab('colaborador', 'admin')).toBe(false);
    expect(canAccessTab('colaborador', 'coordination')).toBe(false);
  });

  it('coordenador não acessa admin nem logs', () => {
    expect(canAccessTab('coordenador', 'admin')).toBe(false);
    expect(canAccessTab('coordenador', 'logs')).toBe(false);
    expect(canAccessTab('coordenador', 'coordination')).toBe(true);
    expect(canAccessTab('coordenador', 'reports')).toBe(true);
  });

  it('role undefined usa cabo_eleitoral como fallback', () => {
    expect(canAccessTab(undefined, 'admin')).toBe(false);
    expect(canAccessTab(undefined, 'home')).toBe(true);
  });
});

// ─── getAllowedTabs ────────────────────────────────────────────────────────────

describe('getAllowedTabs', () => {
  it('candidato recebe 9 tabs', () => {
    expect(getAllowedTabs('candidato')).toHaveLength(9);
  });

  it('coordenador recebe 7 tabs', () => {
    expect(getAllowedTabs('coordenador')).toHaveLength(7);
  });

  it('cabo_eleitoral recebe 3 tabs', () => {
    expect(getAllowedTabs('cabo_eleitoral')).toEqual(['home', 'contacts', 'results']);
  });

  it('undefined retorna ao menos home', () => {
    const tabs = getAllowedTabs(undefined);
    expect(tabs).toContain('home');
  });
});

// ─── getPermissions ───────────────────────────────────────────────────────────

describe('getPermissions — candidato', () => {
  const perms = getPermissions('candidato');

  it('pode criar, deletar e exportar', () => {
    expect(perms.canCreateElector).toBe(true);
    expect(perms.canDeleteElector).toBe(true);
    expect(perms.canExport).toBe(true);
  });

  it('pode gerenciar usuários e relatórios', () => {
    expect(perms.canManageUsers).toBe(true);
    expect(perms.canViewReports).toBe(true);
    expect(perms.canManagePolls).toBe(true);
  });
});

describe('getPermissions — coordenador', () => {
  const perms = getPermissions('coordenador');

  it('pode gerenciar tudo menos usuários e logs', () => {
    expect(perms.canCreateElector).toBe(true);
    expect(perms.canDeleteElector).toBe(true);
    expect(perms.canManagePolls).toBe(true);
    expect(perms.canManageUsers).toBe(false);
    expect(perms.canViewLogs).toBe(false);
  });
});

describe('getPermissions — lideranca / colaborador / cabo_eleitoral', () => {
  it('pode criar mas não deletar nem exportar', () => {
    ['lideranca', 'colaborador', 'cabo_eleitoral'].forEach(role => {
      const perms = getPermissions(role as UserRole);
      expect(perms.canCreateElector).toBe(true);
      expect(perms.canDeleteElector).toBe(false);
      expect(perms.canExport).toBe(false);
      expect(perms.canManageUsers).toBe(false);
      expect(perms.canViewReports).toBe(false);
    });
  });
});
