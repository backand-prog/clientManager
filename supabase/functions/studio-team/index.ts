import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Bejelentkezés szükséges." }, 401);
    const leaderId = authData.user.id;

    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Csak aktív Studio csomagú, nem beosztott edző kezelheti a csapatot.
    const { data: leader, error: leaderError } = await adminClient
      .from("profiles")
      .select("role, parent_studio_id")
      .eq("id", leaderId)
      .maybeSingle();
    if (leaderError) return json({ error: "A profil nem olvasható." }, 500);
    const { data: subscription, error: subscriptionError } = await adminClient
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", leaderId)
      .maybeSingle();
    if (subscriptionError) return json({ error: "Az előfizetés nem olvasható." }, 500);
    const isStudioLeader = leader?.role === "trainer"
      && !leader.parent_studio_id
      && subscription?.plan === "studio"
      && ["active", "trialing"].includes(subscription.status);
    if (!isStudioLeader) return json({ error: "Ehhez aktív Studio csomag szükséges." }, 403);

    const body = await req.json().catch(() => ({}));

    if (body.action === "list") {
      const { data: members, error } = await adminClient
        .from("profiles")
        .select("id, full_name, specialty, created_at")
        .eq("parent_studio_id", leaderId)
        .order("created_at", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      const team = await Promise.all((members || []).map(async (member) => {
        const { data, error: userError } = await adminClient.auth.admin.getUserById(member.id);
        if (userError) throw userError;
        return {
          id: member.id,
          name: member.full_name,
          specialty: member.specialty || "",
          createdAt: member.created_at,
          email: data.user?.email || "",
          accepted: Boolean(data.user?.last_sign_in_at)
        };
      }));
      return json({ team });
    }

    if (body.action === "invite") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!EMAIL_PATTERN.test(email) || email.length > 254) return json({ error: "Érvénytelen e-mail-cím." }, 400);
      if (name.length < 1 || name.length > 120) return json({ error: "A név 1 és 120 karakter közötti legyen." }, 400);

      const appUrl = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, "");
      const invite = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: name },
        ...(appUrl ? { redirectTo: appUrl } : {})
      });
      if (invite.error || !invite.data.user) {
        return json({ error: invite.error?.message ?? "A meghívás sikertelen." }, 400);
      }

      const { error: profileError } = await adminClient
        .from("profiles")
        .update({ role: "trainer", parent_studio_id: leaderId })
        .eq("id", invite.data.user.id);
      if (profileError) {
        const rollback = await adminClient.auth.admin.deleteUser(invite.data.user.id);
        if (rollback.error) console.error("Nem sikerült visszavonni a meghívott felhasználót.", rollback.error);
        return json({ error: "Az al-edző profilja nem állítható be." }, 500);
      }
      return json({ ok: true, userId: invite.data.user.id });
    }

    return json({ error: "Ismeretlen művelet." }, 400);
  } catch (error) {
    console.error("studio-team hiba:", error);
    return json({ error: "Ismeretlen szerverhiba." }, 500);
  }
});
