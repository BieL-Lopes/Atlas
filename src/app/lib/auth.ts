import { UserRole, ROLE_LABELS } from './rbac';
import { supabase, isSupabaseConfigured } from './supabase';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  regiao?: string;
  deputadoId?: string;
  coordenadorRegionalId?: string;
  codigoConvite?: string;
}


export function getUserLabel(user: User): string {
  const roleLabel = ROLE_LABELS[user.role];
  return user.regiao
    ? `${user.name} — ${roleLabel} / ${user.regiao}`
    : `${user.name} — ${roleLabel}`;
}

/**
 * Autentica via Supabase Auth.
 * Aceita e-mail direto ou CPF (com ou sem formatação) — neste caso,
 * busca o e-mail real via RPC segura antes de autenticar.
 */
export async function authenticate(login: string, password: string): Promise<User | null> {
  if (isSupabaseConfigured && supabase) {
    let email: string;

    if (login.includes('@')) {
      email = login.trim();
    } else {
      // CPF → busca o e-mail real via função SECURITY DEFINER (bypassa RLS)
      const { data: foundEmail, error: rpcError } = await supabase
        .rpc('get_email_by_cpf', { cpf_input: login.replace(/\D/g, '') });
      if (rpcError || !foundEmail) return null;
      email = foundEmail as string;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      const { data: profile } = await supabase
        .from('perfis')
        .select('id, nome, role, regiao, deputado_id, coordenador_regional_id, codigo_convite')
        .eq('id', data.user.id)
        .single();
      if (profile) {
        return {
          id: data.user.id,
          name: profile.nome as string,
          role: profile.role as UserRole,
          regiao: (profile.regiao as string) ?? undefined,
          deputadoId: (profile.deputado_id as string) ?? undefined,
          coordenadorRegionalId: (profile.coordenador_regional_id as string) ?? undefined,
          codigoConvite: (profile.codigo_convite as string) ?? undefined,
        };
      }
    }
  }

  return null;
}

/** Encerra a sessão globalmente (invalida TODAS as sessões ativas). */
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // scope: 'global' revoga o refresh token em todas as sessões do usuário
    await supabase.auth.signOut({ scope: 'global' });
  }
  // Limpa todos os dados de sessão
  localStorage.removeItem('atlas_user');
  localStorage.removeItem('atlas_last_sync');
  try { sessionStorage.clear(); } catch { /* silencioso */ }
}
