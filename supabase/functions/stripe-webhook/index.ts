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

const PAID_PLANS = ["pro", "premium"];

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const idOf = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : value?.id ?? null;

const normalizePlan = (plan?: string) => (plan === "studio" ? "premium" : plan);

// A csomagot az ár `plan` metadata mezőjéből olvassuk (pro | premium; a régi "studio" érték premiumként értelmeződik).
function planFromSubscription(subscription: Stripe.Subscription): string | null {
  for (const item of subscription.items.data) {
    const plan = normalizePlan(item.price.metadata?.plan);
    if (plan && PAID_PLANS.includes(plan)) return plan;
  }
  const fallback = normalizePlan(subscription.metadata?.plan);
  return fallback && PAID_PLANS.includes(fallback) ? fallback : null;
}

// Újabb API verziókban a periódus vége az elemeken van, régebbiben az előfizetésen.
function periodEndIso(subscription: Stripe.Subscription): string | null {
  const legacy = (subscription as unknown as { current_period_end?: number }).current_period_end;
  const seconds = legacy ?? (subscription.items.data[0] as unknown as { current_period_end?: number })?.current_period_end;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

type Match = { userId: string } | { subscriptionId: string };
type LocalStatus = "active" | "trialing" | "past_due" | "canceled";

// A Stripe státuszainak leképezése a subscriptions tábla státuszaira (null: nincs teendő).
function localStatus(status: Stripe.Subscription.Status): LocalStatus | null {
  switch (status) {
    case "active": return "active";
    case "trialing": return "trialing";
    case "past_due":
    case "unpaid":
    case "paused": return "past_due";
    case "canceled":
    case "incomplete_expired": return "canceled";
    default: return null; // incomplete: az első fizetés még nem sikerült
  }
}

// Visszaadja a frissített felhasználó azonosítóját (null, ha nem történt módosítás).
async function applySubscription(
  match: Match,
  customerId: string | null,
  subscription: Stripe.Subscription,
  options: { ignoreUnmatched?: boolean } = {}
): Promise<string | null> {
  const status = localStatus(subscription.status);
  if (!status) return null;

  // Lemondott előfizetésnél a csomag visszaáll 'free'-re.
  const plan = status === "canceled" ? "free" : planFromSubscription(subscription);
  if (!plan) throw new Error(`Az előfizetéshez (${subscription.id}) nem található érvényes plan metadata.`);

  const values = {
    plan,
    status,
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
    return match.userId;
  }

  const { data, error } = await adminClient
    .from("subscriptions")
    .update(values)
    .eq("stripe_subscription_id", match.subscriptionId)
    .select("user_id");
  if (error) throw error;
  if (!data?.length) {
    // Régi (már lecserélt) előfizetés eseménye: nincs mit frissíteni, az újrapróbálás sem segítene.
    if (options.ignoreUnmatched) {
      console.warn(`Nincs sor a(z) ${match.subscriptionId} előfizetéshez, az esemény kihagyva.`);
      return null;
    }
    // A checkout.session.completed még nem biztos, hogy lefutott: 500 -> a Stripe újrapróbálja.
    throw new Error(`Nincs felhasználó a(z) ${match.subscriptionId} előfizetéshez.`);
  }
  return data[0].user_id;
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

type Billing = { name?: string | null; email?: string | null; amountMinor: number; currency: string };

async function issueMockInvoice(userId: string, billing: Billing, plan: string) {
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
    name: profile?.full_name ?? billing.name ?? "Ismeretlen vevő",
    email: authData.user?.email ?? billing.email ?? ""
  };
  await mockCreateInvoice(customerDetails, majorUnits(billing.amountMinor, billing.currency), plan, billing.currency);
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
    await issueMockInvoice(
      userId,
      {
        name: session.customer_details?.name,
        email: session.customer_details?.email,
        amountMinor: session.amount_total ?? 0,
        currency: session.currency ?? "huf"
      },
      planFromSubscription(subscription) ?? "ismeretlen"
    );
  } catch (error) {
    console.error(`Számlakiállítás sikertelen (${session.id}):`, error);
  }
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
  const nested = (invoice as unknown as {
    parent?: { subscription_details?: { subscription?: string | { id: string } | null } } | null;
  }).parent?.subscription_details?.subscription;
  return idOf(legacy) ?? idOf(nested);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return; // nem előfizetéses számla

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = await applySubscription({ subscriptionId }, idOf(invoice.customer), subscription);

  // Az első számlát a checkout.session.completed kezeli, itt csak a megújulásokat.
  if (!userId || invoice.billing_reason !== "subscription_cycle") return;
  try {
    await issueMockInvoice(
      userId,
      {
        name: invoice.customer_name,
        email: invoice.customer_email,
        amountMinor: invoice.amount_paid,
        currency: invoice.currency
      },
      planFromSubscription(subscription) ?? "ismeretlen"
    );
  } catch (error) {
    console.error(`Számlakiállítás sikertelen (${invoice.id}):`, error);
  }
}

// Csomagváltás, lemondás (customer.subscription.deleted: status = canceled) és státuszváltozás.
async function handleSubscriptionChanged(subscription: Stripe.Subscription) {
  await applySubscription(
    { subscriptionId: subscription.id },
    idOf(subscription.customer),
    subscription,
    { ignoreUnmatched: true }
  );
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  // A csomag marad, csak a státusz változik; a Stripe újrapróbálkozásai után a subscription.updated/deleted dönt.
  const { error } = await adminClient
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscriptionId);
  if (error) throw error;
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
    } else if (event.type === "invoice.payment_failed") {
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
    } else if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await handleSubscriptionChanged(event.data.object as Stripe.Subscription);
    }
  } catch (error) {
    console.error(`Webhook hiba (${event.type}, ${event.id}):`, error);
    return respond({ error: "Az esemény feldolgozása sikertelen." }, 500);
  }

  return respond({ received: true });
});
