// Panneau admin en libre-service (aucune interface de code) : Xavier colle
// l'email d'un élève et son nouveau statut dans l'appli, cette fonction fait
// la mise à jour. Réservée à son propre compte (ADMIN_EMAIL, à définir dans
// les secrets Supabase) : n'importe qui d'autre reçoit un refus.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Restreint aux origines connues (l'appli en prod + le serveur de test
// local) plutôt qu'à "*" : un site tiers ne peut plus lire la réponse de
// cette fonction depuis le navigateur d'un élève. Ne remplace pas la vraie
// protection (vérification d'ADMIN_EMAIL ci-dessous), c'est une couche de
// défense en plus.
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

const VALID_PLANS = ["trial", "student", "active"];

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
  const adminEmail = (Deno.env.get("ADMIN_EMAIL") || "").toLowerCase();
  if (!user || !adminEmail || user.email?.toLowerCase() !== adminEmail) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { email, plan } = await req.json();
    if (!VALID_PLANS.includes(plan)) {
      return new Response(JSON.stringify({ error: "Statut invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: targetUserId, error: lookupError } = await admin.rpc("get_user_id_by_email", {
      lookup_email: String(email || "").trim(),
    });
    if (lookupError || !targetUserId) {
      return new Response(JSON.stringify({ error: "Aucun compte trouvé avec cet email" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await admin.from("profiles").upsert({ user_id: targetUserId, plan });
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
