import { client, enabled } from "./supabaseClient.js";

export { enabled };

function mapWorkout(workout) {
  return {
    id: workout.id,
    date: workout.workout_date,
    time: workout.workout_time?.slice(0, 5) || "",
    type: workout.workout_type,
    duration: workout.duration_minutes,
    status: workout.status,
    trainerId: workout.trainer_id || "",
    notes: workout.notes || "",
    trainingPlanDayId: workout.training_plan_day_id || ""
  };
}

function mapGroupWorkout(workout) {
  return {
    id: workout.id,
    trainerId: workout.trainer_id,
    trainerName: workout.trainer_name,
    title: workout.title,
    description: workout.description || "",
    startsAt: workout.starts_at,
    duration: workout.duration_minutes,
    capacity: workout.capacity,
    participantCount: Number(workout.participant_count) || 0,
    participantNames: Array.isArray(workout.participant_names) ? workout.participant_names : [],
    isRegistered: Boolean(workout.is_registered),
    isWaitlisted: Boolean(workout.is_waitlisted),
    waitlistCount: Number(workout.waitlist_count) || 0,
    location: workout.location || "",
    cancelledAt: workout.cancelled_at
  };
}

function mapPlanDay(day) {
  return {
    id: day.id,
    title: day.title,
    notes: day.notes || "",
    exercises: (day.training_plan_exercises || [])
      .sort((a, b) => a.position - b.position)
      .map((exercise) => ({
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.rest_seconds,
        notes: exercise.notes || ""
      }))
  };
}

function mapTrainingPlan(plan) {
  return {
    id: plan.id,
    trainerId: plan.trainer_id,
    trainerName: plan.trainer_name || "",
    title: plan.title,
    description: plan.description || "",
    isPublic: Boolean(plan.is_public),
    clientIds: (plan.training_plan_clients || []).map((assignment) => assignment.client_id),
    updatedAt: plan.updated_at,
    days: (plan.training_plan_days || []).filter((day) => !day.archived_at).sort((a, b) => a.day_number - b.day_number).map(mapPlanDay),
    archivedDays: (plan.training_plan_days || []).filter((day) => day.archived_at).map(mapPlanDay)
  };
}

let reminderCheckedOn = "";

export async function load() {
  if (!enabled) return null;
  const { data: authData, error } = await client.auth.getUser();
  if (error?.name === "AuthSessionMissingError") return null;
  if (error) throw error;
  const user = authData?.user;
  if (!user) return null;
  const reminderKey = `${user.id}:${new Date().toDateString()}`;
  let reminderCount = 0;
  if (reminderCheckedOn !== reminderKey) {
    reminderCheckedOn = reminderKey;
    const reminder = await client.rpc("create_workout_status_reminder");
    if (!reminder.error) reminderCount = Number(reminder.data) || 0;
  }
  const [profilesResult, assignmentsResult, workoutsResult, requestsResult, notificationsResult, coachProfilesResult, groupWorkoutsResult, trainingPlansResult, subscriptionResult, directoryResult] = await Promise.all([
    client.from("profiles").select("*").order("created_at"),
    client.from("client_trainers").select("client_id, trainer_id"),
    client.from("workouts").select("*").order("workout_date", { ascending: false }),
    client.from("connection_requests").select("*").order("created_at", { ascending: false }),
    client.from("connection_notifications").select("*").order("created_at", { ascending: false }).limit(30),
    client.from("coach_public_profiles").select("*").order("updated_at", { ascending: false }),
    client.rpc("get_group_workouts"),
    client.from("training_plans")
      .select("*, training_plan_clients(client_id), training_plan_days(*, training_plan_exercises(*))")
      .order("updated_at", { ascending: false }),
    client.from("subscriptions").select("plan, status, current_period_end").eq("user_id", user.id).maybeSingle(),
    client.rpc("get_client_trainer_directory")
  ]);
  if (directoryResult.error) throw directoryResult.error;
  if (profilesResult.error) throw profilesResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;
  if (workoutsResult.error) throw workoutsResult.error;
  if (requestsResult.error) throw requestsResult.error;
  if (notificationsResult.error) throw notificationsResult.error;
  if (coachProfilesResult.error) throw coachProfilesResult.error;
  if (groupWorkoutsResult.error) throw groupWorkoutsResult.error;
  if (trainingPlansResult.error) throw trainingPlansResult.error;
  if (subscriptionResult.error) throw subscriptionResult.error;
  const assignments = assignmentsResult.data || [];
  const workouts = workoutsResult.data || [];
  const profiles = profilesResult.data || [];
  const currentProfile = profiles.find((profile) => profile.id === user.id);
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
      shortBio: profile.short_bio || "",
      phone: profile.phone || "",
      contactEmail: profile.contact_email || "",
      location: profile.location || "",
      availability: profile.availability || "",
      photos: (signedResult.data || []).map((photo) => ({ path: photo.path, url: photo.signedUrl }))
    };
  }));
  return {
    sessionId: user.id,
    trainerDirectory: (directoryResult.data || []).map((row) => ({ clientId: row.client_id, trainerId: row.trainer_id, name: row.trainer_name })),
    subscription: {
      plan: subscriptionResult.data?.plan || "free",
      status: subscriptionResult.data?.status || "active",
      currentPeriodEnd: subscriptionResult.data?.current_period_end || null
    },
    users: profiles.map((profile) => {
      const ownWorkouts = workouts.filter((workout) => workout.client_id === profile.id).map(mapWorkout);
      return {
        id: profile.id,
        role: profile.role,
        trainerApplicationStatus: profile.trainer_application_status || "none",
        name: profile.full_name,
        email: profile.id === user.id ? user.email : "",
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
    groupWorkouts: (groupWorkoutsResult.data || []).map(mapGroupWorkout),
    trainingPlans: (trainingPlansResult.data || []).map((plan) => mapTrainingPlan({
      ...plan,
      trainer_name: profiles.find((profile) => profile.id === plan.trainer_id)?.full_name
        || (coachProfilesResult.data || []).find((profile) => profile.id === plan.trainer_id)?.display_name
        || ""
    })),
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
    coachProfiles,
    workoutReminderCount: reminderCount
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

export async function exportMyData() {
  if (!enabled) throw new Error("A Supabase-kapcsolat nem érhető el.");
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  const user = authData.user;
  if (!user) throw new Error("A fiókadatok letöltéséhez jelentkezz be.");

  const [profileResult, workouts, connections, connectionRequests, notifications, coachProfileResult, trainingPlansResult] = await Promise.all([
    client.from("profiles").select("*").eq("id", user.id).single(),
    selectAllRows(() => client.from("workouts").select("*").eq("client_id", user.id).order("workout_date", { ascending: false })),
    selectAllRows(() => client.from("client_trainers").select("client_id, trainer_id").or(`client_id.eq.${user.id},trainer_id.eq.${user.id}`)),
    selectAllRows(() => client.from("connection_requests").select("*").or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at", { ascending: false })),
    selectAllRows(() => client.from("connection_notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false })),
    client.from("coach_public_profiles").select("*").eq("id", user.id).maybeSingle(),
    client.from("training_plans")
      .select("*, training_plan_clients(client_id), training_plan_days(*, training_plan_exercises(*))")
      .eq("trainer_id", user.id)
      .order("updated_at", { ascending: false })
  ]);
  for (const result of [profileResult, coachProfileResult, trainingPlansResult]) {
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
    coachProfile: coachProfileResult.data || null,
    trainingPlans: (trainingPlansResult.data || []).map(mapTrainingPlan)
  };
}

export async function updateProfile(user) {
  if (!enabled) return;
  const result = await client.from("profiles").update({ full_name: user.name, specialty: user.specialty || null, goal: user.goal || null, status: user.status, adherence: user.adherence || 0, notes: user.notes || null }).eq("id", user.id);
  if (result.error) throw result.error;
}

export async function updateAssignments(clientId, trainerIds) {
  if (!enabled) return;
  const remove = await client.from("client_trainers").delete().eq("client_id", clientId);
  if (remove.error) throw remove.error;
  if (trainerIds.length) {
    const add = await client.from("client_trainers").insert(trainerIds.map((trainerId) => ({ client_id: clientId, trainer_id: trainerId })));
    if (add.error) throw add.error;
  }
}

export async function saveWorkout(clientId, workout, workoutId) {
  if (!enabled) return;
  const payload = { client_id: clientId, trainer_id: workout.trainerId || null, training_plan_day_id: workout.trainingPlanDayId || null, workout_date: workout.date, workout_time: workout.time, workout_type: workout.type, duration_minutes: workout.duration, status: workout.status, notes: workout.notes || null };
  const result = workoutId ? await client.from("workouts").update(payload).eq("id", workoutId) : await client.from("workouts").insert(payload);
  if (result.error) throw result.error;
}

export async function createGroupWorkout(workout) {
  if (!enabled) return;
  const result = await client.rpc("create_group_workout", {
    workout_title: workout.title,
    workout_description: workout.description || "",
    workout_starts_at: workout.startsAt,
    workout_duration_minutes: workout.duration,
    workout_capacity: workout.capacity,
    workout_location: workout.location || null
  });
  if (result.error) throw result.error;
}

export async function saveTrainingPlan(plan) {
  if (!enabled) return null;
  const { data: planId, error } = await client.rpc("save_training_plan", { plan_payload: plan });
  if (error) throw error;
  return planId;
}

export async function deleteTrainingPlan(planId) {
  if (!enabled) return;
  const { error } = await client.rpc("delete_training_plan", { plan_id: planId });
  if (error) throw error;
}

export async function updateGroupWorkout(workoutId, workout) {
  if (!enabled) return;
  const result = await client.rpc("update_group_workout", {
    workout_id: workoutId,
    workout_title: workout.title,
    workout_description: workout.description || "",
    workout_starts_at: workout.startsAt,
    workout_duration_minutes: workout.duration,
    workout_capacity: workout.capacity,
    workout_location: workout.location || null
  });
  if (result.error) throw result.error;
}

export async function joinGroupWorkout(workoutId) {
  if (!enabled) return;
  const result = await client.rpc("join_group_workout", { workout_id: workoutId });
  if (result.error) throw result.error;
}

export async function leaveGroupWorkout(workoutId) {
  if (!enabled) return;
  const result = await client.rpc("leave_group_workout", { workout_id: workoutId });
  if (result.error) throw result.error;
}

export async function cancelGroupWorkout(workoutId) {
  if (!enabled) return;
  const result = await client.rpc("cancel_group_workout", { workout_id: workoutId });
  if (result.error) throw result.error;
}

export async function createConnectionRequest(email) {
  if (!enabled) return;
  const result = await client.rpc("create_connection_request", { target_email: email });
  if (result.error) throw result.error;
}

export async function respondConnectionRequest(requestId, decision) {
  if (!enabled) return;
  const result = await client.rpc("respond_connection_request", { request_id: requestId, decision });
  if (result.error) throw result.error;
}

export async function markConnectionNotificationsRead() {
  if (!enabled) return;
  const result = await client.rpc("mark_connection_notifications_read");
  if (result.error) throw result.error;
}

export async function createCoachConnectionRequest(coachId) {
  if (!enabled) return;
  const result = await client.rpc("create_connection_request_by_id", { target_user_id: coachId });
  if (result.error) throw result.error;
}

export async function saveCoachProfile(specialty, bio, photoPaths, extras = {}) {
  if (!enabled) return;
  const result = await client.rpc("save_coach_profile", {
    profile_specialty: specialty,
    profile_bio: bio,
    profile_photo_paths: photoPaths,
    profile_phone: extras.phone || "",
    profile_contact_email: extras.contactEmail || "",
    profile_location: extras.location || "",
    profile_availability: extras.availability || "",
    profile_short_bio: extras.shortBio || ""
  });
  if (result.error) throw result.error;
}

export async function uploadCoachPhoto(file) {
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

export async function deleteCoachPhotos(paths) {
  if (!enabled) return;
  if (!paths.length) return;
  const result = await client.storage.from("coach-profile-images").remove(paths);
  if (result.error) throw result.error;
}

export async function accountAdmin(body) {
  if (!enabled) return null;
  const result = await client.functions.invoke("account-admin", { body });
  if (result.error) throw result.error;
  if (result.data?.error) throw new Error(result.data.error);
  return result.data;
}

export async function listAdminAccounts() {
  if (!enabled) return [];
  const result = await accountAdmin({ action: "list-admin-accounts" });
  return result.accounts || [];
}

export async function startCheckout(plan) {
  if (!enabled) throw new Error("Az online fizetés csak csatlakoztatott módban érhető el.");
  const result = await client.functions.invoke("create-checkout-session", { body: { plan } });
  if (result.error) {
    // A függvény hibaüzenete a válasz törzsében érkezik.
    const detail = await result.error.context?.json?.().catch(() => null);
    throw new Error(detail?.error || result.error.message);
  }
  if (result.data?.error) throw new Error(result.data.error);
  if (!result.data?.url) throw new Error("Nem érkezett fizetési hivatkozás.");
  return result.data.url;
}

export async function openCustomerPortal() {
  if (!enabled) throw new Error("Az előfizetés-kezelés csak csatlakoztatott módban érhető el.");
  const result = await client.functions.invoke("create-portal-session");
  if (result.error) {
    const detail = await result.error.context?.json?.().catch(() => null);
    throw new Error(detail?.error || result.error.message);
  }
  if (result.data?.error) throw new Error(result.data.error);
  if (!result.data?.url) throw new Error("Nem érkezett ügyfélportál-hivatkozás.");
  window.location.assign(result.data.url);
}

export async function listTrainerAccounts() {
  if (!enabled) return [];
  const result = await accountAdmin({ action: "list-trainer-accounts" });
  return result.accounts || [];
}
export async function listSubscriptions() {
  if (!enabled) return [];
  const result = await accountAdmin({ action: "list-subscriptions" });
  return result.subscriptions || [];
}
