// Reçoit les notifications de Stripe (paiement réussi, abonnement annulé...)
// et met à jour le statut de l'élève en conséquence. Appelée directement
// par Stripe, pas par l'appli : pas de jeton de connexion Supabase ici,
// l'authenticité de l'appel est vérifiée par la signature Stripe à la
// place. IMPORTANT au déploiement : désactiver "Enforce JWT Verification"
// pour cette fonction précise (les 3 autres le gardent activé), sinon
// Supabase rejette l'appel de Stripe avant même d'atteindre ce code.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (err) {
    return new Response(`Signature Stripe invalide : ${err}`, { status: 400 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    switch (event.type) {
      // Premier paiement réussi : active l'abonnement. client_reference_id
      // (ajouté par l'appli au moment du clic sur "S'abonner") dit à quel
      // compte Supabase ce paiement correspond ; on enregistre à cette
      // occasion l'identifiant client Stripe, réutilisé ensuite pour les
      // évènements de renouvellement/annulation ci-dessous.
      case "checkout.session.completed": {
        const session = event.data.object as {
          customer: string; subscription: string; client_reference_id: string | null;
        };
        if (session.client_reference_id) {
          await admin.from("profiles")
            .update({ plan: "active", stripe_customer_id: session.customer, stripe_subscription_id: session.subscription })
            .eq("user_id", session.client_reference_id);
        }
        break;
      }
      // Renouvellement, échec de paiement, ou annulation : on suit le
      // statut réel donné par Stripe plutôt que de le déduire nous-mêmes.
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as { customer: string; status: string };
        const isActive = subscription.status === "active" || subscription.status === "trialing";
        await admin.from("profiles")
          .update({ plan: isActive ? "active" : "trial" })
          .eq("stripe_customer_id", subscription.customer);
        break;
      }
      default:
        break;
    }
    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
