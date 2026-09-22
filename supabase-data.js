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
    const { data: authData } = await client.auth.getUser();
    const user = authData?.user;
    if (!user) return null;
    const [profilesResult, assignmentsResult, workoutsResult] = await Promise.all([
      client.from("profiles").select("*").order("created_at"),
      client.from("client_trainers").select("client_id, trainer_id"),
      client.from("workouts").select("*").order("workout_date", { ascending: false })
    ]);
    if (profilesResult.error) throw profilesResult.error;
    if (assignmentsResult.error) throw assignmentsResult.error;
    if (workoutsResult.error) throw workoutsResult.error;
    const assignments = assignmentsResult.data || [];
    const workouts = workoutsResult.data || [];
    return {
      sessionId: user.id,
      users: (profilesResult.data || []).map((profile) => {
        const ownWorkouts = workouts.filter((workout) => workout.client_id === profile.id).map(mapWorkout);
        return {
          id: profile.id,
          role: profile.role,
          name: profile.full_name,
          email: profile.id === user.id ? user.email : "",
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
      activities: []
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
      options: { emailRedirectTo: window.location.href, data: { full_name: values.name, role: values.role, specialty: values.specialty || null, goal: values.goal || null } }
    });
    if (result.error) throw result.error;
    return result.data.user;
  }

  async function updateProfile(user) {
    if (!enabled) return;
    const result = await client.from("profiles").update({ full_name: user.name, specialty: user.specialty || null, goal: user.goal || null, status: user.status, adherence: user.adherence || 0, notes: user.notes || null }).eq("id", user.id);
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
    const result = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
    if (result.error) throw result.error;
  }

  async function updatePassword(password) {
    if (!enabled) return null;
    const result = await client.auth.updateUser({ password });
    if (result.error) throw result.error;
  }

  window.remoteStore = { enabled, load, signIn, signUp, updateProfile, updateAssignments, saveWorkout, signOut, accountAdmin, requestPasswordReset, updatePassword };
})();
