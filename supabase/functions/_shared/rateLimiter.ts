/**
 * Rate Limiter server-side para Edge Functions do Supabase.
 * Usa a tabela `rate_limits` no PostgreSQL para tracking persistente.
 */

// @ts-nocheck — Deno Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Verifica rate limit para uma chave (ex: IP, userId, etc.).
 * Retorna true se o request DEVE SER BLOQUEADO (rate limit excedido).
 *
 * @param key - Identificador único (ex: `whatsapp:${userId}`, `login:${ip}`)
 * @param maxAttempts - Número máximo de tentativas permitidas na janela
 * @param windowSeconds - Tamanho da janela em segundos
 */
export async function isRateLimited(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceKey) return false; // Fail open se não configurado

  const admin = createClient(supabaseUrl, serviceKey);
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  try {
    // Limpa entradas expiradas para esta chave
    await admin
      .from('rate_limits')
      .delete()
      .eq('key', key)
      .lt('window_start', windowStart.toISOString());

    // Conta tentativas na janela atual
    const { count } = await admin
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gte('window_start', windowStart.toISOString());

    if ((count ?? 0) >= maxAttempts) {
      return true; // BLOQUEADO
    }

    // Registra nova tentativa
    await admin
      .from('rate_limits')
      .insert({ key, window_start: now.toISOString() });

    return false; // PERMITIDO
  } catch (err) {
    console.error('[RateLimiter] Erro ao verificar rate limit:', err);
    return false; // Fail open
  }
}
