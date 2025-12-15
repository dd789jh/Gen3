// Supabase Edge Function: chat-bot-scheduler
// Randomly posts a "persona" message into public.chat_messages (room_id = 'global')
//
// Deploy:
//   supabase functions deploy chat-bot-scheduler
//
// Optional auth:
//   Set CRON_SECRET and call with header: x-cron-secret: <CRON_SECRET>

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Persona = {
  id: number; // negative telegram_id
  name: string;
  avatar?: string; // optional (only used if your table has avatar_url / avatar column)
};

const PERSONAS: Persona[] = [
  { id: -101, name: 'Alex_K' },
  { id: -102, name: 'SoccerKing' },
  { id: -103, name: 'OddsWatcher' },
  { id: -104, name: 'LineMover' },
  { id: -105, name: 'WhaleRadar' },
  { id: -106, name: 'GoalMachine' },
  { id: -107, name: 'ValueHunt' },
  { id: -108, name: 'SharpTalk' },
  { id: -109, name: 'EPL_Insider' },
  { id: -110, name: 'CornerCount' },
  { id: -111, name: 'UnderdogFan' },
  { id: -112, name: 'LiveTrader' },
  { id: -113, name: 'BetBuilder' },
  { id: -114, name: 'HDP_Master' },
  { id: -115, name: 'OU_Specialist' },
];

const MESSAGES: string[] = [
  'What a save!',
  'Odds are dropping fast… someone knows something.',
  'Who is following the big bet?',
  'Man City looks tired in the last 10 minutes.',
  'That line move is wild — watch the second half.',
  'Feels like a late goal is coming.',
  'Market is screaming Over.',
  'Ref is losing control of this game.',
  'Big volume just hit the book.',
  'HDP is the play here, not 1X2.',
  'Watch the corners — tempo is rising.',
  'Underdog looks sharp today, not gonna lie.',
  'Liquidity spike — keep an eye on live odds.',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }, 500);
  }

  // Optional: protect from public abuse
  if (CRON_SECRET) {
    const got = req.headers.get('x-cron-secret') ?? '';
    if (got !== CRON_SECRET) return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  // Optional payload:
  // { "room_id": "global", "send_probability": 0.6 }
  // room_id is forced to 'global' per requirement
  let sendProbability = 1;
  try {
    const body = (await req.json().catch(() => ({}))) as any;
    const p = Number(body?.send_probability);
    if (Number.isFinite(p) && p >= 0 && p <= 1) sendProbability = p;
  } catch {
    // ignore
  }

  if (Math.random() > sendProbability) {
    return json({ ok: true, skipped: true });
  }

  const persona = pickRandom(PERSONAS);
  const message = pickRandom(MESSAGES);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await sb
    .from('chat_messages')
    .insert({
      room_id: 'global',
      telegram_id: persona.id,
      username: persona.name,
      content: message,
    })
    .select('id')
    .single();

  if (error) return json({ ok: false, error: error.message }, 500);

  return json({
    ok: true,
    inserted_id: (data as any)?.id ?? null,
    persona: { id: persona.id, name: persona.name },
    content: message,
    room_id: 'global',
  });
});


