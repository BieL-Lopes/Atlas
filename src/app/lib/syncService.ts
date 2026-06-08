import { supabase, isSupabaseConfigured } from './supabase';
import { db } from './db';
import type { ElectorData } from '../components/CaptureForm';

const LAST_SYNC_KEY = 'atlas_last_sync';

/** Limpa o timestamp de sincronia — use no login para forçar pull completo. */
export function resetLastSync() {
  localStorage.removeItem(LAST_SYNC_KEY);
}

// ─────────────────────────────────────────────
// Mappers camelCase (frontend) ↔ snake_case (Supabase)
// ─────────────────────────────────────────────

function toRow(e: ElectorData): Record<string, unknown> {
  return {
    id: e.id,
    nome: e.nome,
    whatsapp: e.whatsapp,
    email: e.email ?? null,
    titulo_eleitor: e.tituloEleitor,
    data_nascimento: e.dataNascimento,
    bairro: e.bairro,
    cidade: e.cidade,
    nivel_voto: e.nivelVoto,
    nivel_engajamento: e.nivelEngajamento,
    nichos: e.nichos,
    gps_latitude: e.gpsLatitude ?? null,
    gps_longitude: e.gpsLongitude ?? null,
    aceita_whatsapp: e.aceitaWhatsapp,
    observacoes: e.observacoes,
    regiao: e.regiao ?? null,
    atendimentos: e.atendimentos,
    criado_por: e.createdBy || null,
    criado_por_nome: e.createdByName ?? null,
    data_cadastro: e.dataCadastro,
  };
}

function fromRow(row: Record<string, unknown>): ElectorData {
  return {
    id: row.id as string,
    nome: row.nome as string,
    whatsapp: (row.whatsapp as string) ?? '',
    email: (row.email as string) ?? '',
    tituloEleitor: (row.titulo_eleitor as string) ?? '',
    dataNascimento: (row.data_nascimento as string) ?? '',
    bairro: (row.bairro as string) ?? '',
    cidade: (row.cidade as string) ?? '',
    nivelVoto: (row.nivel_voto as ElectorData['nivelVoto']) ?? 'medio',
    nivelEngajamento: (row.nivel_engajamento as ElectorData['nivelEngajamento']) ?? 'eleitor_comum',
    nichos: (row.nichos as string[]) ?? [],
    gpsLatitude: row.gps_latitude as number | undefined,
    gpsLongitude: row.gps_longitude as number | undefined,
    aceitaWhatsapp: (row.aceita_whatsapp as boolean) ?? true,
    observacoes: (row.observacoes as string) ?? '',
    dataCadastro: row.data_cadastro as string,
    atendimentos: (row.atendimentos as ElectorData['atendimentos']) ?? [],
    createdBy: (row.criado_por as string) ?? '',
    createdByName: (row.criado_por_nome as string) ?? '',
    regiao: row.regiao as string | undefined,
    updatedAt: row.atualizado_em as string | undefined,
  };
}

// ─────────────────────────────────────────────
// Push: envia mudanças locais pendentes para o Supabase
// ─────────────────────────────────────────────

/**
 * Envia todas as mudanças pendentes (Dexie pendingChanges) para o Supabase.
 * Usa last-write-wins por entityId: se houver múltiplas operações para o mesmo
 * eleitor, apenas a mais recente é enviada.
 * Retorna o número de registros enviados com sucesso.
 */
export async function pushPendingChanges(): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 0;

  const pending = await db.pendingChanges.toArray();
  if (pending.length === 0) return 0;

  // Last-write-wins: mantém apenas a operação mais recente por entityId
  const byId = new Map<string, typeof pending[0]>();
  for (const change of pending) {
    const existing = byId.get(change.entityId);
    if (!existing || change.timestamp > existing.timestamp) {
      byId.set(change.entityId, change);
    }
  }

  const failed: string[] = [];
  for (const [id, change] of byId) {
    try {
      if (change.operation === 'create' || change.operation === 'update') {
        const { error } = await supabase.from('eleitores').upsert(toRow(change.payload!));
        if (error) throw error;
      } else if (change.operation === 'delete') {
        const { error } = await supabase.from('eleitores').delete().eq('id', id);
        if (error) throw error;
      }
    } catch {
      failed.push(id);
    }
  }

  if (failed.length === 0) {
    await db.pendingChanges.clear();
    return byId.size;
  }

  // Remove apenas os bem-sucedidos
  const failedSet = new Set(failed);
  const successIds = [...byId.keys()].filter(id => !failedSet.has(id));
  for (const id of successIds) {
    await db.pendingChanges.where('entityId').equals(id).delete();
  }
  return successIds.length;
}

// ─────────────────────────────────────────────
// Pull: busca mudanças do servidor e mescla localmente
// ─────────────────────────────────────────────

/**
 * Busca eleitores atualizados no Supabase desde a última sincronização.
 * Aplica conflito last-write-wins: mantém o registro mais recente entre local e remoto.
 * Retorna o número de registros mesclados.
 */
export async function pullChanges(): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 0;

  // Se o banco local está vazio, ignora lastSync e faz pull completo
  const localCount = await db.electors.count();
  const lastSync = localCount === 0
    ? '1970-01-01T00:00:00.000Z'
    : (localStorage.getItem(LAST_SYNC_KEY) ?? '1970-01-01T00:00:00.000Z');

  const { data, error } = await supabase
    .from('eleitores')
    .select('*')
    .gt('atualizado_em', lastSync);

  if (error || !data) return 0;

  let mergedCount = 0;
  for (const row of data) {
    const remote = fromRow(row as Record<string, unknown>);
    const local = await db.electors.get(remote.id);

    // Conflict resolution: mantém o mais recente (updatedAt ou dataCadastro como fallback)
    const localTime = local?.updatedAt ?? local?.dataCadastro ?? '1970-01-01T00:00:00.000Z';
    const remoteTime = remote.updatedAt ?? remote.dataCadastro;

    if (!local || remoteTime >= localTime) {
      await db.electors.put(remote);
      mergedCount++;
    }
  }

  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  return mergedCount;
}

// ─────────────────────────────────────────────
// syncAll: push → pull (push primeiro para evitar sobrescrita)
// ─────────────────────────────────────────────

export async function syncAll(): Promise<{ pushed: number; pulled: number }> {
  const pushed = await pushPendingChanges();
  const pulled = await pullChanges();
  return { pushed, pulled };
}
