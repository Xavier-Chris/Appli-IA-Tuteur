// Panneau admin en libre-service (aucune interface de code) : Xavier colle
// l'email d'un élève et son nouveau statut dans l'appli, cette fonction fait
// la mise à jour. Réservée à son propre compte (ADMIN_EMAIL, à définir dans
// les secrets Supabase) : n'importe qui d'autre reçoit un refus.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_PLANS = ["trial", "student", "active"];

Deno.serve(async (req) => {
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

    const { error: updateError } = await admin.from("profiles").update({ plan }).eq("user_id", targetUserId);
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
