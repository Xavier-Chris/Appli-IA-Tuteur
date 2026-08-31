// Remplace l'appel direct du navigateur à api.anthropic.com : la clé Claude
// reste ici, jamais côté client. Sert les 4 usages IA de l'appli (réponse du
// tuteur, correction, recherche de mot, traduction), qui envoient tous le
// même { systemPrompt, messages, model }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Seuls ces deux alias sont acceptés depuis le client : un élève ne peut
// jamais forcer un modèle plus cher que ce qui est prévu pour chaque usage.
const MODELS: Record<string, string> = {
  main: "claude-sonnet-5",
  fast: "claude-haiku-4-5-20251001",
};
const MAX_TOKENS = 2000;

Deno.serve(async (req) => {
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

  try {
    const { systemPrompt, messages, model } = await req.json();
    const claudeModel = MODELS[model] || MODELS.main;

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
