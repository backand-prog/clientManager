import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient()
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const adminClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const PAID_PLANS = ["pro", "studio"];

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const idOf = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : value?.id ?? null;

// A csomagot az ár `plan` metadata mezőjéből olvassuk (pro | studio).
function planFromSubscription(subscription: Stripe.Subscription): string | null {
  for (const item of subscription.items.data) {
    const plan = item.price.metadata?.plan;
    if (plan && PAID_PLANS.includes(plan)) return plan;
  }
  const fallback = subscription.metadata?.plan;
  return fallback && PAID_PLANS.includes(fallback) ? fallback : null;
}

// Újabb API verziókban a periódus vége az elemeken van, régebbiben az előfizetésen.
function periodEndIso(subscription: Stripe.Subscription): string | null {
  const legacy = (subscription as unknown as { current_period_end?: number }).current_period_end;
  const seconds = legacy ?? (subscription.items.data[0] as unknown as { current_period_end?: number })?.current_period_end;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

type Match = { userId: string } | { subscriptionId: string };

async function applySubscription(match: Match, customerId: string | null, subscription: Stripe.Subscription) {
  const plan = planFromSubscription(subscription);
  if (!plan) throw new Error(`Az előfizetéshez (${subscription.id}) nem található érvényes plan metadata.`);

  const values = {
    plan,
    status: "active",
    current_period_end: periodEndIso(subscription),
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    updated_at: new Date().toISOString()
  };

  if ("userId" in match) {
    const { error } = await adminClient
      .from("subscriptions")
      .upsert({ user_id: match.userId, ...values }, { onConflict: "user_id" });
    if (error) throw error;
    return;
  }

  const { data, error } = await adminClient
    .from("subscriptions")
    .update(values)
    .eq("stripe_subscription_id", match.subscriptionId)
    .select("user_id");
  if (error) throw error;
  // A checkout.session.completed még nem biztos, hogy lefutott: 500 -> a Stripe újrapróbálja.
  if (!data?.length) throw new Error(`Nincs felhasználó a(z) ${match.subscriptionId} előfizetéshez.`);
}

type CustomerDetails = { name: string; email: string };

// Szimulált számlázó API-hívás. Később cserélhető Billingo / Számlázz.hu hívásra.
async function mockCreateInvoice(customerDetails: CustomerDetails, amount: number, plan: string, currency = "huf") {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const invoiceNumber = `MOCK-${Date.now()}`;
  console.log(
    `Mock számla kiállítva: ${customerDetails.name} (${customerDetails.email}), Csomag: ${plan}, Összeg: ${amount} ${currency.toUpperCase()}, Számlaszám: ${invoiceNumber}`
  );
  return { invoiceNumber };
}

// A Stripe a legtöbb pénznemnél a legkisebb egységben (pl. fillér) adja meg az összeget.
const ZERO_DECIMAL_CURRENCIES = ["jpy", "krw", "vnd", "clp", "pyg", "xaf", "xof"];
function majorUnits(amount: number, currency: string) {
  return ZERO_DECIMAL_CURRENCIES.includes(currency.toLowerCase()) ? amount : amount / 100;
}

async function issueMockInvoice(userId: string, session: Stripe.Checkout.Session, plan: string) {
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;

  // Az e-mail-cím nem a profiles táblában, hanem az auth.users-ben található.
  const { data: authData, error: authError } = await adminClient.auth.admin.getUserById(userId);
  if (authError) throw authError;

  const customerDetails = {
    name: profile?.full_name ?? session.customer_details?.name ?? "Ismeretlen vevő",
    email: authData.user?.email ?? session.customer_details?.email ?? ""
  };
  const currency = session.currency ?? "huf";
  await mockCreateInvoice(customerDetails, majorUnits(session.amount_total ?? 0, currency), plan, currency);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return;
  const userId = session.client_reference_id ?? session.metadata?.user_id;
  const subscriptionId = idOf(session.subscription);
  if (!userId || !subscriptionId) throw new Error("A checkout session-ből hiányzik a user_id vagy az előfizetés.");

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await applySubscription({ userId }, idOf(session.customer), subscription);

  // A számlázás hibája nem okozhat 500-at: a Stripe újrapróbálná, és az előfizetés már rögzítve van.
  try {
    await issueMockInvoice(userId, session, planFromSubscription(subscription) ?? "ismeretlen");
  } catch (error) {
    console.error(`Számlakiállítás sikertelen (${session.id}):`, error);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const legacy = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
  const nested = (invoice as unknown as {
    parent?: { subscription_details?: { subscription?: string | { id: string } | null } } | null;
  }).parent?.subscription_details?.subscription;
  const subscriptionId = idOf(legacy) ?? idOf(nested);
  if (!subscriptionId) return; // nem előfizetéses számla

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await applySubscription({ subscriptionId }, idOf(invoice.customer), subscription);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  const signature = req.headers.get("stripe-signature");
  if (!signature) return respond({ error: "Hiányzó stripe-signature fejléc." }, 400);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (error) {
    return respond({ error: `Érvénytelen aláírás: ${(error as Error).message}` }, 400);
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "invoice.payment_succeeded") {
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
    }
  } catch (error) {
    console.error(`Webhook hiba (${event.type}, ${event.id}):`, error);
    return respond({ error: "Az esemény feldolgozása sikertelen." }, 500);
  }

  return respond({ received: true });
});
