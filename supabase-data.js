(function () {
  const config = window.SUPABASE_CONFIG;
  const enabled = Boolean(window.supabase && config?.url && config?.anonKey && !config.anonKey.includes("IDE_MASOLD"));
  const client = enabled ? window.supabase.createClient(config.url, config.anonKey) : null;

  function mapWorkout(workout) {
    return {
      id: workout.id,
      date: workout.workout_date,
      time: workout.workout_time?.slice(0, 5) || "",
      type: workout.workout_type,
      duration: workout.duration_minutes,
      status: workout.status,
      trainerId: workout.trainer_id || "",
      notes: workout.notes || ""
    };
  }

  async function load() {
    if (!enabled) return null;
    const { data: authData, error } = await client.auth.getUser();
    if (error?.name === "AuthSessionMissingError") return null;
    if (error) throw error;
    const user = authData?.user;
    if (!user) return null;
    const [profilesResult, assignmentsResult, workoutsResult, requestsResult, notificationsResult, coachProfilesResult] = await Promise.all([
      client.from("profiles").select("*").order("created_at"),
      client.from("client_trainers").select("client_id, trainer_id"),
      client.from("workouts").select("*").order("workout_date", { ascending: false }),
      client.from("connection_requests").select("*").order("created_at", { ascending: false }),
      client.from("connection_notifications").select("*").order("created_at", { ascending: false }).limit(30),
      client.from("coach_public_profiles").select("*").order("updated_at", { ascending: false })
    ]);
    if (profilesResult.error) throw profilesResult.error;
    if (assignmentsResult.error) throw assignmentsResult.error;
    if (workoutsResult.error) throw workoutsResult.error;
    if (requestsResult.error) throw requestsResult.error;
    if (notificationsResult.error) throw notificationsResult.error;
    if (coachProfilesResult.error) throw coachProfilesResult.error;
    const assignments = assignmentsResult.data || [];
    const workouts = workoutsResult.data || [];
    const profiles = profilesResult.data || [];
    const currentProfile = profiles.find((profile) => profile.id === user.id);
    const trainerApplications = currentProfile?.role === "admin"
      ? (await accountAdmin({ action: "list-trainer-applications" })).applications || []
      : [];
    const coachProfiles = await Promise.all((coachProfilesResult.data || []).map(async (profile) => {
      const signedResult = profile.photo_paths.length
        ? await client.storage.from("coach-profile-images").createSignedUrls(profile.photo_paths, 3600)
        : { data: [], error: null };
      if (signedResult.error) throw signedResult.error;
      return {
        id: profile.id,
        name: profile.display_name,
        specialty: profile.specialty || "",
        bio: profile.bio || "",
        photos: (signedResult.data || []).map((photo) => ({ path: photo.path, url: photo.signedUrl }))
      };
    }));
    return {
      sessionId: user.id,
      users: profiles.map((profile) => {
        const ownWorkouts = workouts.filter((workout) => workout.client_id === profile.id).map(mapWorkout);
        return {
          id: profile.id,
          role: profile.role,
          trainerApplicationStatus: profile.trainer_application_status || "none",
          name: profile.full_name,
          email: profile.id === user.id ? user.email : trainerApplications.find((application) => application.id === profile.id)?.email || "",
          emailConfirmed: profile.id === user.id ? Boolean(user.email_confirmed_at) : undefined,
          specialty: profile.specialty || "",
          goal: profile.goal || "",
          status: profile.status || "Aktív",
          adherence: profile.adherence || 0,
          notes: profile.notes || "",
          joined: new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short", day: "numeric" }).format(new Date(profile.created_at)),
          sessions: ownWorkouts.filter((workout) => workout.status === "Teljesítve").length,
          trainerIds: assignments.filter((assignment) => assignment.client_id === profile.id).map((assignment) => assignment.trainer_id),
          workouts: ownWorkouts
        };
      }),
      activities: [],
      trainerApplications,
      connectionRequests: (requestsResult.data || []).map((request) => ({
        id: request.id,
        requesterId: request.requester_id,
        recipientId: request.recipient_id,
        requesterName: request.requester_name,
        recipientName: request.recipient_name,
        status: request.status,
        createdAt: request.created_at
      })),
      notifications: (notificationsResult.data || []).map((notification) => ({
        id: notification.id,
        userId: notification.user_id,
        requestId: notification.request_id,
        kind: notification.kind,
        message: notification.message,
        createdAt: notification.created_at,
        readAt: notification.read_at
      })),
      coachProfiles
    };
  }

  async function selectAllRows(createQuery) {
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await createQuery().range(offset, offset + 999);
      if (error) throw error;
      rows.push(...(data || []));
      if ((data || []).length < 1000) return rows;
    }
  }

  async function exportMyData() {
    if (!enabled) throw new Error("A Supabase-kapcsolat nem érhető el.");
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    const user = authData.user;
    if (!user) throw new Error("A fiókadatok letöltéséhez jelentkezz be.");

    const [profileResult, workouts, connections, connectionRequests, notifications, coachProfileResult] = await Promise.all([
      client.from("profiles").select("*").eq("id", user.id).single(),
      selectAllRows(() => client.from("workouts").select("*").eq("client_id", user.id).order("workout_date", { ascending: false })),
      selectAllRows(() => client.from("client_trainers").select("client_id, trainer_id").or(`client_id.eq.${user.id},trainer_id.eq.${user.id}`)),
      selectAllRows(() => client.from("connection_requests").select("*").or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at", { ascending: false })),
      selectAllRows(() => client.from("connection_notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false })),
      client.from("coach_public_profiles").select("*").eq("id", user.id).maybeSingle()
    ]);
    for (const result of [profileResult, coachProfileResult]) {
      if (result.error) throw result.error;
    }

    return {
      exportedAt: new Date().toISOString(),
      account: { email: user.email, createdAt: user.created_at, lastSignInAt: user.last_sign_in_at },
      profile: profileResult.data,
      workouts: workouts.map(mapWorkout),
      connections,
      connectionRequests,
      notifications,
      coachProfile: coachProfileResult.data || null
    };
  }

  async function signIn(email, password) {
    if (!enabled) return null;
    const result = await client.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    return load();
  }

  async function signUp(values) {
    if (!enabled) return null;
    const result = await client.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: values.name, requested_role: values.role === "trainer" ? "trainer" : "client", specialty: values.role === "trainer" ? values.specialty || null : null, goal: values.role === "client" ? values.goal || null : null } }
    });
    if (result.error) throw result.error;
    return result.data.user;
  }

  async function updateProfile(user) {
    if (!enabled) return;
    const result = await client.from("profiles").update({ full_name: user.name, specialty: user.specialty || null, goal: user.goal || null, status: user.status, adherence: user.adherence || 0, notes: user.notes || null }).eq("id", user.id);
    if (result.error) throw result.error;
  }

  async function updateEmail(email) {
    if (!enabled) return;
    const result = await client.auth.updateUser({ email });
    if (result.error) throw result.error;
  }

  async function updateAssignments(clientId, trainerIds) {
    if (!enabled) return;
    const remove = await client.from("client_trainers").delete().eq("client_id", clientId);
    if (remove.error) throw remove.error;
    if (trainerIds.length) {
      const add = await client.from("client_trainers").insert(trainerIds.map((trainerId) => ({ client_id: clientId, trainer_id: trainerId })));
      if (add.error) throw add.error;
    }
  }

  async function saveWorkout(clientId, workout, workoutId) {
    if (!enabled) return;
    const payload = { client_id: clientId, trainer_id: workout.trainerId || null, workout_date: workout.date, workout_time: workout.time, workout_type: workout.type, duration_minutes: workout.duration, status: workout.status, notes: workout.notes || null };
    const result = workoutId ? await client.from("workouts").update(payload).eq("id", workoutId) : await client.from("workouts").insert(payload);
    if (result.error) throw result.error;
  }

  async function createConnectionRequest(email) {
    if (!enabled) return;
    const result = await client.rpc("create_connection_request", { target_email: email });
    if (result.error) throw result.error;
  }

  async function respondConnectionRequest(requestId, decision) {
    if (!enabled) return;
    const result = await client.rpc("respond_connection_request", { request_id: requestId, decision });
    if (result.error) throw result.error;
  }

  async function markConnectionNotificationsRead() {
    if (!enabled) return;
    const result = await client.rpc("mark_connection_notifications_read");
    if (result.error) throw result.error;
  }

  async function createCoachConnectionRequest(coachId) {
    if (!enabled) return;
    const result = await client.rpc("create_connection_request_by_id", { target_user_id: coachId });
    if (result.error) throw result.error;
  }

  async function saveCoachProfile(specialty, bio, photoPaths) {
    if (!enabled) return;
    const result = await client.rpc("save_coach_profile", { profile_specialty: specialty, profile_bio: bio, profile_photo_paths: photoPaths });
    if (result.error) throw result.error;
  }

  async function uploadCoachPhoto(file) {
    if (!enabled) return null;
    const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
    if (!extension || file.size > 5 * 1024 * 1024) throw new Error("Válassz JPG, PNG vagy WebP képet legfeljebb 5 MB méretben.");
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    if (!authData.user) throw new Error("Bejelentkezés szükséges a képfeltöltéshez.");
    const path = `${authData.user.id}/${crypto.randomUUID()}.${extension}`;
    const result = await client.storage.from("coach-profile-images").upload(path, file, { contentType: file.type, upsert: false });
    if (result.error) throw result.error;
    return path;
  }

  async function deleteCoachPhotos(paths) {
    if (!enabled) return;
    if (!paths.length) return;
    const result = await client.storage.from("coach-profile-images").remove(paths);
    if (result.error) throw result.error;
  }

  async function signOut() {
    if (enabled) await client.auth.signOut();
  }

  async function accountAdmin(body) {
    if (!enabled) return null;
    const result = await client.functions.invoke("account-admin", { body });
    if (result.error) throw result.error;
    if (result.data?.error) throw new Error(result.data.error);
    return result.data;
  }

  async function requestPasswordReset(email) {
    if (!enabled) return null;
    const result = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/?password-reset=1` });
    if (result.error) throw result.error;
  }

  function onPasswordRecovery(callback) {
    if (!enabled) return;
    client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") callback();
    });
  }

  async function updatePassword(password) {
    if (!enabled) return null;
    const result = await client.auth.updateUser({ password });
    if (result.error) throw result.error;
  }

  window.remoteStore = { enabled, load, exportMyData, signIn, signUp, updateProfile, updateEmail, updateAssignments, saveWorkout, createConnectionRequest, createCoachConnectionRequest, respondConnectionRequest, markConnectionNotificationsRead, saveCoachProfile, uploadCoachPhoto, deleteCoachPhotos, signOut, accountAdmin, requestPasswordReset, onPasswordRecovery, updatePassword };
})();
