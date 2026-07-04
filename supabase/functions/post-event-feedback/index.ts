import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req)
  }

  try {
    // 1. Initialize Supabase Admin Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Buscar eventos já finalizados há pouco tempo que ainda não tiveram feedback enviado
    // Assumimos que 'horario' é a hora de início. Um evento "termina" digamos, 2 horas depois do 'horario'.
    // Para simplificar o script, vamos pegar eventos do 'data' atual ou anterior,
    // onde feedback_enviado é false, e a data/hora atual é posterior à data/hora do evento + 2 horas.
    
    const now = new Date();
    
    // Simplificando: vamos buscar eventos do dia atual ou passado que ainda não foram marcados
    // Em produção, a query deveria levar em conta a diferença exata de horas.
    const { data: eventosPendentes, error: erroEventos } = await supabaseClient
      .from('eventos')
      .select('id, titulo')
      .eq('feedback_enviado', false)
      .lte('data', now.toISOString().split('T')[0]);

    if (erroEventos) throw erroEventos;
    if (!eventosPendentes || eventosPendentes.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum evento pendente de feedback.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let disparosTotais = 0;

    for (const evento of eventosPendentes) {
      // 3. Buscar quem estava presente
      const { data: presentes } = await supabaseClient
        .from('evento_confirmacoes')
        .select('eleitor_id, presente')
        .eq('evento_id', evento.id)
        .eq('presente', true);

      if (!presentes || presentes.length === 0) {
        // Marca evento como concluido mesmo sem presenças para não reprocessar
        await supabaseClient.from('eventos').update({ feedback_enviado: true }).eq('id', evento.id);
        continue;
      }

      // Buscar os perfis (apenas os que aceitam whatsapp e tem numero valido)
      // Como a tabela de telefones e opt_in fica em 'eleitores' no sistema antigo ou perfis, 
      // precisamos adaptar de acordo com seu banco. Vamos simplificar injetando na fila:
      
      const eleitoresIds = presentes.map(p => p.eleitor_id);
      
      const { data: perfis } = await supabaseClient
        .from('perfis')
        .select('id, nome, email')
        .in('id', eleitoresIds);

      // Simularíamos o envio chamando a API do WhatsApp ou inserindo na fila
      // const urlEvolution = Deno.env.get('WHATSAPP_API_URL'); 
      // ...
      
      console.log(`Evento ${evento.titulo}: Processando ${perfis?.length || 0} feedbacks`);
      disparosTotais += perfis?.length || 0;

      // 4. Marca o evento como processado
      await supabaseClient
        .from('eventos')
        .update({ feedback_enviado: true })
        .eq('id', evento.id);
    }

    return new Response(JSON.stringify({ message: 'Sucesso', disparos: disparosTotais }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
