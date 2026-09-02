// Remplace l'appel direct du navigateur à api.anthropic.com : la clé Claude
// reste ici, jamais côté client. Sert les 4 usages IA de l'appli (réponse du
// tuteur, correction, recherche de mot, traduction), qui envoient tous le
// même { systemPrompt, messages, model }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Restreint aux origines connues (l'appli en prod + le serveur de test
// local) plutôt qu'à "*" : un site tiers ne peut plus lire la réponse de
// cette fonction depuis le navigateur d'un élève. Ne protège pas la
// fonction elle-même (déjà gardée par la vérification de session
// ci-dessous), juste une couche de défense en plus avant l'ouverture au
// public.
const ALLOWED_ORIGINS = [
  "https://tutor-app-ai.xavier-web.workers.dev",
  "http://localhost:5500",
];
function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// Seuls ces deux alias sont acceptés depuis le client : un élève ne peut
// jamais forcer un modèle plus cher que ce qui est prévu pour chaque usage.
const MODELS: Record<string, string> = {
  main: "claude-sonnet-5",
  fast: "claude-haiku-4-5-20251001",
};
const MAX_TOKENS = 2000;
const TRIAL_DAILY_LIMIT_SECONDS = 600;
// Un incrément de temps aberrant (bug client, onglet resté ouvert des
// heures sans message) ne doit jamais faire sauter tout le quota du jour
// d'un coup : plafonné à 2 minutes par message, largement au-dessus du
// temps réel entre deux tours de conversation.
const MAX_ELAPSED_PER_CALL_SECONDS = 120;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") || "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Non connecté" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Client à privilèges élevés (clé service_role, contourne RLS) : nécessaire
  // pour lire/écrire profiles et usage_daily, qu'un élève ne peut jamais
  // modifier lui-même par sécurité (voir la migration SQL).
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { systemPrompt, messages, model, elapsedSeconds } = await req.json();
    const claudeModel = MODELS[model] || MODELS.main;

    const { data: profile } = await admin.from("profiles").select("plan").eq("user_id", user.id).maybeSingle();
    const plan = profile?.plan || "trial";

    if (plan === "trial") {
      const today = new Date().toISOString().slice(0, 10);
      const { data: usageRow } = await admin.from("usage_daily")
        .select("seconds_used").eq("user_id", user.id).eq("day", today).maybeSingle();
      const usedSoFar = usageRow?.seconds_used || 0;

      if (usedSoFar >= TRIAL_DAILY_LIMIT_SECONDS) {
        return new Response(JSON.stringify({ error: "TRIAL_LIMIT_REACHED" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const increment = Math.max(0, Math.min(Number(elapsedSeconds) || 0, MAX_ELAPSED_PER_CALL_SECONDS));
      if (increment > 0) {
        await admin.from("usage_daily")
          .upsert({ user_id: user.id, day: today, seconds_used: usedSoFar + increment });
      }
    }

    // Cache de prompt Anthropic : même logique que côté client à l'origine,
    // seul le dernier message est marqué "ephemeral".
    const cachedMessages = (messages || []).map(
      (m: { role: string; content: string }, i: number, arr: unknown[]) => ({
        role: m.role,
        content: [{
          type: "text",
          text: m.content,
          ...(i === arr.length - 1 ? { cache_control: { type: "ephemeral" } } : {}),
        }],
      }),
    );

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: claudeModel,
        max_tokens: MAX_TOKENS,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: cachedMessages,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return new Response(JSON.stringify({ error: `Claude ${res.status}: ${detail}` }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await res.json();
    // Le premier bloc de "content" n'est pas toujours le texte (il peut y
    // avoir un bloc de réflexion avant) : on cherche le bloc de type "text".
    const textBlock = (json.content || []).find((b: { type: string }) => b.type === "text");
    return new Response(JSON.stringify({ text: textBlock?.text || "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
