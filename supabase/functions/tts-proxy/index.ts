// Relaie la synthèse vocale Azure : l'appli construit le SSML exactement
// comme avant (styles, humeur, débit du Parisien snob...) et l'envoie ici
// au lieu d'appeler Azure directement. La clé Azure reste côté serveur.
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
    const { ssml } = await req.json();
    const region = Deno.env.get("AZURE_SPEECH_REGION")!;

    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": Deno.env.get("AZURE_SPEECH_KEY")!,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm",
      },
      body: ssml,
    });

    if (!res.ok) {
      const detail = await res.text();
      return new Response(JSON.stringify({ error: `Azure TTS ${res.status}: ${detail}` }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // "application/octet-stream" (et pas "audio/mpeg") est nécessaire ici :
    // c'est le seul type que le client Supabase JS reconnaît comme binaire
    // et lit avec .blob() plutôt que de le traiter (et corrompre) comme du
    // texte. L'appli redonne le bon type MIME audio une fois reçu.
    return new Response(res.body, {
      headers: { ...corsHeaders, "Content-Type": "application/octet-stream" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
