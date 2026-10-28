import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function deleteUserAndPhotos(adminClient: ReturnType<typeof createClient>, userId: string) {
  const { data: coachProfile, error: profileError } = await adminClient
    .from("coach_public_profiles")
    .select("photo_paths")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) return profileError;

  const photoPaths = coachProfile?.photo_paths || [];
  if (photoPaths.length) {
    const { error: storageError } = await adminClient.storage.from("coach-profile-images").remove(photoPaths);
    if (storageError) return storageError;
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  return error;
}

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
      const error = await deleteUserAndPhotos(adminClient, authData.user.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }
    if (caller?.role !== "admin") return json({ error: "Ehhez admin jogosultság szükséges." }, 403);

    if (body.action === "list-trainer-applications") {
      const { data: applications, error } = await adminClient
        .from("profiles")
        .select("id, full_name, specialty, created_at")
        .eq("trainer_application_status", "pending")
        .order("created_at", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      const results = await Promise.all((applications || []).map(async (application) => {
        const { data, error: userError } = await adminClient.auth.admin.getUserById(application.id);
        if (userError) throw userError;
        return {
          ...application,
          email: data.user?.email || "",
          emailConfirmed: Boolean(data.user?.email_confirmed_at)
        };
      }));
      return json({ applications: results });
    }

    if (body.action === "decide-trainer-application") {
      if (typeof body.userId !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(body.userId)) {
        return json({ error: "Érvénytelen jelentkező." }, 400);
      }
      if (body.decision !== "approved" && body.decision !== "rejected") {
        return json({ error: "Érvénytelen döntés." }, 400);
      }
      const { data: applicant, error: applicantError } = await adminClient
        .from("profiles")
        .select("id")
        .eq("id", body.userId)
        .eq("role", "client")
        .eq("trainer_application_status", "pending")
        .maybeSingle();
      if (applicantError) return json({ error: applicantError.message }, 500);
      if (!applicant) return json({ error: "A jelentkezés már nem függőben van." }, 409);

      if (body.decision === "approved") {
        const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(body.userId);
        if (userError) return json({ error: userError.message }, 500);
        if (!userData.user?.email_confirmed_at) {
          return json({ error: "Az edzői jogosultság előtt a jelentkezőnek meg kell erősítenie az e-mail-címét." }, 400);
        }
      }

      const updates = body.decision === "approved"
        ? { role: "trainer", trainer_application_status: "approved" }
        : { trainer_application_status: "rejected" };
      const { data: updated, error: updateError } = await adminClient
        .from("profiles")
        .update(updates)
        .eq("id", body.userId)
        .eq("role", "client")
        .eq("trainer_application_status", "pending")
        .select("id")
        .maybeSingle();
      if (updateError) return json({ error: updateError.message }, 500);
      if (!updated) return json({ error: "A jelentkezést egy másik admin már feldolgozta." }, 409);
      return json({ ok: true });
    }

    if (body.action === "create-trainer") {
      const result = await adminClient.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: false,
        user_metadata: { full_name: body.name, role: "trainer", specialty: body.specialty || null }
      });
      if (result.error) return json({ error: result.error.message }, 400);
      const profileResult = await adminClient
        .from("profiles")
        .update({ role: "trainer" })
        .eq("id", result.data.user.id);
      if (profileResult.error) {
        const rollback = await adminClient.auth.admin.deleteUser(result.data.user.id);
        if (rollback.error) console.error("Could not remove trainer after profile setup failed.", rollback.error);
        return json({ error: profileResult.error.message }, 500);
      }
      return json({ ok: true, userId: result.data.user.id });
    }
    if (body.action === "delete-user") {
      const error = await deleteUserAndPhotos(adminClient, body.userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }
    return json({ error: "Ismeretlen művelet." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Ismeretlen szerverhiba." }, 500);
  }
});
