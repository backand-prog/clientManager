import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Hiányzó hitelesítés." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Érvénytelen munkamenet." }, 401);
    const { data: caller } = await adminClient.from("profiles").select("role").eq("id", authData.user.id).single();
    const body = await request.json();

    if (body.action === "delete-self") {
      const result = await adminClient.auth.admin.deleteUser(authData.user.id);
      if (result.error) return json({ error: result.error.message }, 400);
      return json({ ok: true });
    }
    if (caller?.role !== "admin") return json({ error: "Ehhez admin jogosultság szükséges." }, 403);

    if (body.action === "create-trainer") {
      const result = await adminClient.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: false,
        user_metadata: { full_name: body.name, role: "trainer", specialty: body.specialty || null }
      });
      if (result.error) return json({ error: result.error.message }, 400);
      return json({ ok: true, userId: result.data.user.id });
    }
    if (body.action === "delete-user") {
      const result = await adminClient.auth.admin.deleteUser(body.userId);
      if (result.error) return json({ error: result.error.message }, 400);
      return json({ ok: true });
    }
    return json({ error: "Ismeretlen művelet." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Ismeretlen szerverhiba." }, 500);
  }
});
