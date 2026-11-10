import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient()
});

// Árak: a Stripe Dashboardon létrehozott price_... azonosítók secretként.
const prices: Record<string, string | undefined> = {
  pro: Deno.env.get("STRIPE_PRICE_PRO"),
  studio: Deno.env.get("STRIPE_PRICE_STUDIO")
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Bejelentkezés szükséges." }, 401);
  const user = authData.user;

  let body: { plan?: string };
  try { body = await req.json(); } catch { return json({ error: "Érvénytelen kérés." }, 400); }

  const plan = body.plan ?? "";
  const priceId = prices[plan];
  if (!priceId) return json({ error: "Ismeretlen vagy nem elérhető csomag." }, 400);

  // Az átirányítás fix, szerveroldalon beállított alkalmazás-címre történik.
  const appUrl = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, "");
  if (!appUrl) return json({ error: "Az APP_URL nincs beállítva." }, 500);

  const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  const { data: profile, error: profileError } = await adminClient
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError) return json({ error: "A profil nem olvasható." }, 500);
  if (profile?.role !== "trainer") return json({ error: "Csak edzők fizethetnek elő." }, 403);

  const { data: subscription, error: subscriptionError } = await adminClient
    .from("subscriptions")
    .select("plan, status, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (subscriptionError) return json({ error: "Az előfizetés nem olvasható." }, 500);

  const isLive = ["active", "trialing"].includes(subscription?.status ?? "");
  if (isLive && subscription?.plan === plan) return json({ error: "Ez a csomag már aktív." }, 409);
  // Aktív fizetős előfizetés mellé nem indítunk másodikat (dupla terhelés).
  if (isLive && subscription?.plan !== "free") {
    return json({ error: "Aktív előfizetésed van; a csomagváltást a Stripe ügyfélportálon végezheted." }, 409);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      ...(subscription?.stripe_customer_id
        ? { customer: subscription.stripe_customer_id }
        : { customer_email: user.email }),
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
      success_url: `${appUrl}/#/coach/subscription`,
      cancel_url: `${appUrl}/#/coach/subscription`
    });
    return json({ url: session.url });
  } catch (error) {
    console.error("Checkout session hiba:", error);
    return json({ error: "A fizetési oldal létrehozása sikertelen." }, 500);
  }
});
