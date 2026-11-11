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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Bejelentkezés szükséges." }, 401);

  // Az átirányítás fix, szerveroldalon beállított alkalmazás-címre történik.
  const appUrl = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, "");
  if (!appUrl) return json({ error: "Az APP_URL nincs beállítva." }, 500);

  const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: subscription, error: subscriptionError } = await adminClient
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (subscriptionError) return json({ error: "Az előfizetés nem olvasható." }, 500);
  if (!subscription?.stripe_customer_id) return json({ error: "Még nincs fizetős előfizetésed." }, 404);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/#/coach/subscription`
    });
    return json({ url: session.url });
  } catch (error) {
    console.error("Portal session hiba:", error);
    return json({ error: "Az ügyfélportál megnyitása sikertelen." }, 500);
  }
});
