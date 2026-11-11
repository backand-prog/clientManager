import { currentUser } from "./auth.js";
import {
  data,
  selectedClientId
} from "./state.js";
import { toDateInputValue } from "./utils.js";

const WORKOUT_TYPE_CATALOG = [
  "Személyi edzés", "Súlyzós edzés", "Erőnléti edzés", "Funkcionális edzés",
  "CrossFit", "HIIT", "Kardio", "Futás", "Kerékpározás", "Úszás", "Evezés",
  "Mobilitás és nyújtás", "Jóga", "Pilates", "Rehabilitációs edzés",
  "Küzdősport", "Táncos edzés", "Csoportos óra", "Túrázás", "Egyéb"
];

const EXERCISE_CATALOG = [
  "Guggolás", "Serleg guggolás", "Elölguggolás", "Hátsó guggolás", "Bolgár guggolás",
  "Kitörés előre", "Kitörés hátra", "Sétáló kitörés", "Lábtoló", "Lábnyújtás gépen",
  "Lábhajlítás gépen", "Román felhúzás", "Felhúzás", "Csípőemelés", "Hip thrust",
  "Vádliemelés", "Fekvenyomás", "Fekvenyomás kézisúlyzóval", "Ferdepados nyomás",
  "Fekvőtámasz", "Fekvőtámasz emelt kézzel", "Vállból nyomás", "Arnold-nyomás",
  "Oldalemelés", "Előreemelés", "Evezés rúddal", "Evezés kézisúlyzóval",
  "Evezés csigán", "Lehúzás mellhez", "Húzódzkodás", "Bicepsz hajlítás",
  "Kalapács bicepsz", "Tricepsz letolás csigán", "Tricepsznyújtás fej fölött",
  "Plank", "Oldalsó plank", "Dead bug", "Bird dog", "Hasprés", "Lábemelés",
  "Russian twist", "Pallof press", "Farmer séta", "Kettlebell lendítés",
  "Burpee", "Ugró guggolás", "Helyben futás", "Kerékpározás", "Evezőpad",
  "Futópad", "Csípőmobilizálás", "Macska-tehén", "Mellkasnyitás", "Bokamobilizálás"
];

export function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])); }

export function initials(name) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }

export function trainers() { return data.users.filter((user) => user.role === "trainer"); }

export function trainerName(id) {
  if (!id) return "Egyéni edzés";
  return trainers().find((trainer) => trainer.id === id)?.name
    || (data.trainerDirectory || []).find((row) => row.trainerId === id)?.name
    || "Edző";
}

export function workoutTrainerLabel(workout) {
  return workout.trainerId ? `Edző: ${trainerName(workout.trainerId)}` : "Egyéni edzés (edző nélkül)";
}

// A klienshez rendelt edzők, akik közül az edzés edzője kiválasztható.
export function assignedTrainerOptions(clientId) {
  const seen = new Map();
  (data.trainerDirectory || []).filter((row) => row.clientId === clientId).forEach((row) => seen.set(row.trainerId, row.name));
  const client = data.users.find((user) => user.id === clientId);
  (client?.trainerIds || []).forEach((id) => { if (!seen.has(id)) seen.set(id, trainerName(id)); });
  return [...seen].map(([id, name]) => ({ id, name }));
}

export function selectedClient() { return data.users.find((user) => user.id === selectedClientId); }

export function currentPlan() { return data.subscription?.plan || "free"; }

export function planLabel(plan = currentPlan()) { return { free: "Free", pro: "Pro", studio: "Studio" }[plan] || "Free"; }

export function workoutDateToInputValue(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value;
  const match = String(value || "").match(/^(\d{4})\.\s*([^.]+)\.\s*(\d{1,2})\.$/);
  if (!match) return "";
  const months = ["jan", "febr", "márc", "ápr", "máj", "jún", "júl", "aug", "szept", "okt", "nov", "dec"];
  const month = months.indexOf(match[2].trim().replace(/\.$/, ""));
  if (month < 0) return "";
  return `${match[1]}-${String(month + 1).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
}

export function dateFromInputValue(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : null;
}

export function workoutStats(user) {
  const now = new Date();
  const today = toDateInputValue(now);
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dueWorkouts = (user.workouts || []).filter((workout) => {
    if (workout.status === "Teljesítve") return true;
    if (workout.status !== "Beütemezve") return false;
    const date = workoutDateToInputValue(workout.date);
    return date && (date < today || (date === today && (workout.time || "00:00") <= time));
  });
  const completed = dueWorkouts.filter((workout) => workout.status === "Teljesítve").length;
  return {
    completed,
    due: dueWorkouts.length,
    adherence: dueWorkouts.length ? Math.round((completed / dueWorkouts.length) * 100) : 0,
    upcoming: (user.workouts || []).filter((workout) => workout.status === "Beütemezve" && workoutDateToInputValue(workout.date) >= today).length
      + registeredUpcomingGroupWorkouts(user).length
  };
}

// A kliens által jelentkezett (nem várólistás), még le nem zajlott csoportos edzések.
export function registeredUpcomingGroupWorkouts(user) {
  const now = Date.now();
  return (data.groupWorkouts || []).filter((workout) => {
    const date = groupWorkoutDate(workout);
    return date && date.getTime() > now && !workout.cancelledAt && groupWorkoutStanding(workout, user.id).registered;
  });
}

export function upcomingWorkouts(clients) {
  const today = toDateInputValue(new Date());
  return clients.flatMap((client) => (client.workouts || []).map((workout) => ({ client, workout, date: workoutDateToInputValue(workout.date) })))
    .filter((item) => item.workout.status === "Beütemezve" && item.date && item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.workout.time || "").localeCompare(b.workout.time || ""));
}

export function nextSessionLabel(user) {
  const now = new Date();
  const today = toDateInputValue(now);
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const next = (user.workouts || [])
    .map((workout) => ({ workout, date: workoutDateToInputValue(workout.date) }))
    .filter(({ workout, date }) => workout.status === "Beütemezve" && dateFromInputValue(date) && (date > today || (date === today && (workout.time || "00:00") >= currentTime)))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.workout.time || "").localeCompare(b.workout.time || ""))[0];
  const nextGroup = registeredUpcomingGroupWorkouts(user).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0];
  const groupDate = nextGroup ? toDateInputValue(groupWorkoutDate(nextGroup)) : "";
  const groupBeforeIndividual = nextGroup && (!next || `${groupDate} ${groupWorkoutTime(nextGroup)}` < `${next.date} ${next.workout.time || "00:00"}`);
  if (groupBeforeIndividual) {
    return `${new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium" }).format(groupWorkoutDate(nextGroup))} · ${groupWorkoutTime(nextGroup)} · csoportos`;
  }
  if (!next) return "Nincs beütemezve";
  const date = new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium" }).format(dateFromInputValue(next.date));
  return `${date} · ${next.workout.time || "Időpont nincs megadva"}`;
}

export function groupWorkoutDate(workout) {
  const date = new Date(workout.startsAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function groupWorkoutTime(workout) {
  const date = groupWorkoutDate(workout);
  return date ? new Intl.DateTimeFormat("hu-HU", { hour: "2-digit", minute: "2-digit" }).format(date) : "";
}

export function groupWorkoutDateLabel(workout) {
  const date = groupWorkoutDate(workout);
  return date ? new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium" }).format(date) : "";
}

export function groupWorkoutStanding(workout, userId = currentUser()?.id) {
  const registered = Boolean(workout.isRegistered || workout.registrations?.includes(userId));
  const waitlisted = !registered && Boolean(workout.isWaitlisted);
  const full = Number(workout.participantCount || 0) >= Number(workout.capacity || 0);
  const label = registered ? "Jelentkeztél" : waitlisted ? "Várólistán vagy" : full ? "Várólistára jelentkezhetsz" : "Jelentkezhető";
  return { registered, waitlisted, full, label };
}

export function groupWorkoutMeta(workout) {
  const parts = [`${workout.participantCount}/${workout.capacity} fő`, `${workout.duration} perc`];
  if (workout.location) parts.push(workout.location);
  if (workout.waitlistCount) parts.push(`várólista: ${workout.waitlistCount}`);
  return parts.join(" · ");
}

export function visibleGroupWorkouts(user = currentUser()) {
  if (!user) return [];
  return (data.groupWorkouts || []).filter((workout) => {
    if (user.role === "admin") return true;
    if (user.role === "trainer") return workout.trainerId === user.id;
    return (user.trainerIds || []).includes(workout.trainerId);
  });
}

export function upcomingGroupWorkouts(user = currentUser()) {
  const now = Date.now();
  return visibleGroupWorkouts(user)
    .filter((workout) => {
      const date = groupWorkoutDate(workout);
      if (!date || date.getTime() <= now || workout.cancelledAt) return false;
      return true;
    })
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}

export function coachProfileFor(id) {
  return (data.coachProfiles || []).find((profile) => profile.id === id);
}

export function pendingTrainerApplications() {
  return data.trainerApplications || [];
}

export function calendarClientsFor(user) {
  if (user.role === "admin") return data.users.filter((item) => item.role === "client");
  if (user.role === "trainer") return data.users.filter((item) => item.role === "client" && (item.trainerIds || []).includes(user.id));
  return [user];
}

export function trainingPlanDayLabel(dayId) {
  if (!dayId) return "";
  for (const plan of data.trainingPlans || []) {
    const day = (plan.days || []).find((item) => item.id === dayId);
    if (day) return `${plan.title} · ${day.title}`;
  }
  return "";
}

export function visibleTrainingPlanDaysForClient(client) {
  const user = currentUser();
  return (data.trainingPlans || [])
    .filter((plan) => {
      if (user?.role === "admin") return true;
      const visibleToClient = plan.isPublic || ((plan.clientIds || []).includes(client.id) && (client.trainerIds || []).includes(plan.trainerId));
      if (!visibleToClient) return false;
      if (user?.role === "trainer") return plan.trainerId === user.id;
      return true;
    })
    .flatMap((plan) => (plan.days || []).map((day, index) => ({
      dayId: day.id || "",
      label: `${plan.title} · ${day.title || `Edzésnap ${index + 1}`}`
    })))
    .filter((item) => item.dayId);
}

export function exerciseCatalogOptions() {
  return `<datalist id="exercise-catalog">${EXERCISE_CATALOG.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("")}</datalist>`;
}

export function workoutTypeCatalogOptions() {
  return `<datalist id="workout-type-catalog">${WORKOUT_TYPE_CATALOG.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("")}</datalist>`;
}
