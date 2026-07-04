// @ts-nocheck — Deno Edge Function (executa no Supabase, não no Node.js)
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { isRateLimited } from '../_shared/rateLimiter.ts';

const EVOLUTION_API_URL      = Deno.env.get('EVOLUTION_API_URL') ?? '';
const EVOLUTION_API_KEY      = Deno.env.get('EVOLUTION_API_KEY') ?? '';
const EVOLUTION_INSTANCE     = Deno.env.get('EVOLUTION_INSTANCE') ?? '';
const SUPABASE_URL           = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    return new Response(
      JSON.stringify({ error: 'Evolution API não configurada. Defina EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE nos secrets do Supabase.' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    const { disparo_id, mensagem, numeros } = await req.json();

    if (!disparo_id || !mensagem || !Array.isArray(numeros) || numeros.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros inválidos: disparo_id, mensagem e numeros são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit: máx 10 disparos por hora por remetente
    const rateLimitKey = `whatsapp:${disparo_id}`;
    if (await isRateLimited(rateLimitKey, 10, 3600)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit excedido. Aguarde antes de enviar novos disparos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Marcar disparo como 'enviando'
    await admin
      .from('disparos_whatsapp')
      .update({ status: 'enviando' })
      .eq('id', disparo_id);

    let sent = 0;
    let failed = 0;

    for (const numero of numeros) {
      // Normalizar número: remover tudo que não é dígito e garantir DDI 55 (Brasil)
      const digits = numero.replace(/\D/g, '');
      const normalized = digits.startsWith('55') ? digits : `55${digits}`;

      try {
        const res = await fetch(
          `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY,
            },
            body: JSON.stringify({ number: normalized, text: mensagem }),
          }
        );

        if (res.ok) {
          sent++;
        } else {
          const errBody = await res.text().catch(() => '');
          console.error(`Falha ao enviar para ${normalized}: HTTP ${res.status} — ${errBody}`);
          failed++;
        }
      } catch (err) {
        console.error(`Erro de rede ao enviar para ${normalized}:`, err);
        failed++;
      }

      // Delay de 500ms entre envios para evitar bloqueio da conta
      await delay(500);
    }

    // Atualizar contadores e status final
    const status = failed === numeros.length ? 'erro' : 'concluido';
    await admin
      .from('disparos_whatsapp')
      .update({ status, total_enviados: sent, total_falhas: failed })
      .eq('id', disparo_id);

    return new Response(
      JSON.stringify({ sent, failed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erro interno na Edge Function send-whatsapp:', err);

    // Tentar marcar o disparo como erro se tiver o id
    try {
      const body = await req.json().catch(() => ({}));
      if (body.disparo_id) {
        await admin
          .from('disparos_whatsapp')
          .update({ status: 'erro' })
          .eq('id', body.disparo_id);
      }
    } catch (_) { /* silenciar */ }

    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar disparo.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
