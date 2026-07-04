/**
 * CORS Allowlist compartilhado para Edge Functions do Supabase.
 *
 * ⚠️  CONFIGURE: Substitua os domínios abaixo pelos domínios reais de produção.
 */

const ALLOWED_ORIGINS: string[] = [
  // Produção — TROCAR pelos domínios reais
  'https://atlas.seusite.com.br',
  'https://politiqui.vercel.app',
  // Desenvolvimento local
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

/**
 * Retorna headers CORS validados contra a allowlist.
 * Se a origin do request não está na lista, Access-Control-Allow-Origin NÃO é setado,
 * fazendo o browser bloquear a resposta (CORS policy).
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const baseHeaders: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    baseHeaders['Access-Control-Allow-Origin'] = requestOrigin;
    baseHeaders['Vary'] = 'Origin';
  }

  return baseHeaders;
}

/**
 * Responde preflight OPTIONS com headers CORS.
 */
export function handleCorsOptions(req: Request): Response {
  const origin = req.headers.get('origin');
  return new Response('ok', { headers: getCorsHeaders(origin) });
}
