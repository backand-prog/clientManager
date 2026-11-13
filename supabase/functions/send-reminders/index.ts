import { createClient } from "npm:@supabase/supabase-js@2";

type Item = { time: string; title: string; minutes?: number; coach?: string; client?: string; group?: boolean };
type Digest = { user_id: string; email: string; full_name: string; kind: "client_upcoming" | "trainer_unmarked"; items: Item[] };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const budapestToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(new Date());

function buildEmail(digest: Digest, appUrl: string) {
  const name = escapeHtml(digest.full_name.split(" ")[0] || "");
  const isClient = digest.kind === "client_upcoming";
  const settingsUrl = `${appUrl}/#/${isClient ? "client" : "coach"}/settings`;
  const rows = digest.items.map((item) => {
    const detail = isClient
      ? `${escapeHtml(item.title)}${item.group ? " (csoportos)" : ""}${item.coach ? ` · ${escapeHtml(item.coach)}` : ""}${item.minutes ? ` · ${escapeHtml(item.minutes)} perc` : ""}`
      : `${escapeHtml(item.client)} · ${escapeHtml(item.title)}`;
    return `<li style="margin:0 0 6px"><strong>${escapeHtml(item.time)}</strong> – ${detail}</li>`;
  }).join("");
  const intro = isClient
    ? "Holnapra ezek az edzéseid vannak beütemezve:"
    : "Tegnapi edzéseid közül ezeket még nem jelölted meg teljesítettként vagy elmaradtként. Ez nem kötelező, de segít a pontos nyilvántartásban:";
  const cta = isClient ? "Megnyitás a BackPlanben" : "Edzések lezárása a BackPlanben";
  const link = `${appUrl}/#/${isClient ? "client/workouts" : "coach/calendar"}`;
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;color:#14263a;max-width:560px;margin:auto;line-height:1.5">
<h2 style="color:#1f9e8c;margin:0 0 12px">BackPlan</h2>
<p>Szia ${name}!</p><p>${intro}</p><ul style="padding-left:18px">${rows}</ul>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#1f9e8c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${cta}</a></p>
<p style="font-size:12px;color:#566676;margin-top:24px">Ezt az emlékeztetőt azért kapod, mert be van kapcsolva az e-mailes emlékeztető. Kikapcsolhatod a <a href="${escapeHtml(settingsUrl)}">Beállítások</a> oldalon.</p></div>`;
  const subject = isClient ? "Holnapi edzésed – BackPlan" : `${digest.items.length} lezáratlan edzés – BackPlan`;
  return { subject, html };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = Deno.env.get("CRON_SECRET") ?? "";
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (!secret || !timingSafeEqual(secret, provided)) return json({ error: "Unauthorized" }, 401);

  const appUrl = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, "");
  const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("REMINDER_FROM") ?? "";
  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun === true;
  if (!appUrl || (!dryRun && (!resendKey || !from))) return json({ error: "APP_URL, RESEND_API_KEY és REMINDER_FROM szükséges." }, 500);

  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const today = typeof body?.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : budapestToday();
  const { data, error } = await admin.rpc("reminder_digest", { today_value: today });
  if (error) {
    console.error("reminder_digest hiba:", error);
    return json({ error: "A lekérdezés sikertelen." }, 500);
  }

  const digests = (data ?? []) as Digest[];
  if (dryRun) return json({ today, count: digests.length, recipients: digests.map((d) => ({ kind: d.kind, items: d.items.length })) });

  let sent = 0;
  let failed = 0;
  for (const digest of digests) {
    const { subject, html } = buildEmail(digest, appUrl);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [digest.email], subject, html })
      });
      if (!response.ok) throw new Error(`Resend ${response.status}`);
      await admin.from("reminder_email_log").insert({ user_id: digest.user_id, kind: digest.kind, sent_on: today });
      sent++;
    } catch (sendError) {
      console.error("Emlékeztető küldési hiba:", sendError);
      failed++;
    }
  }
  return json({ today, sent, failed });
});
