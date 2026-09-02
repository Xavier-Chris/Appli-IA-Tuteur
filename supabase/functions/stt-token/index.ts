// Fournit un jeton Azure temporaire (10 minutes) pour la reconnaissance
// vocale, qui garde une connexion ouverte pendant que l'élève parle et ne
// peut donc pas passer par un simple relais requête par requête comme
// ai-chat ou tts-proxy. La clé Azure reste côté serveur ; seul ce jeton,
// qui expire vite, part vers le navigateur.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Restreint aux origines connues (l'appli en prod + le serveur de test
// local) plutôt qu'à "*" : un site tiers ne peut plus lire la réponse de
// cette fonction depuis le navigateur d'un élève.
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

  try {
    const region = Deno.env.get("AZURE_SPEECH_REGION")!;
    const res = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": Deno.env.get("AZURE_SPEECH_KEY")! },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Azure STT token ${res.status}` }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await res.text();
    return new Response(JSON.stringify({ token, region }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
