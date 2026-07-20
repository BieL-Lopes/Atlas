import { supabase, isSupabaseConfigured } from './supabase';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'IMPORT' | 'LOGIN';

interface AuditParams {
  userId: string;
  userName: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

/**
 * Registra uma ação na trilha de auditoria (LGPD).
 * Fire-and-forget: não bloqueia a UI nem lança erros.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    await supabase.from('audit_logs').insert({
      user_id: params.userId,
      user_name: params.userName,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId ?? null,
      details: params.details ?? {},
    });
  } catch {
    // Silencioso — logs de auditoria não devem bloquear operações
    console.warn('[AuditService] Falha ao registrar log de auditoria');
  }
}

/**
 * Busca logs de auditoria paginados (apenas candidato via RLS).
 */
export async function fetchAuditLogs(params: {
  page: number;
  pageSize: number;
  actionFilter?: AuditAction;
  entityFilter?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ data: AuditLogEntry[]; count: number }> {
  if (!isSupabaseConfigured || !supabase) return { data: [], count: 0 };

  const { page, pageSize, actionFilter, entityFilter, startDate, endDate } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('audit_logs')
    .select('id, user_id, user_name, action, entity, entity_id, details, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (actionFilter) query = query.eq('action', actionFilter);
  if (entityFilter) query = query.eq('entity', entityFilter);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate + 'T23:59:59.999Z');

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0 };

  return {
    data: (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      userId: row.user_id as string,
      userName: row.user_name as string,
      action: row.action as AuditAction,
      entity: row.entity as string,
      entityId: row.entity_id as string | null,
      details: row.details as Record<string, unknown>,
      createdAt: row.created_at as string,
    })),
    count: count ?? 0,
  };
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}
