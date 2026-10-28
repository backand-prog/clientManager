const STORAGE_KEY = "form-function-data";
const SESSION_KEY = "form-function-session";

const seedData = {
  users: [
    { id: "admin-1", role: "admin", name: "Andras Back", email: "admin@formfunction.test", password: "admin123" },
    { id: "trainer-1", role: "trainer", name: "Nagy Anna", email: "anna@formfunction.test", password: "trainer123", specialty: "Erőnléti edzés" },
    { id: "client-1", role: "client", name: "Maya Chen", email: "maya@example.com", password: "client123", trainerIds: ["trainer-1"], goal: "Erő és mobilitás", status: "Aktív", joined: "2026. jan. 12.", sessions: 18, adherence: 86, nextSession: "Holnap, 09:00", notes: "Stabil alapok építése következetes, teljes testes edzésekkel.", workouts: [{ date: "2026. márc. 20.", time: "08:00", type: "Teljes testes erősítés", duration: 52, status: "Teljesítve", trainerId: "trainer-1", notes: "Jó technika, magabiztos terhelés." }, { date: "2026. márc. 17.", time: "08:00", type: "Mobilitás és törzs", duration: 38, status: "Teljesítve", trainerId: "trainer-1", notes: "" }] },
    { id: "client-2", role: "client", name: "Leo Martins", email: "leo@example.com", password: "client123", trainerIds: ["trainer-1"], goal: "Visszatérés a futáshoz", status: "Aktív", joined: "2026. febr. 03.", sessions: 12, adherence: 74, nextSession: "Csütörtök, 18:30", notes: "Óvatos visszatérés a hosszabb kihagyás után.", workouts: [{ date: "2026. márc. 19.", time: "18:30", type: "Futótechnika", duration: 45, status: "Teljesítve", trainerId: "trainer-1", notes: "" }] },
    { id: "client-3", role: "client", name: "Sofia Patel", email: "sofia@example.com", password: "client123", trainerIds: [], goal: "Testkompozíció", status: "Szüneteltetve", joined: "2025. nov. 18.", sessions: 24, adherence: 91, nextSession: "Nincs beütemezve", notes: "Rövid utazási szüneten van.", workouts: [] }
  ],
  connectionRequests: [],
  notifications: [],
  coachProfiles: [{ id: "trainer-1", name: "Nagy Anna", specialty: "Erőnléti edzés", bio: "Személyre szabott erőnléti edzéssel segítek, hogy magabiztosan és fenntarthatóan érd el a céljaidat.", photos: [] }],
  activities: [
    { text: "Maya Chen teljesített egy edzést", time: "Ma, 08:42", mark: "MC" },
    { text: "Leo Martins frissítette a profilját", time: "Tegnap, 17:20", mark: "LM" },
    { text: "Új regisztráció: Nina Rossi", time: "2026. márc. 18.", mark: "NR" }
  ]
};

let data = isLocalDevelopmentHost() ? loadData() : structuredClone(seedData);
let session = isLocalDevelopmentHost() ? localStorage.getItem(SESSION_KEY) : null;
let currentView = "overview";
let selectedClientId = null;
let selectedCoachId = null;
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let calendarSelectedDate = toDateInputValue(new Date());
let remoteMode = Boolean(window.remoteStore?.enabled);
let localPhotoDbPromise;
let storageNoticeDismissed = false;

function isLocalDevelopmentHost() {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function isPublicRegistrationEnabled() {
  return window.LEGAL_NOTICES?.publicRegistrationEnabled === true;
}

function renderLegalLinks() {
  return `<div class="legal-links" aria-label="Jogi dokumentumok"><button type="button" data-legal="privacy">Adatkezelési tájékoztató (tervezet)</button><button type="button" data-legal="terms">Felhasználási feltételek (tervezet)</button><button type="button" data-legal="cookies">Süti- és helyi tárolási tájékoztató</button></div>`;
}

function renderStorageNotice() {
  if (storageNoticeDismissed) return "";
  return `<aside class="storage-notice" aria-label="Sütik és helyi tárolás" aria-live="polite"><div><strong>Csak a működéshez szükséges böngészős tárolást használjuk.</strong><p>Nem használunk analitikai vagy hirdetési sütiket. Részletek a kezelt tárolókról és azok céljáról:</p></div><div class="storage-notice-actions"><button type="button" class="text-button" data-legal="cookies">Részletek</button><button type="button" class="btn btn-ghost" id="dismiss-storage-notice">Tudomásul vettem</button></div></aside>`;
}

function bindStorageNoticeEvents() {
  document.querySelector("#dismiss-storage-notice")?.addEventListener("click", () => {
    storageNoticeDismissed = true;
    document.querySelector(".storage-notice")?.remove();
  });
  document.querySelector(".storage-notice [data-legal]")?.addEventListener("click", () => openLegalDocument("cookies"));
}

function openLegalDocument(type) {
  const documentInfo = window.LEGAL_NOTICES?.documents?.[type];
  if (!documentInfo) throw new Error("A kért tájékoztató nem érhető el.");
  const dialog = document.createElement("dialog");
  dialog.className = "legal-dialog";
  dialog.setAttribute("aria-labelledby", "legal-dialog-title");
  const sections = documentInfo.sections.map((section) => `<section><h3>${escapeHtml(section.heading)}</h3>${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</section>`).join("");
  const documentVersion = type === "terms" ? window.LEGAL_NOTICES.termsVersion : type === "cookies" ? window.LEGAL_NOTICES.cookiesVersion : window.LEGAL_NOTICES.privacyVersion;
  dialog.innerHTML = `<div class="panel-head"><div><div class="eyebrow">RutinNapló · ${escapeHtml(window.LEGAL_NOTICES.status === "draft" ? "Tervezet" : "Hatályos")}</div><h2 id="legal-dialog-title">${escapeHtml(documentInfo.title)}</h2></div><button type="button" class="close" aria-label="Bezárás">&times;</button></div><p class="settings-help">Dokumentumverzió: ${escapeHtml(documentVersion)} · Utolsó tervezet: 2026. október 28.</p>${window.LEGAL_NOTICES.status === "draft" ? `<div class="legal-status" role="status">Ez a dokumentum tervezet, nem végleges jogi tájékoztató vagy szerződési feltétel. A 18+ kliensregisztráció és edzői jelentkezés tesztelésre elérhető; fizetési funkció nincs.</div>` : ""}${sections}`;
  dialog.querySelector(".close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
}

function defaultViewFor(user) {
  return "home";
}

function routeForCurrentState() {
  const user = currentUser();
  if (!user) return "/";
  if (user.role === "admin") {
    if (currentView === "home") return "/admin/home";
    if (currentView === "overview") return "/admin/overview";
    if (currentView === "calendar") return "/admin/calendar";
    if (currentView === "clients") return "/admin/clients";
    if (currentView === "trainers") return "/admin/trainers";
    if (currentView === "trainer-applications") return "/admin/trainer-applications";
    if (currentView === "notifications") return "/admin/notifications";
    if (currentView === "coach-profiles") return "/admin/coach-profiles";
    if (currentView === "coach-profile-review") return `/admin/coach-profiles/${encodeURIComponent(selectedCoachId || "")}`;
    if (currentView === "client-detail") return `/admin/clients/${encodeURIComponent(selectedClientId || "")}`;
    return "/admin/settings";
  }
  if (user.role === "trainer") {
    if (currentView === "home" || currentView === "trainer-home") return "/coach/home";
    if (currentView === "clients") return "/coach/clients";
    if (currentView === "calendar") return "/coach/calendar";
    if (currentView === "coach-profile") return "/coach/profile";
    if (currentView === "client-detail") return `/coach/clients/${encodeURIComponent(selectedClientId || "")}`;
    if (currentView === "connections") return "/coach/connections";
    if (currentView === "notifications") return "/coach/notifications";
    return "/coach/settings";
  }
  if (currentView === "home" || currentView === "profile") return "/client";
  if (currentView === "calendar") return "/client/calendar";
  if (currentView === "connections") return "/client/connections";
  if (currentView === "notifications") return "/client/notifications";
  if (currentView === "settings") return "/client/settings";
  if (currentView === "coach-directory") return "/client/coaches";
  if (currentView === "coach-profile-detail") return `/client/coaches/${encodeURIComponent(selectedCoachId || "")}`;
  return "/client";
}

function syncRouteToUrl(replace = false) {
  const route = `#${routeForCurrentState()}`;
  if (window.location.hash === route) return;
  const method = replace ? "replaceState" : "pushState";
  window.history[method](null, "", route);
}

function navigateToView(view, { clientId = selectedClientId, coachId = selectedCoachId, replace = false } = {}) {
  currentView = view;
  selectedClientId = view === "client-detail" ? clientId : null;
  selectedCoachId = ["coach-profile-detail", "coach-profile-review"].includes(view) ? coachId : null;
  syncRouteToUrl(replace);
  render();
}

function restoreRouteFromUrl() {
  const user = currentUser();
  if (!user) return;
  const segments = window.location.hash.startsWith("#/") ? window.location.hash.slice(2).split("/").map((segment) => {
    try { return decodeURIComponent(segment); }
    catch { return ""; }
  }) : [];
  currentView = defaultViewFor(user);
  selectedClientId = null;
  selectedCoachId = null;

  if (user.role === "admin") {
    if (segments[0] === "admin" && segments[1] === "home") currentView = "home";
    else if (segments[0] === "admin" && segments[1] === "overview") currentView = "overview";
    else if (segments[0] === "admin" && segments[1] === "calendar") currentView = "calendar";
    else if (segments[0] === "admin" && segments[1] === "clients" && segments[2]) {
      currentView = "client-detail";
      selectedClientId = segments[2];
    } else if (segments[0] === "admin" && segments[1] === "clients") currentView = "clients";
    else if (segments[0] === "admin" && segments[1] === "trainers") currentView = "trainers";
    else if (segments[0] === "admin" && segments[1] === "trainer-applications") currentView = "trainer-applications";
    else if (segments[0] === "admin" && segments[1] === "notifications") currentView = "notifications";
    else if (segments[0] === "admin" && segments[1] === "coach-profiles" && segments[2]) {
      currentView = "coach-profile-review";
      selectedCoachId = segments[2];
    } else if (segments[0] === "admin" && segments[1] === "coach-profiles") currentView = "coach-profiles";
    else if (segments[0] === "admin") currentView = segments[1] === "settings" ? "settings" : "overview";
  } else if (user.role === "trainer") {
    if (segments[0] === "coach" && segments[1] === "home") currentView = "home";
    else if (segments[0] === "coach" && segments[1] === "calendar") currentView = "calendar";
    else if (segments[0] === "coach" && segments[1] === "profile") currentView = "coach-profile";
    else if (segments[0] === "coach" && segments[1] === "connections") currentView = "connections";
    else if (segments[0] === "coach" && segments[1] === "notifications") currentView = "notifications";
    else if (segments[0] === "coach" && segments[1] === "settings") currentView = "settings";
    else if (segments[0] === "coach" && segments[1] === "clients" && segments[2]) {
      currentView = "client-detail";
      selectedClientId = segments[2];
    } else if (segments[0] === "coach" && segments[1] === "clients") currentView = "clients";
  } else if (segments[0] === "client" && segments[1] === "calendar") currentView = "calendar";
  else if (segments[0] === "client" && segments[1] === "connections") currentView = "connections";
  else if (segments[0] === "client" && segments[1] === "notifications") currentView = "notifications";
  else if (segments[0] === "client" && segments[1] === "settings") currentView = "settings";
  else if (segments[0] === "client" && segments[1] === "coaches" && segments[2]) {
    currentView = "coach-profile-detail";
    selectedCoachId = segments[2];
  } else if (segments[0] === "client" && segments[1] === "coaches") currentView = "coach-directory";
  else if (segments[0] === "client") currentView = "profile";

  syncRouteToUrl(true);
}

window.addEventListener("popstate", () => {
  restoreRouteFromUrl();
  render();
});

function openLocalPhotoDb() {
  if (!("indexedDB" in window)) return Promise.reject(new Error("A böngésző nem támogatja a helyi képtárolást."));
  if (!localPhotoDbPromise) {
    localPhotoDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open("form-function-images", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("coach-photos");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Nem sikerült megnyitni a helyi képtárat."));
    });
  }
  return localPhotoDbPromise;
}

async function localPhotoRequest(mode, operation) {
  const db = await openLocalPhotoDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("coach-photos", mode);
    const request = operation(transaction.objectStore("coach-photos"));
    let result;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error || new Error("Nem sikerült elérni a helyi képtárat."));
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transaction.error || new Error("Nem sikerült menteni a helyi képet."));
  });
}

async function restoreLocalCoachPhotos() {
  for (const profile of data.coachProfiles || []) {
    const photos = [];
    for (const photo of profile.photos || []) {
      const blob = await localPhotoRequest("readonly", (store) => store.get(photo.path));
      if (blob) photos.push({ ...photo, url: URL.createObjectURL(blob) });
    }
    profile.photos = photos;
  }
}

function loadData() {
  try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (!stored) return structuredClone(seedData); stored.connectionRequests ||= []; stored.notifications ||= []; if (!Array.isArray(stored.coachProfiles)) stored.coachProfiles = structuredClone(seedData.coachProfiles); stored.users.forEach((user) => { user.workouts ||= []; user.trainerIds ||= []; if (user.status === "Active") user.status = "Aktív"; if (user.status === "Paused") user.status = "Szüneteltetve"; if (user.goal === "Strength & mobility") user.goal = "Erő és mobilitás"; if (user.goal === "Return to running") user.goal = "Visszatérés a futáshoz"; if (user.goal === "Body recomposition") user.goal = "Testkompozíció"; }); return stored; }
  catch { return structuredClone(seedData); }
}
function saveData() {
  if (remoteMode) return;
  const stored = {
    ...data,
    coachProfiles: (data.coachProfiles || []).map((profile) => ({
      ...profile,
      photos: (profile.photos || []).map(({ path }) => ({ path }))
    }))
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}
function currentUser() { return data.users.find((user) => user.id === session); }
function findLocalLoginUser(email, password) {
  const user = data.users.find((item) => item.email.toLowerCase() === email && item.password === password);
  if (user) return user;
  const demoUser = seedData.users.find((item) => item.email.toLowerCase() === email && item.password === password);
  if (!demoUser) return null;
  const existingIndex = data.users.findIndex((item) => item.id === demoUser.id);
  if (existingIndex < 0) data.users.push(structuredClone(demoUser));
  else data.users[existingIndex] = structuredClone(demoUser);
  return data.users.find((item) => item.id === demoUser.id);
}
function selectedClient() { return data.users.find((user) => user.id === selectedClientId); }
function trainers() { return data.users.filter((user) => user.role === "trainer"); }
function trainerName(id) { return trainers().find((trainer) => trainer.id === id)?.name || "Egyéni edzés"; }
function initials(name) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])); }
function toast(message) { const region = document.querySelector("#toast-region"); region.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`; setTimeout(() => { region.innerHTML = ""; }, 3000); }
function formatDate() { return new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short", day: "numeric" }).format(new Date()); }
function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function workoutDateToInputValue(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value;
  const match = String(value || "").match(/^(\d{4})\.\s*([^.]+)\.\s*(\d{1,2})\.$/);
  if (!match) return "";
  const months = ["jan", "febr", "márc", "ápr", "máj", "jún", "júl", "aug", "szept", "okt", "nov", "dec"];
  const month = months.indexOf(match[2].trim().replace(/\.$/, ""));
  if (month < 0) return "";
  return `${match[1]}-${String(month + 1).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
}
function dateFromInputValue(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : null;
}
function workoutStats(user) {
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
  };
}
function upcomingWorkouts(clients) {
  const today = toDateInputValue(new Date());
  return clients.flatMap((client) => (client.workouts || []).map((workout) => ({ client, workout, date: workoutDateToInputValue(workout.date) })))
    .filter((item) => item.workout.status === "Beütemezve" && item.date && item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.workout.time || "").localeCompare(b.workout.time || ""));
}
function nextSessionLabel(user) {
  const now = new Date();
  const today = toDateInputValue(now);
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const next = (user.workouts || [])
    .map((workout) => ({ workout, date: workoutDateToInputValue(workout.date) }))
    .filter(({ workout, date }) => workout.status === "Beütemezve" && dateFromInputValue(date) && (date > today || (date === today && (workout.time || "00:00") >= currentTime)))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.workout.time || "").localeCompare(b.workout.time || ""))[0];
  if (!next) return "Nincs beütemezve";
  const date = new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium" }).format(dateFromInputValue(next.date));
  return `${date} · ${next.workout.time || "Időpont nincs megadva"}`;
}

function addLocalNotification(userId, requestId, kind, message) {
  data.notifications.unshift({ id: `notification-${Date.now()}-${Math.random()}`, userId, requestId, kind, message, createdAt: new Date().toISOString(), readAt: null });
}

function renderConnectionCenter(user) {
  const requests = data.connectionRequests || [];
  const pending = requests.filter((request) => request.recipientId === user.id && request.status === "pending");
  const sent = requests.filter((request) => request.requesterId === user.id).slice(0, 5);
  const canRequest = user.role === "client" || user.role === "trainer";
  const requestLabel = user.role === "client" ? "Edző megkeresése e-mail-cím alapján" : "Kliens hozzáadása e-mail-cím alapján";
  return `<div class="topbar"><div><div class="eyebrow">Munkatér / Kapcsolatok</div><h1>Kapcsolatok</h1><p>A kapcsolat csak a címzett jóváhagyása után jön létre.</p></div></div><section class="panel connection-center">
    ${canRequest ? `<form id="connection-request-form" class="search-row"><input id="connection-email" type="email" placeholder="Regisztrált ${user.role === "client" ? "edző" : "kliens"} e-mail-címe" required /><button class="btn btn-teal" type="submit">${requestLabel}</button></form>` : ""}
    ${pending.length ? `<h3>Jóváhagyásra vár</h3>${pending.map((request) => `<div class="connection-row"><div><strong>${escapeHtml(request.requesterName)}</strong><p>${user.role === "trainer" ? "Ez a kliens szeretne hozzád kapcsolódni." : "Ez az edző szeretne kliensként hozzáadni."}</p></div><button class="btn btn-teal" data-connection-decision="approved" data-request-id="${escapeHtml(request.id)}">Jóváhagyás</button><button class="btn btn-ghost" data-connection-decision="declined" data-request-id="${escapeHtml(request.id)}">Elutasítás</button></div>`).join("")}` : ""}
    ${sent.length ? `<h3>Elküldött kérések</h3>${sent.map((request) => `<div class="connection-row"><div><strong>${escapeHtml(request.recipientName)}</strong><p>${request.status === "pending" ? "Válaszra vár" : request.status === "approved" ? "Jóváhagyva" : "Elutasítva"} · ${escapeHtml(request.createdAt ? new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium" }).format(new Date(request.createdAt)) : "")}</p></div></div>`).join("")}` : ""}
    ${!pending.length && !sent.length ? `<div class="empty-state">Még nincsenek kapcsolati kéréseid.</div>` : ""}
  </section>`;
}

function renderNotificationPreview(user) {
  const unread = (data.notifications || []).filter((item) => item.userId === user.id && !item.readAt);
  if (!unread.length) return "";
  return `<section class="panel notification-preview"><div class="panel-head"><div><h2>Új értesítések</h2><p>${unread.length} olvasatlan értesítés</p></div><button class="text-button" data-view="notifications">Összes megtekintése</button></div>${unread.slice(0, 3).map((item) => `<div class="activity notification-unread"><div class="activity-mark">!</div><p>${escapeHtml(item.message)}<small>${escapeHtml(item.createdAt ? new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt)) : "")}</small></p></div>`).join("")}</section>`;
}

function renderNotifications(user) {
  const notifications = (data.notifications || []).filter((item) => item.userId === user.id);
  return `<div class="topbar"><div><div class="eyebrow">Munkatér / Értesítések</div><h1>Értesítések</h1><p>Korábbi kapcsolati kéréseid és döntéseid.</p></div>${notifications.some((item) => !item.readAt) ? `<button class="btn btn-ghost" id="mark-notifications-read">Összes olvasottnak jelölése</button>` : ""}</div><section class="panel notification-list">${notifications.length ? notifications.map((item) => `<div class="activity ${item.readAt ? "" : "notification-unread"}"><div class="activity-mark">${item.readAt ? "✓" : "!"}</div><p>${escapeHtml(item.message)}<small>${escapeHtml(item.createdAt ? new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt)) : "")}</small></p></div>`).join("") : `<div class="empty-state">Még nincsenek értesítéseid.</div>`}</section>`;
}

function renderSettings(user) {
  const isClient = user.role === "client";
  return `<div class="topbar"><div><div class="eyebrow">Fiók / Beállítások</div><h1>Beállítások</h1><p>Személyes adatok és fiókbiztonság kezelése.</p></div></div><section class="panel settings-panel"><h2>Személyes adatok</h2><p class="settings-help">A fiók e-mail-címének módosítása után az új címet meg kell erősítened.</p><form id="settings-form"><div class="field"><label for="settings-name">Teljes név</label><input id="settings-name" name="name" autocomplete="name" required value="${escapeHtml(user.name)}" /></div><div class="field"><label for="settings-email">E-mail-cím</label><input id="settings-email" name="email" type="email" autocomplete="email" required value="${escapeHtml(user.email)}" /></div><div class="field">${isClient ? `<label for="settings-goal">Fő cél</label><input id="settings-goal" name="goal" value="${escapeHtml(user.goal || "")}" /><small class="settings-help">Ne adj meg diagnózist, sérülést vagy más egészségügyi adatot.</small>` : `<label for="settings-specialty">Szakterület</label><input id="settings-specialty" name="specialty" value="${escapeHtml(user.specialty || "")}" />`}</div><div class="settings-actions"><button class="btn btn-teal" type="submit">Adatok mentése</button></div></form><div class="settings-privacy"><h2>Személyes adataid</h2><p class="settings-help">Töltsd le az alkalmazásban rólad tárolt adatokat. A fájlt biztonságos helyen tárold.</p><button class="btn btn-ghost" id="export-my-data">Saját adataim letöltése</button></div><div class="settings-danger"><h2>Fiók törlése</h2><p>A fiók törlése végleges, és eltávolítja a profilodat és a hozzá tartozó adatokat. Számlázási vagy jogszabályban előírt megőrzésre köteles adatot külön szabályok érinthetnek.</p><button class="btn btn-danger" id="delete-account">Fiók törlése</button></div></section>`;
}

function coachProfileFor(id) {
  return (data.coachProfiles || []).find((profile) => profile.id === id);
}

function renderCoachProfileEditor(user) {
  const profile = coachProfileFor(user.id) || { name: user.name, specialty: user.specialty || "", bio: "", photos: [] };
  return `<div class="topbar"><div><div class="eyebrow">Edzői tér / Bemutatkozás</div><h1>Edzői bemutatkozás</h1><p>Oszd meg a tapasztalatodat, és mutasd meg a klienseknek, hogyan dolgozol.</p></div></div>
    <section class="panel coach-profile-editor"><form id="coach-profile-form"><div class="field"><label for="coach-specialty">Szakterület</label><input id="coach-specialty" name="specialty" maxlength="120" value="${escapeHtml(profile.specialty || "")}" required /></div>
      <div class="field"><label for="coach-bio">Bemutatkozás</label><textarea id="coach-bio" name="bio" maxlength="2000" required placeholder="Írd le a tapasztalatodat és az edzésmódszeredet...">${escapeHtml(profile.bio || "")}</textarea><small>Legfeljebb 2000 karakter.</small></div>
      <div class="field"><label for="coach-photos">Képek (legfeljebb 5, egyenként legfeljebb 5 MB)</label><input id="coach-photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple /><small>JPG, PNG vagy WebP. ${remoteMode ? "A képek csak bejelentkezett felhasználók számára láthatók." : "Helyi demo módban a képek ugyanabban a böngészőben maradnak elérhetők."}</small></div>
      ${profile.photos?.length ? `<div class="coach-gallery">${profile.photos.map((photo) => `<div class="coach-gallery-item"><img src="${escapeHtml(photo.url)}" alt="${escapeHtml(profile.name)} edzésfotója" /><button class="btn btn-ghost" type="button" data-remove-coach-photo="${escapeHtml(photo.path)}">Kép törlése</button></div>`).join("")}</div>` : `<p class="muted">Még nem töltöttél fel képet.</p>`}
      <button class="btn btn-teal" type="submit">Bemutatkozás mentése</button>
    </form></section>`;
}

function renderCoachDirectory() {
  const profiles = data.coachProfiles || [];
  return `<div class="topbar"><div><div class="eyebrow">Felfedezés</div><h1>Edzők böngészése</h1><p>Ismerd meg az edzőket, majd küldj kapcsolódási kérést.</p></div></div>
    ${profiles.length ? `<div class="coach-directory">${profiles.map((profile) => {
      return `<article class="panel coach-card"><div class="coach-card-heading"><div class="avatar">${initials(profile.name)}</div><div><h2>${escapeHtml(profile.name)}</h2><p>${escapeHtml(profile.specialty || "Személyi edző")}</p></div></div><button class="btn btn-teal coach-open-profile" type="button" data-coach-profile="${escapeHtml(profile.id)}">Edző profiljának megnyitása</button></article>`;
    }).join("")}</div>` : `<section class="panel empty-state">Még nincs közzétett edzői bemutatkozás. Nézz vissza később.</section>`}`;
}

function renderAdminCoachProfiles() {
  const profiles = data.coachProfiles || [];
  return `<div class="topbar"><div><div class="eyebrow">Adminisztráció / Edzői profilok</div><h1>Edzői profilok áttekintése</h1><p>Ellenőrizd az edzők bemutatkozását és feltöltött képeit.</p></div></div>
    ${profiles.length ? `<div class="coach-directory">${profiles.map((profile) => `<article class="panel coach-card"><div class="coach-card-heading"><div class="avatar">${initials(profile.name)}</div><div><h2>${escapeHtml(profile.name)}</h2><p>${escapeHtml(profile.specialty || "Személyi edző")}</p></div></div><button class="btn btn-teal coach-open-profile" type="button" data-coach-review="${escapeHtml(profile.id)}">Profil áttekintése</button></article>`).join("")}</div>` : `<section class="panel empty-state">Még nincs áttekinthető edzői profil.</section>`}`;
}

function renderCoachProfileDetail() {
  const profile = coachProfileFor(selectedCoachId);
  const isAdmin = currentUser()?.role === "admin";
  const backView = isAdmin ? "coach-profiles" : "coach-directory";
  const backLabel = isAdmin ? "Vissza az edzői profilokhoz" : "Vissza az edzőkhöz";
  if (!profile) return `<div class="topbar"><button class="text-button" data-view="${backView}">← ${backLabel}</button></div><section class="panel empty-state">Ez az edzői profil már nem érhető el.</section>`;
  const user = currentUser();
  const request = isAdmin ? null : data.connectionRequests.find((item) => item.requesterId === user.id && item.recipientId === profile.id && item.status === "pending");
  const connected = !isAdmin && (user.trainerIds || []).includes(profile.id);
  const connectionAction = isAdmin
    ? ""
    : connected
      ? `<span class="status status-active">Már a kapcsolataid között van</span>`
      : request
        ? `<span class="status status-paused">Kérés elküldve · válaszra vár</span>`
        : `<button class="btn btn-teal" data-coach-request="${escapeHtml(profile.id)}">Kapcsolódási kérés küldése</button>`;
  return `<div class="topbar"><button class="text-button" data-view="${backView}">← ${backLabel}</button></div>
    <article class="panel coach-profile-detail">
      <div class="coach-card-heading"><div class="avatar">${initials(profile.name)}</div><div><div class="eyebrow">Edzői profil</div><h1>${escapeHtml(profile.name)}</h1><p>${escapeHtml(profile.specialty || "Személyi edző")}</p></div></div>
      <h2>Bemutatkozás</h2><p class="coach-bio">${escapeHtml(profile.bio || "Az edző hamarosan bővebb bemutatkozást ad hozzá.")}</p>
      <h2>Képek</h2>${profile.photos?.length ? `<div class="coach-gallery coach-profile-gallery">${profile.photos.map((photo) => `<img src="${escapeHtml(photo.url)}" alt="${escapeHtml(profile.name)} edzésfotója" />`).join("")}</div>` : `<p class="muted">Ehhez a profilhoz még nem töltöttek fel képet.</p>`}
      ${connectionAction}
    </article>`;
}

function createLocalCoachRequest(actor, coachId) {
  const coach = data.users.find((item) => item.id === coachId && item.role === "trainer");
  if (!coach) throw new Error("Az edző nem található.");
  createLocalConnectionRequest(actor, coach.email);
}

function createLocalConnectionRequest(actor, email) {
  const target = data.users.find((item) => item.email?.toLowerCase() === email && item.role !== "admin");
  if (!target) throw new Error("Nem található ilyen e-mail-című regisztrált edző vagy kliens.");
  if (target.id === actor.id) throw new Error("Saját magadnak nem küldhetsz kapcsolódási kérést.");
  const validPair = (actor.role === "client" && target.role === "trainer") || (actor.role === "trainer" && target.role === "client");
  if (!validPair) throw new Error("Kliens csak edzőt, edző csak klienst kereshet meg.");
  const client = actor.role === "client" ? actor : target;
  const trainer = actor.role === "trainer" ? actor : target;
  if ((client.trainerIds || []).includes(trainer.id)) throw new Error("Ez a kliens már ehhez az edzőhöz van rendelve.");
  if (data.connectionRequests.some((request) => request.status === "pending" && ((request.requesterId === actor.id && request.recipientId === target.id) || (request.requesterId === target.id && request.recipientId === actor.id)))) {
    throw new Error("Ehhez a felhasználóhoz már van függőben lévő kérés.");
  }
  const request = { id: `request-${Date.now()}-${Math.random()}`, requesterId: actor.id, recipientId: target.id, requesterName: actor.name, recipientName: target.name, status: "pending", createdAt: new Date().toISOString() };
  data.connectionRequests.unshift(request);
  addLocalNotification(target.id, request.id, "request_received", `${actor.name} kapcsolódási kérést küldött.`);
  addLocalNotification(actor.id, request.id, "request_sent", `A kapcsolódási kérésed elküldve ${target.name} részére.`);
}

function respondLocalConnectionRequest(actor, requestId, decision) {
  const request = data.connectionRequests.find((item) => item.id === requestId && item.recipientId === actor.id && item.status === "pending");
  if (!request) throw new Error("A kérés már nem elérhető.");
  if (decision === "approved") {
    const client = data.users.find((item) => item.id === (actor.role === "client" ? actor.id : request.requesterId));
    const trainerId = actor.role === "trainer" ? actor.id : request.requesterId;
    if (!client || client.role !== "client") throw new Error("A kliensfiók nem található.");
    client.trainerIds ||= [];
    if (!client.trainerIds.includes(trainerId)) client.trainerIds.push(trainerId);
  }
  request.status = decision;
  request.respondedAt = new Date().toISOString();
  const result = decision === "approved" ? "jóváhagyta" : "elutasította";
  addLocalNotification(request.requesterId, request.id, `request_${decision}`, `${actor.name} ${result} a kapcsolódási kérésedet.`);
  addLocalNotification(request.recipientId, request.id, `request_${decision}`, `${request.requesterName} kapcsolódási kérését ${result}.`);
}

async function refreshRemote() {
  if (!remoteMode) return;
  try {
    const remoteData = await window.remoteStore.load();
    if (remoteData) { data = remoteData; session = remoteData.sessionId; localStorage.removeItem(SESSION_KEY); render(); }
  } catch (error) { toast(`Adatbázis-hiba: ${error.message}`); }
}

async function initializeRemote() {
  if (!remoteMode) {
    if (!isLocalDevelopmentHost()) {
      session = null;
      data = structuredClone(seedData);
      localStorage.removeItem(SESSION_KEY);
      render();
      toast("Az alkalmazás háttérrendszere nincs konfigurálva. A helyi demó csak fejlesztői gépen érhető el.");
      return;
    }
    try {
      await restoreLocalCoachPhotos();
      restoreRouteFromUrl();
      render();
    } catch (error) {
      toast(`Nem sikerült betölteni a helyi képeket: ${error.message}`);
    }
    return;
  }
  if (window.location.search.includes("password-reset=1") || window.location.hash.includes("type=recovery")) { renderPasswordReset(); return; }
  try {
    const remoteData = await window.remoteStore.load();
    if (remoteData) {
      data = remoteData;
      session = remoteData.sessionId;
      localStorage.removeItem(SESSION_KEY);
      restoreRouteFromUrl();
      render();
    } else if (currentUser() && isLocalDevelopmentHost()) {
      remoteMode = false;
      await restoreLocalCoachPhotos();
      restoreRouteFromUrl();
      render();
    } else {
      session = null;
      localStorage.removeItem(SESSION_KEY);
      render();
    }
  } catch (error) {
    if (!isLocalDevelopmentHost()) {
      session = null;
      data = structuredClone(seedData);
      localStorage.removeItem(SESSION_KEY);
      render();
      toast(`A szolgáltatás háttérrendszere nem érhető el: ${error.message}`);
      return;
    }
    remoteMode = false;
    if (!currentUser()) {
      session = null;
      localStorage.removeItem(SESSION_KEY);
    }
    try { await restoreLocalCoachPhotos(); }
    catch (photoError) { toast(`Nem sikerült betölteni a helyi képeket: ${photoError.message}`); }
    restoreRouteFromUrl();
    render();
    toast(`A Supabase nem érhető el, helyi demo mód aktív: ${error.message}`);
  }
}

async function remoteLogin(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  const email = document.querySelector("#email").value.trim().toLowerCase();
  const password = document.querySelector("#password").value;
  try { const remoteData = await window.remoteStore.signIn(email, password); data = remoteData; session = remoteData.sessionId; localStorage.removeItem(SESSION_KEY); currentView = defaultViewFor(currentUser()); syncRouteToUrl(true); render(); }
  catch (error) {
    const localUser = isLocalDevelopmentHost() ? findLocalLoginUser(email, password) : null;
    if (localUser) {
      remoteMode = false;
      session = localUser.id;
      localStorage.setItem(SESSION_KEY, session);
      currentView = defaultViewFor(localUser);
      syncRouteToUrl(true);
      render();
      toast("Helyi demo fiókkal jelentkeztél be.");
      return;
    }
    const networkFailure = error instanceof TypeError || /failed to fetch|fetch failed|networkerror|err_name_not_resolved/i.test(String(error?.message || error));
    if (networkFailure) {
      if (isLocalDevelopmentHost()) remoteMode = false;
      session = null;
      data = structuredClone(seedData);
      localStorage.removeItem(SESSION_KEY);
      render();
      toast(isLocalDevelopmentHost()
        ? "A Supabase nem érhető el. Helyi demo mód aktív; próbáld a README-ben szereplő demo hozzáférést."
        : "A Supabase nem érhető el. Ellenőrizd a kapcsolatot, majd próbálj újra bejelentkezni.");
      return;
    }
    toast("Sikertelen bejelentkezés: ellenőrizd az e-mail-címet és a jelszót.");
  }
}

async function remoteRegister(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (!isPublicRegistrationEnabled()) {
    toast("A nyilvános regisztráció jelenleg nincs engedélyezve.");
    return;
  }
  const values = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    const user = await window.remoteStore.signUp(values);
    if (!user) throw new Error("A regisztráció nem indult el.");
    if (values.role === "trainer") {
      toast(user.email_confirmed_at
        ? "A jelentkezésed rögzítettük. Az adminisztrátor e-mail-megerősítés után dönt az edzői hozzáférésről."
        : "A jelentkezésed rögzítettük. Erősítsd meg az e-mail-címedet az adminisztrátori elbírálás előtt.");
    } else if (!user.email_confirmed_at) toast("A fiók létrejött. Erősítsd meg az e-mail-címedet, majd jelentkezz be.");
    else toast("A fiók létrejött.");
    render();
  } catch (error) { toast(`Sikertelen regisztráció: ${error.message}`); }
}

function render() {
  const user = session && currentUser();
  const workspace = user
    ? user.trainerApplicationStatus === "pending" || user.trainerApplicationStatus === "rejected"
      ? renderTrainerApplicationStatus(user)
      : renderDashboard(user)
    : renderAuth();
  document.querySelector("#app").innerHTML = `${workspace}${renderStorageNotice()}`;
  translateLegacyUi();
  bindEvents();
}

function translateLegacyUi() {
  const replacements = { "Overview": "Áttekintés", "Clients": "Kliensek", "Sign out": "Kijelentkezés", "Administrator": "Adminisztrátor", "Client": "Kliens", "Active": "Aktív", "Paused": "Szüneteltetve", "Strength & mobility": "Erő és mobilitás", "Return to running": "Visszatérés a futáshoz", "Body recomposition": "Testkompozíció", "Not scheduled": "Nincs beütemezve", "Tomorrow, 09:00": "Holnap, 09:00", "Thu, 18:30": "Csütörtök, 18:30", "Jan 12, 2026": "2026. jan. 12.", "Feb 03, 2026": "2026. febr. 03.", "Nov 18, 2025": "2025. nov. 18.", "Open": "Megnyitás", "Edit profile": "Profil szerkesztése", "Your progress": "Fejlődésed", "This month": "Ez a hónap", "Sessions completed": "Teljesített edzés", "Plan adherence": "Terv teljesítése", "Strength trend": "Erő trend", "Recent sessions": "Legutóbbi edzések", "Coach note": "Edzői megjegyzés", "Completed": "Teljesítve", "Good": "Jó", "Great": "Nagyszerű", "Full body strength": "Teljes testes erősítés", "Mobility & core": "Mobilitás és törzs", "Lower body strength": "Alsó testes erősítés" };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => { Object.entries(replacements).forEach(([from, to]) => { node.nodeValue = node.nodeValue.replaceAll(from, to); }); });
  const clientViewReplacements = { "My space": "Saját tér", "Hello,": "Szia,", "Your consistency is the work. Keep going.": "A következetesség a munka. Folytasd.", "Focus": "Fókusz", "Member since": "Csatlakozott", "Next session": "Következő edzés", "Today": "Ma", "To be scheduled": "Nincs beütemezve", "Your progress": "Fejlődésed", "You are building excellent momentum": "Nagyszerű lendületet építesz", "You are making steady progress": "Folyamatosan haladsz előre", "Every session counts.": "Minden edzés számít.", "Your coach will see your registration and follow up with next steps.": "Az edződ látni fogja a regisztrációdat, és jelentkezik a következő lépésekkel.", "Maya Chen completed a session": "Maya Chen teljesített egy edzést", "Leo Martins updated his profile": "Leo Martins frissítette a profilját", "was added as a new client": "új kliensként hozzáadva", "registered as a new client": "új kliensként regisztrált" };
  nodes.forEach((node) => { Object.entries(clientViewReplacements).forEach(([from, to]) => { node.nodeValue = node.nodeValue.replaceAll(from, to); }); });
  nodes.forEach((node) => { node.nodeValue = node.nodeValue.replaceAll("Mar ", "márc. ").replaceAll("minutes", "perc").replaceAll("Today", "Ma"); });
  document.querySelectorAll("input[placeholder]").forEach((input) => { input.placeholder = input.placeholder.replace("Search by name or email", "Keresés név vagy e-mail alapján").replace("What are you working toward?", "Min szeretnél dolgozni?"); });
  document.querySelectorAll("textarea[placeholder]").forEach((input) => { input.placeholder = input.placeholder.replace("Coach notes", "Edzői megjegyzések"); });
}

function renderAuth() {
  return `<main class="auth-shell">
    <section class="auth-art"><div class="brand">Rutin<span>Napló</span></div><div><h1>Tedd láthatóvá a fejlődést.</h1><p>Átlátható munkatér személyi edzőknek, ahol minden kliens fejlődése egy helyen követhető.</p></div><div class="art-footer">Privát klienskezelés független edzőknek.</div></section>
    <section class="auth-panel"><div class="auth-card">
      <div class="eyebrow">Edzői munkatér</div><h2>Üdv újra</h2><p>Jelentkezz be a praxisod kezeléséhez.</p>
      <form id="login-form"><div class="field"><label for="email">E-mail-cím</label><input id="email" type="email" autocomplete="username" required placeholder="te@example.com" /></div><div class="field"><label for="password">Jelszó</label><input id="password" type="password" autocomplete="current-password" required placeholder="Írd be a jelszavad" /></div><div class="auth-actions"><button type="button" class="text-button" id="show-register" ${isPublicRegistrationEnabled() ? "" : "disabled"}>Regisztráció</button><button class="btn btn-dark" type="submit">Bejelentkezés</button></div></form>
      ${window.LEGAL_NOTICES?.status === "draft" ? `<div class="legal-status" role="status">A 18+ kliensregisztráció és edzői jelentkezés elérhető tesztelésre. A jogi tájékoztatók tervezetek; a szolgáltatás nem tekinthető hivatalos, éles indulásra késznek.</div>` : ""}
      ${isLocalDevelopmentHost() && !remoteMode ? `<div class="privacy-warning local-demo-warning">Helyi tesztmód: csak kitalált tesztadatot használj; személyes és egészségügyi adatot ne adj meg.</div>` : ""}
      ${renderLegalLinks()}
    </div></section>
  </main>`;
}

function renderTrainerApplicationStatus(user) {
  const rejected = user.trainerApplicationStatus === "rejected";
  const emailConfirmed = user.emailConfirmed !== false;
  return `<main class="auth-shell"><section class="auth-art"><div class="brand">Rutin<span>Napló</span></div><div><h1>${rejected ? "Köszönjük a jelentkezésed." : "A jelentkezésed megérkezett."}</h1><p>${rejected ? "Az adminisztrátor most nem hagyta jóvá az edzői hozzáférést." : "Az edzői munkatér az adminisztrátori elbírálásig nem érhető el."}</p></div><div class="art-footer">RutinNapló · Edzői jelentkezés</div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">${rejected ? "Jelentkezés lezárva" : "Elbírálás folyamatban"}</div><h2>${rejected ? "A jelentkezésedet elutasítottuk" : "Az adminisztrátori döntésre vársz"}</h2><p>${rejected ? "Ha úgy gondolod, hogy tévedés történt, vedd fel a kapcsolatot az alkalmazás üzemeltetőjével." : `${emailConfirmed ? "Az e-mail-címed megerősítve." : "Erősítsd meg a regisztrációkor megadott e-mail-címet."} Az adminisztrátor ellenőrzi a jelentkezésedet, és jóváhagyás esetén aktiválja az edzői fiókot.`}</p><div class="legal-status" role="status">${rejected ? "Az edzői funkciókhoz nem férsz hozzá. Új jelentkezéshez fordulj az üzemeltetőhöz." : `Jelentkező: ${escapeHtml(user.name)} · Szakterület: ${escapeHtml(user.specialty || "Nincs megadva")}. Jóváhagyásig nem férsz hozzá kliens- vagy edzői munkatérhez.`}</div><div class="auth-actions"><button class="btn btn-ghost" id="logout">Kijelentkezés</button><button class="btn btn-danger" id="delete-account">Fiók törlése</button></div></div></section></main>`;
}

function pendingTrainerApplications() {
  if (remoteMode) return data.trainerApplications || [];
  return data.users.filter((user) => user.trainerApplicationStatus === "pending").map((user) => ({
    id: user.id,
    full_name: user.name,
    email: user.email,
    specialty: user.specialty || "",
    created_at: user.createdAt || user.joined,
    emailConfirmed: true
  }));
}

function renderTrainerApplications() {
  const applications = pendingTrainerApplications();
  return `<div class="topbar"><div><div class="eyebrow">Munkatér / Edzői jelentkezések</div><h1>Edzői jelentkezések</h1><p>E-mail-megerősítés után hagyd jóvá vagy utasítsd el az edzői hozzáférést.</p></div></div><section class="panel">${applications.length ? applications.map((application) => `<div class="connection-row"><div><strong>${escapeHtml(application.full_name)}</strong><p>${escapeHtml(application.email || "Nincs e-mail-cím")} · ${escapeHtml(application.specialty || "Nincs megadva szakterület")}</p><small>${application.created_at ? `Jelentkezett: ${escapeHtml(new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium" }).format(new Date(application.created_at)))}` : ""}${application.emailConfirmed ? " · E-mail megerősítve" : " · E-mail-megerősítésre vár"}</small></div><button class="btn btn-teal" data-trainer-application="approved" data-user-id="${escapeHtml(application.id)}" ${application.emailConfirmed ? "" : "disabled"}>Jóváhagyás</button><button class="btn btn-ghost" data-trainer-application="rejected" data-user-id="${escapeHtml(application.id)}">Elutasítás</button></div>`).join("") : `<div class="empty-state">Nincs elbírálásra váró edzői jelentkezés.</div>`}</section>`;
}

function renderDashboard(user) {
  const isAdmin = user.role === "admin";
  const isTrainer = user.role === "trainer";
  const navigation = isAdmin
    ? `<div class="nav-label">Munkatér</div><button class="nav-btn ${currentView === "overview" ? "active" : ""}" data-view="overview">Áttekintés</button><button class="nav-btn ${currentView === "home" ? "active" : ""}" data-view="home">Kezdőlap</button><button class="nav-btn ${currentView === "clients" || currentView === "client-detail" ? "active" : ""}" data-view="clients">Kliensek</button><button class="nav-btn ${currentView === "trainers" ? "active" : ""}" data-view="trainers">Edzők</button><button class="nav-btn ${currentView === "trainer-applications" ? "active" : ""}" data-view="trainer-applications">Edzői jelentkezések${pendingTrainerApplications().length ? ` (${pendingTrainerApplications().length})` : ""}</button><button class="nav-btn ${currentView === "calendar" ? "active" : ""}" data-view="calendar">Naptár</button><button class="nav-btn ${["coach-profiles", "coach-profile-review"].includes(currentView) ? "active" : ""}" data-view="coach-profiles">Edzői profilok</button><button class="nav-btn ${currentView === "notifications" ? "active" : ""}" data-view="notifications">Értesítések</button>`
    : isTrainer
      ? `<div class="nav-label">Edzői tér</div><button class="nav-btn ${currentView === "home" || currentView === "trainer-home" ? "active" : ""}" data-view="home">Kezdőlap</button><button class="nav-btn ${currentView === "clients" || currentView === "client-detail" ? "active" : ""}" data-view="clients">Kliensek</button><button class="nav-btn ${currentView === "calendar" ? "active" : ""}" data-view="calendar">Naptár</button><button class="nav-btn ${currentView === "coach-profile" ? "active" : ""}" data-view="coach-profile">Bemutatkozásom</button><button class="nav-btn ${currentView === "connections" ? "active" : ""}" data-view="connections">Kapcsolatok</button><button class="nav-btn ${currentView === "notifications" ? "active" : ""}" data-view="notifications">Értesítések</button><button class="nav-btn ${currentView === "settings" ? "active" : ""}" data-view="settings">Beállítások</button>`
      : `<div class="nav-label">Saját tér</div><button class="nav-btn ${currentView === "home" || currentView === "profile" ? "active" : ""}" data-view="home">Kezdőlap</button><button class="nav-btn ${currentView === "calendar" ? "active" : ""}" data-view="calendar">Naptár</button><button class="nav-btn ${["coach-directory", "coach-profile-detail"].includes(currentView) ? "active" : ""}" data-view="coach-directory">Edzők böngészése</button><button class="nav-btn ${currentView === "connections" ? "active" : ""}" data-view="connections">Kapcsolatok</button><button class="nav-btn ${currentView === "notifications" ? "active" : ""}" data-view="notifications">Értesítések</button><button class="nav-btn ${currentView === "settings" ? "active" : ""}" data-view="settings">Beállítások</button>`;
  const workspace = isAdmin
    ? currentView === "home" ? renderAdminHome(user) : currentView === "calendar" ? renderCalendar(user) : currentView === "notifications" ? renderNotifications(user) : renderAdminContent()
    : isTrainer
      ? currentView === "home" || currentView === "trainer-home" ? renderTrainerContent(user) : currentView === "clients" ? renderTrainerClients(user) : currentView === "calendar" ? renderCalendar(user) : currentView === "coach-profile" ? renderCoachProfileEditor(user) : currentView === "client-detail" ? renderEnhancedClientDetail(selectedClient()) : currentView === "connections" ? renderConnectionCenter(user) : currentView === "notifications" ? renderNotifications(user) : currentView === "settings" ? renderSettings(user) : renderTrainerContent(user)
      : currentView === "home" || currentView === "profile" ? renderClientContent(user) : currentView === "calendar" ? renderCalendar(user) : currentView === "coach-directory" ? renderCoachDirectory() : currentView === "coach-profile-detail" ? renderCoachProfileDetail() : currentView === "connections" ? renderConnectionCenter(user) : currentView === "notifications" ? renderNotifications(user) : currentView === "settings" ? renderSettings(user) : renderClientContent(user);
  return `<main class="app-shell dashboard"><aside class="sidebar"><div class="brand">Rutin<span>Napló</span></div>${navigation}<div class="sidebar-spacer"></div><div class="user-mini"><div class="avatar">${initials(user.name)}</div><div>${escapeHtml(user.name)}<small>${isAdmin ? "Adminisztrátor" : isTrainer ? "Edző" : "Kliens"}</small></div></div><button class="nav-btn" id="logout" style="margin-top:14px">Kijelentkezés</button></aside><section class="main">${renderNotificationPreview(user)}${workspace}${renderLegalLinks()}</section></main>`;
}

function renderTrainerContent(trainer) {
  const clients = data.users.filter((user) => user.role === "client" && (user.trainerIds || []).includes(trainer.id));
  const sessions = clients.reduce((total, client) => total + (client.workouts || []).filter((workout) => workout.trainerId === trainer.id).length, 0);
  const upcoming = upcomingWorkouts(clients).filter((item) => item.workout.trainerId === trainer.id).slice(0, 5);
  return `<div class="topbar"><div><div class="eyebrow">Edzői tér</div><h1>Szia, ${escapeHtml(trainer.name.split(" ")[1] || trainer.name)}.</h1><p>A klienseid és a közelgő edzéseid áttekintése.</p></div><div class="topbar-actions"><button class="btn btn-ghost" data-view="clients">Kliensek</button><button class="btn btn-teal" data-view="calendar">Naptár</button></div></div><div class="stat-grid"><div class="stat"><div class="number">${clients.length}</div><div class="label">Hozzád rendelt kliens</div><div class="trend">Aktív kapcsolat</div></div><div class="stat"><div class="number">${sessions}</div><div class="label">Edzés a naplóban</div><div class="trend">Összes rögzített edzés</div></div><div class="stat"><div class="number">${upcoming.length}</div><div class="label">Közelgő edzés</div><div class="trend">A következő alkalmak</div></div></div><section class="panel"><div class="panel-head"><h2>Közelgő edzések</h2><button class="text-button" data-view="calendar">Naptár megnyitása</button></div>${upcoming.length ? upcoming.map((item) => `<div class="session-row"><div><strong>${escapeHtml(item.workout.date)} · ${escapeHtml(item.workout.time)} · ${escapeHtml(item.workout.type)}</strong><p>${escapeHtml(item.client.name)} · ${item.workout.duration || 0} perc</p></div><button class="text-button" data-client-id="${escapeHtml(item.client.id)}">Kliens megnyitása</button></div>`).join("") : `<div class="empty-state">Nincs közelgő edzés beütemezve.</div>`}</section></div>`;
}

function renderTrainerClients(trainer) {
  const clients = data.users.filter((user) => user.role === "client" && (user.trainerIds || []).includes(trainer.id));
  return `<div class="topbar"><div><div class="eyebrow">Edzői tér / Kliensek</div><h1>Klienseid</h1><p>Minden hozzád rendelt kliens és edzésük.</p></div></div><section class="panel">${renderClientTable(clients)}</section>`;
}

function renderAdminHome(admin) {
  const clients = data.users.filter((user) => user.role === "client");
  const upcoming = upcomingWorkouts(clients).slice(0, 5);
  const date = new Intl.DateTimeFormat("hu-HU", { dateStyle: "full" }).format(new Date());
  return `<div class="topbar"><div><div class="eyebrow">${escapeHtml(date)}</div><h1>Üdv, ${escapeHtml(admin.name.split(" ")[0])}.</h1><p>RutinNapló munkaterületed rövid áttekintése.</p></div><div class="topbar-actions"><button class="btn btn-ghost" data-view="overview">Áttekintés</button><button class="btn btn-teal" data-view="calendar">Naptár</button></div></div><div class="stat-grid"><div class="stat"><div class="number">${clients.length}</div><div class="label">Összes kliens</div><div class="trend">Nyilvántartott kliensfiók</div></div><div class="stat"><div class="number">${trainers().length}</div><div class="label">Edző</div><div class="trend">Nyilvántartott edzőfiók</div></div><div class="stat"><div class="number">${upcoming.length}</div><div class="label">Közelgő edzés</div><div class="trend">A következő alkalmak</div></div></div><div class="content-grid"><section class="panel"><div class="panel-head"><h2>Közelgő edzések</h2><button class="text-button" data-view="calendar">Naptár megnyitása</button></div>${upcoming.length ? upcoming.map((item) => `<div class="session-row"><div><strong>${escapeHtml(item.workout.date)} · ${escapeHtml(item.workout.time)} · ${escapeHtml(item.workout.type)}</strong><p>${escapeHtml(item.client.name)} · ${escapeHtml(trainerName(item.workout.trainerId))}</p></div><button class="text-button" data-client-id="${escapeHtml(item.client.id)}">Kliens megnyitása</button></div>`).join("") : `<div class="empty-state">Nincs közelgő edzés beütemezve.</div>`}</section><section class="panel"><div class="panel-head"><h2>Legutóbbi aktivitás</h2></div>${data.activities.slice(0, 4).map((item) => `<div class="activity"><div class="activity-mark">${escapeHtml(item.mark)}</div><p>${escapeHtml(item.text)}<small>${escapeHtml(item.time)}</small></p></div>`).join("") || `<div class="empty-state">Még nincs aktivitás.</div>`}</section></div>`;
}

function renderAdminContent() {
  if (currentView === "clients") return renderClients();
  if (currentView === "trainers") return renderTrainers();
  if (currentView === "trainer-applications") return renderTrainerApplications();
  if (currentView === "coach-profiles") return renderAdminCoachProfiles();
  if (currentView === "coach-profile-review") return renderCoachProfileDetail();
  if (currentView === "client-detail") return renderEnhancedClientDetail(selectedClient());
  const clients = data.users.filter((user) => user.role === "client");
  const upcoming = upcomingWorkouts(clients).length;
  const adherenceClients = clients.map(workoutStats).filter((stats) => stats.due > 0);
  const averageAdherence = adherenceClients.length ? Math.round(adherenceClients.reduce((sum, stats) => sum + stats.adherence, 0) / adherenceClients.length) : 0;
  const unread = (data.notifications || []).filter((item) => item.userId === currentUser().id && !item.readAt).length;
  return `<div class="topbar"><div><div class="eyebrow">Áttekintés</div><h1>A munkaterületed</h1><p>Aktuális kliens- és edzésadatok egy helyen.</p></div><button class="btn btn-teal" id="add-client">${remoteMode ? "Kliens regisztrációja" : "+ Új kliens"}</button></div><div class="stat-grid"><div class="stat"><div class="number">${clients.length}</div><div class="label">Összes kliens</div><div class="trend">Nyilvántartott kliensfiók</div></div><div class="stat"><div class="number">${upcoming}</div><div class="label">Közelgő edzés</div><div class="trend">Beütemezve</div></div><div class="stat"><div class="number">${averageAdherence}%</div><div class="label">Átlagos teljesítési arány</div><div class="trend">Esedékes és teljesített edzések alapján</div></div><div class="stat"><div class="number">${unread}</div><div class="label">Olvasatlan értesítés</div><div class="trend"><button class="text-button" data-view="notifications">Értesítések megnyitása</button></div></div></div><div class="content-grid"><section class="panel"><div class="panel-head"><h2>Kliens áttekintő</h2><button class="text-button" data-view="clients">Összes megtekintése</button></div>${renderClientTable(clients.slice(0, 4))}</section><section class="panel"><div class="panel-head"><h2>Legutóbbi aktivitás</h2></div>${data.activities.slice(0, 4).map((item) => `<div class="activity"><div class="activity-mark">${escapeHtml(item.mark)}</div><p>${escapeHtml(item.text)}<small>${escapeHtml(item.time)}</small></p></div>`).join("") || `<div class="empty-state">Még nincs aktivitás.</div>`}</section></div>`;
}

function renderCalendar(user) {
  const clients = calendarClientsFor(user);
  const events = clients.flatMap((client) => (client.workouts || []).map((workout, index) => ({
    client,
    workout,
    index,
    date: workoutDateToInputValue(workout.date)
  }))).filter((event) => event.date).sort((a, b) => a.date.localeCompare(b.date) || (a.workout.time || "").localeCompare(b.workout.time || ""));
  const selectedDate = dateFromInputValue(calendarSelectedDate) ? calendarSelectedDate : toDateInputValue(new Date());
  calendarSelectedDate = selectedDate;
  const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - leadingDays);
  const gridDays = Math.ceil((leadingDays + new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate()) / 7) * 7;
  const monthLabel = new Intl.DateTimeFormat("hu-HU", { month: "long", year: "numeric" }).format(firstDay);
  const monthTitle = monthLabel.charAt(0).toLocaleUpperCase("hu-HU") + monthLabel.slice(1);
  const weekdays = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];
  const days = Array.from({ length: gridDays }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const dateValue = toDateInputValue(date);
    const dayEvents = events.filter((event) => event.date === dateValue);
    const outsideMonth = date.getMonth() !== calendarMonth.getMonth();
    return `<article class="calendar-day ${outsideMonth ? "calendar-day-outside" : ""} ${dateValue === selectedDate ? "calendar-day-selected" : ""}"><button type="button" class="calendar-date" data-calendar-date="${dateValue}" aria-pressed="${dateValue === selectedDate}">${date.getDate()}</button><div class="calendar-events">${dayEvents.slice(0, 2).map((event) => user.role === "client"
      ? `<span class="calendar-event" title="${escapeHtml(event.workout.type)}">${escapeHtml(event.workout.time || "")} ${escapeHtml(event.workout.type)}</span>`
      : `<button type="button" class="calendar-event" data-calendar-workout-client="${escapeHtml(event.client.id)}" data-calendar-workout-index="${event.index}" title="${escapeHtml(event.workout.type)} · ${escapeHtml(event.client.name)}">${escapeHtml(event.workout.time || "")} ${escapeHtml(event.workout.type)}</button>`).join("")}${dayEvents.length > 2 ? `<span class="calendar-more">+${dayEvents.length - 2} további</span>` : ""}</div></article>`;
  }).join("");
  const selectedEvents = events.filter((event) => event.date === selectedDate);
  const selectedLabel = new Intl.DateTimeFormat("hu-HU", { dateStyle: "full" }).format(dateFromInputValue(selectedDate));
  const selectedEventRows = selectedEvents.map((event) => `<div class="session-row"><div><strong>${escapeHtml(event.workout.time || "")} · ${escapeHtml(event.workout.type)}</strong><p>${escapeHtml(event.client.name)} · ${event.workout.duration || 0} perc · ${escapeHtml(trainerName(event.workout.trainerId))}</p>${event.workout.notes ? `<p>${escapeHtml(event.workout.notes)}</p>` : ""}</div><span class="status status-${event.workout.status === "Teljesítve" ? "active" : "paused"}">${escapeHtml(event.workout.status || "Beütemezve")}</span>${user.role !== "client" ? `<button type="button" class="text-button" data-calendar-workout-client="${escapeHtml(event.client.id)}" data-calendar-workout-index="${event.index}">Szerkesztés</button>` : ""}</div>`).join("");
  return `<div class="topbar"><div><div class="eyebrow">Munkatér / Naptár</div><h1>Edzésnaptár</h1><p>${user.role === "client" ? "A saját edzéseid áttekintése." : "A kliensek edzései és időpontjai egy helyen."}</p></div><button type="button" class="btn btn-teal" id="calendar-add-workout">${user.role === "client" ? "+ Egyéni edzés" : "+ Új edzés"}</button></div><section class="panel calendar-panel"><div class="calendar-toolbar"><button type="button" class="btn btn-ghost" id="calendar-previous" aria-label="Előző hónap">←</button><h2>${escapeHtml(monthTitle)}</h2><button type="button" class="btn btn-ghost" id="calendar-next" aria-label="Következő hónap">→</button><button type="button" class="text-button" id="calendar-today">Ma</button></div><div class="calendar-grid calendar-weekdays">${weekdays.map((day) => `<div>${day}</div>`).join("")}</div><div class="calendar-grid">${days}</div></section><section class="panel calendar-agenda"><div class="panel-head"><div><h2>${escapeHtml(selectedLabel)}</h2><p>A kiválasztott nap edzései</p></div><span class="eyebrow" style="margin:0">${selectedEvents.length} edzés</span></div>${selectedEventRows || `<div class="empty-state">Erre a napra nincs edzés beütemezve.</div>`}</section>`;
}

function calendarClientsFor(user) {
  if (user.role === "admin") return data.users.filter((item) => item.role === "client");
  if (user.role === "trainer") return data.users.filter((item) => item.role === "client" && (item.trainerIds || []).includes(user.id));
  return [user];
}

function openCalendarWorkout() {
  const user = currentUser();
  const date = dateFromInputValue(calendarSelectedDate) ? calendarSelectedDate : toDateInputValue(new Date());
  if (user.role === "client") {
    openModal(renderWorkoutModalForUser(user, { date, status: "Beütemezve" }));
    return;
  }
  const clients = calendarClientsFor(user);
  if (!clients.length) {
    toast("Nincs olyan kliens, akihez edzést ütemezhetnél.");
    return;
  }
  openModal(`<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">Naptár / Új edzés</div><h2>Kliens kiválasztása</h2></div><button class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><form id="calendar-workout-client-form" data-date="${date}"><div class="field"><label for="calendar-workout-client">Kliens</label><select id="calendar-workout-client" name="clientId" required>${clients.map((client) => `<option value="${escapeHtml(client.id)}">${escapeHtml(client.name)}</option>`).join("")}</select></div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button type="button" class="btn btn-ghost" id="cancel-modal">Mégse</button><button class="btn btn-dark">Tovább</button></div></form></div></div>`);
}

function renderTrainers() {
  const trainerList = trainers();
  return `<div class="topbar"><div><div class="eyebrow">Munkatér / Edzők</div><h1>Edzők</h1><p>Az edzői fiókokat és hozzáféréseket itt kezelheted.</p></div><button class="btn btn-teal" id="add-trainer">+ Új edző</button></div><section class="panel"><div class="table-wrap"><table><thead><tr><th>Edző</th><th>Szakterület</th><th>Hozzárendelt kliens</th><th></th></tr></thead><tbody>${trainerList.length ? trainerList.map((trainer) => `<tr><td><div class="client-cell"><div class="avatar">${initials(trainer.name)}</div>${escapeHtml(trainer.name)}</div><small>${escapeHtml(trainer.email || "")}</small></td><td>${escapeHtml(trainer.specialty || "Általános edzés")}</td><td>${data.users.filter((client) => client.role === "client" && (client.trainerIds || []).includes(trainer.id)).length}</td><td><button class="text-button btn-delete-trainer" data-trainer-id="${trainer.id}">Törlés</button></td></tr>`).join("") : `<tr><td colspan="4"><div class="empty-state">Még nincs edző.</div></td></tr>`}</tbody></table></div></section>`;
}

function renderClientTable(clients) {
  if (!clients.length) return `<div class="empty-state">Még nincs kliens. Add hozzá az első klienst.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Kliens</th><th>Fókusz</th><th>Edzések</th><th>Teljesítés</th><th>Állapot</th><th></th></tr></thead><tbody>${clients.map((client) => `<tr><td><div class="client-cell"><div class="avatar">${initials(client.name)}</div>${escapeHtml(client.name)}</div></td><td>${escapeHtml(client.goal || "Nincs beállítva")}</td><td><strong>${(client.workouts || []).length}</strong> edzés</td><td>${workoutStats(client).adherence}%</td><td><span class="status status-${client.status === "Aktív" ? "active" : "paused"}">${escapeHtml(client.status || "Aktív")}</span></td><td><button class="text-button" data-client-id="${client.id}">Megnyitás</button></td></tr>`).join("")}</tbody></table></div>`;
}

function renderClients() {
  const clients = data.users.filter((user) => user.role === "client");
  return `<div class="topbar"><div><div class="eyebrow">Munkatér / Kliensek</div><h1>Klienseid</h1><p>Minden terv, visszajelzés és edzés egy helyen.</p></div><button class="btn btn-teal" id="add-client">${remoteMode ? "Kliens regisztrációja" : "+ Új kliens"}</button></div><section class="panel"><div class="search-row"><input id="client-search" placeholder="Keresés név vagy e-mail alapján" aria-label="Keresés név vagy e-mail alapján" /></div><div id="client-table">${renderClientTable(clients)}</div></section>`;
}

function renderClientDetail(client) {
  if (!client) return renderClients();
  const workouts = client.workouts || [];
  return `<div class="topbar"><div><button class="text-button" data-view="clients">← Vissza a kliensekhez</button><div class="eyebrow" style="margin-top:18px">Kliens / ${escapeHtml(client.name)}</div><h1>${escapeHtml(client.name)}</h1><p>${escapeHtml(client.goal || "Nincs beállított fókusz")}</p></div><div style="display:flex;gap:10px"><button class="btn btn-ghost" id="edit-client">Profil szerkesztése</button><button class="btn btn-teal" id="add-workout">+ Új edzés</button></div></div><div class="detail-layout"><section class="panel profile-card"><div class="profile-avatar">${initials(client.name)}</div><h2>${escapeHtml(client.name)}</h2><p>${escapeHtml(client.email)}</p><span class="status status-${client.status === "Aktív" ? "active" : "paused"}">${escapeHtml(client.status || "Aktív")}</span><div class="profile-meta"><div class="meta-row"><span>Fókusz</span><strong>${escapeHtml(client.goal || "Nincs beállítva")}</strong></div><div class="meta-row"><span>Csatlakozott</span><strong>${escapeHtml(client.joined || "Ma")}</strong></div><div class="meta-row"><span>Következő edzés</span><strong>${escapeHtml(nextSessionLabel(client))}</strong></div></div></section><section class="panel"><div class="panel-head"><h2>Edzések</h2><span class="eyebrow" style="margin:0">${workouts.length} rögzítve</span></div>${workouts.length ? workouts.map((workout, index) => `<div class="session-row"><div><strong>${escapeHtml(workout.type)}</strong><p>${escapeHtml(workout.date)} · ${escapeHtml(workout.time)} · ${workout.duration} perc</p>${workout.notes ? `<p>${escapeHtml(workout.notes)}</p>` : ""}</div><span class="status status-${workout.status === "Teljesítve" ? "active" : "paused"}">${escapeHtml(workout.status)}</span><button class="text-button" data-workout-index="${index}">Szerkesztés</button></div>`).join("") : `<div class="empty-state">Ehhez a klienshez még nincs rögzített edzés.</div>`}</section></div>`;
}

function renderEnhancedClientDetail(client) {
  if (!client) return renderClients();
  const workouts = client.workouts || [];
  const assignedTrainers = (client.trainerIds || []).map((id) => trainers().find((trainer) => trainer.id === id)).filter(Boolean);
  return `<div class="topbar"><div><button class="text-button" data-view="clients">← Vissza a kliensekhez</button><div class="eyebrow" style="margin-top:18px">Kliens / ${escapeHtml(client.name)}</div><h1>${escapeHtml(client.name)}</h1><p>${escapeHtml(client.goal || "Nincs beállított fókusz")}</p></div><div style="display:flex;gap:10px"><button class="btn btn-ghost" id="edit-client">Profil szerkesztése</button><button class="btn btn-ghost" id="manage-trainers">Edzők kezelése</button><button class="btn btn-teal" id="add-workout">+ Új edzés</button></div></div><div class="detail-layout"><section class="panel profile-card"><div class="profile-avatar">${initials(client.name)}</div><h2>${escapeHtml(client.name)}</h2><p>${escapeHtml(client.email)}</p><span class="status status-${client.status === "Aktív" ? "active" : "paused"}">${escapeHtml(client.status || "Aktív")}</span><div class="profile-meta"><div class="meta-row"><span>Fókusz</span><strong>${escapeHtml(client.goal || "Nincs beállítva")}</strong></div><div class="meta-row"><span>Edzők</span><strong>${assignedTrainers.length ? assignedTrainers.map((trainer) => escapeHtml(trainer.name)).join(", ") : "Nincs hozzárendelve"}</strong></div><div class="meta-row"><span>Következő edzés</span><strong>${escapeHtml(nextSessionLabel(client))}</strong></div></div></section><section class="panel"><div class="panel-head"><h2>Edzések</h2><span class="eyebrow" style="margin:0">${workouts.length} rögzítve</span></div>${workouts.length ? workouts.map((workout, index) => `<div class="session-row"><div><strong>${escapeHtml(workout.type)}</strong><p>${escapeHtml(workout.date)} · ${escapeHtml(workout.time)} · ${workout.duration} perc · ${escapeHtml(trainerName(workout.trainerId))}</p>${workout.notes ? `<p>${escapeHtml(workout.notes)}</p>` : ""}</div><span class="status status-${workout.status === "Teljesítve" ? "active" : "paused"}">${escapeHtml(workout.status)}</span><button class="text-button" data-workout-index="${index}">Szerkesztés</button></div>`).join("") : `<div class="empty-state">Ehhez a klienshez még nincs rögzített edzés.</div>`}</section></div>`;
}

function renderModal(type, client = {}) {
  const isEdit = Boolean(client.id);
  return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">${isEdit ? "Kliensadatok" : "Új kliens"}</div><h2>${isEdit ? "Kliens frissítése" : "Kliens hozzáadása"}</h2></div><button class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><form id="client-form" data-id="${client.id || ""}"><div class="form-grid"><div class="field"><label for="client-name">Teljes név</label><input id="client-name" name="name" required value="${escapeHtml(client.name || "")}" /></div><div class="field"><label for="client-email">E-mail</label><input id="client-email" name="email" type="email" required value="${escapeHtml(client.email || "")}" /></div><div class="field"><label for="client-goal">Fő cél</label><input id="client-goal" name="goal" value="${escapeHtml(client.goal || "")}" placeholder="pl. Erő és mobilitás" /></div><div class="field"><label for="client-status">Állapot</label><select id="client-status" name="status"><option ${client.status === "Aktív" ? "selected" : ""}>Aktív</option><option ${client.status === "Szüneteltetve" ? "selected" : ""}>Szüneteltetve</option></select></div><div class="field span-2"><label for="client-notes">Edzői megjegyzések</label><textarea id="client-notes" name="notes">${escapeHtml(client.notes || "")}</textarea></div></div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button type="button" class="btn btn-ghost" id="cancel-modal">Mégse</button><button class="btn btn-dark">${isEdit ? "Módosítások mentése" : "Kliens létrehozása"}</button></div></form></div></div>`;
}

function renderWorkoutModal(client, workout = {}, index = "") {
  return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">${escapeHtml(client.name)} / Edzés</div><h2>${index === "" ? "Új edzés hozzáadása" : "Edzés szerkesztése"}</h2></div><button class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><form id="workout-form" data-index="${index}" data-client-id="${escapeHtml(client.id)}"><div class="form-grid"><div class="field"><label for="workout-date">Dátum</label><input id="workout-date" name="date" required type="date" value="${escapeHtml(workoutDateToInputValue(workout.date))}" /></div><div class="field"><label for="workout-time">Időpont</label><input id="workout-time" name="time" required type="time" value="${escapeHtml(workout.time || "09:00")}" /></div><div class="field span-2"><label for="workout-type">Edzés típusa</label><input id="workout-type" name="type" required value="${escapeHtml(workout.type || "")}" placeholder="pl. Teljes testes erősítés" /></div><div class="field"><label for="workout-duration">Időtartam (perc)</label><input id="workout-duration" name="duration" required type="number" min="1" value="${workout.duration || 60}" /></div><div class="field"><label for="workout-status">Állapot</label><select id="workout-status" name="status"><option ${workout.status === "Beütemezve" ? "selected" : ""}>Beütemezve</option><option ${workout.status === "Teljesítve" ? "selected" : ""}>Teljesítve</option><option ${workout.status === "Lemondva" ? "selected" : ""}>Lemondva</option></select></div><div class="field span-2"><label for="workout-notes">Megjegyzés</label><textarea id="workout-notes" name="notes" placeholder="Rövid megjegyzés az edzésről">${escapeHtml(workout.notes || "")}</textarea><small class="privacy-warning">Ne írj ide diagnózist, sérülést, gyógyszerelést vagy más egészségügyi adatot.</small></div></div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button type="button" class="btn btn-ghost" id="cancel-modal">Mégse</button><button class="btn btn-dark">Edzés mentése</button></div></form></div></div>`;
}

function renderTrainerAssignmentModal(client) {
  const selected = client.trainerIds || [];
  return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">${escapeHtml(client.name)} / Kapcsolatok</div><h2>Edzők hozzárendelése</h2></div><button class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><form id="trainer-assignment-form"><p style="color:var(--muted);font-size:.84rem;margin-top:0">Egy klienshez több edző is hozzárendelhető. A jelölés kikapcsolásával a kapcsolat megszűnik.</p>${trainers().length ? trainers().map((trainer) => `<label style="display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid var(--line);font-weight:600"><input type="checkbox" name="trainerIds" value="${trainer.id}" ${selected.includes(trainer.id) ? "checked" : ""} /> ${escapeHtml(trainer.name)} <span style="color:var(--muted);font-size:.75rem">${escapeHtml(trainer.specialty || "Edző")}</span></label>`).join("") : `<div class="empty-state">Még nincs regisztrált edző.</div>`}<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px"><button type="button" class="btn btn-ghost" id="cancel-modal">Mégse</button><button class="btn btn-dark">Kapcsolatok mentése</button></div></form></div></div>`;
}

function renderTrainerModal() {
  return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">Adminisztráció</div><h2>Új edző létrehozása</h2></div><button class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><form id="trainer-form"><div class="field"><label for="trainer-name">Teljes név</label><input id="trainer-name" name="name" required /></div><div class="field"><label for="trainer-email">E-mail-cím</label><input id="trainer-email" name="email" type="email" required /></div><div class="field"><label for="trainer-password">Ideiglenes jelszó</label><input id="trainer-password" name="password" type="password" minlength="8" required /></div><div class="field"><label for="trainer-specialty">Szakterület</label><input id="trainer-specialty" name="specialty" placeholder="pl. Erőnléti edzés" /></div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button type="button" class="btn btn-ghost" id="cancel-modal">Mégse</button><button class="btn btn-dark">Edző létrehozása</button></div></form></div></div>`;
}

function renderWorkoutModalForUser(client, workout = {}, index = "") {
  const user = currentUser();
  const trainerId = workout.trainerId || (user.role === "trainer" && index === "" ? user.id : "");
  const availableTrainers = user.role === "admin"
    ? trainers()
    : user.role === "trainer"
      ? trainers().filter((trainer) => trainer.id === user.id || trainer.id === trainerId)
      : [];
  const options = `<option value="solo" ${trainerId ? "" : "selected"}>Egyéni edzés</option>${availableTrainers.map((trainer) => `<option value="${trainer.id}" ${trainerId === trainer.id ? "selected" : ""}>${escapeHtml(trainer.name)}</option>`).join("")}`;
  return renderWorkoutModal(client, workout, index).replace(`<div class="field span-2"><label for="workout-notes">`, `<div class="field span-2"><label for="workout-trainer">Edző</label><select id="workout-trainer" name="trainerId">${options}</select></div><div class="field span-2"><label for="workout-notes">`);
}

function openModal(client = {}) { document.body.insertAdjacentHTML("beforeend", typeof client === "string" ? client : renderModal("client", client)); bindModalEvents(); }
function bindModalEvents() {
  document.querySelector("#close-modal")?.addEventListener("click", () => document.querySelector("#modal-backdrop").remove());
  document.querySelector("#cancel-modal")?.addEventListener("click", () => document.querySelector("#modal-backdrop").remove());
  document.querySelector("#client-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget); const id = event.currentTarget.dataset.id;
    const values = Object.fromEntries(formData.entries());
    if (id) Object.assign(data.users.find((user) => user.id === id), values);
    else { data.users.push({ ...values, id: `client-${Date.now()}`, role: "client", password: "welcome123", joined: formatDate(), sessions: 0, workouts: [] }); data.activities.unshift({ text: `${values.name} új kliensként hozzáadva`, time: "Most", mark: initials(values.name) }); }
    if (remoteMode && id) window.remoteStore.updateProfile(data.users.find((user) => user.id === id)).then(refreshRemote).catch((error) => toast(`Mentési hiba: ${error.message}`));
    saveData(); document.querySelector("#modal-backdrop").remove(); render(); toast(id ? "Kliensadatok frissítve" : "Kliens sikeresen hozzáadva");
  });
  document.querySelector("#workout-form")?.addEventListener("submit", (event) => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); values.duration = Number(values.duration) || 0; const client = data.users.find((user) => user.id === event.currentTarget.dataset.clientId) || (currentUser().role === "client" ? currentUser() : selectedClient()); if (!client) return toast("Nem található a kliens ehhez az edzéshez."); client.workouts ||= []; const index = event.currentTarget.dataset.index;
    if (values.trainerId === "solo") values.trainerId = "";
    const workoutId = index === "" ? "" : client.workouts[Number(index)]?.id || "";
    if (workoutId) values.id = workoutId;
    if (index === "") client.workouts.push(values); else client.workouts[Number(index)] = values;
    client.sessions = client.workouts.filter((workout) => workout.status === "Teljesítve").length; if (remoteMode) window.remoteStore.saveWorkout(client.id, values, workoutId).then(refreshRemote).catch((error) => toast(`Mentési hiba: ${error.message}`)); saveData(); document.querySelector("#modal-backdrop").remove(); render(); toast(index === "" ? "Edzés hozzáadva" : "Edzés frissítve");
  });
  document.querySelector("#calendar-workout-client-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const clientId = new FormData(form).get("clientId");
    const client = calendarClientsFor(currentUser()).find((item) => item.id === clientId);
    if (!client) return toast("Nem található a kiválasztott kliens.");
    const date = form.dataset.date;
    document.querySelector("#modal-backdrop").remove();
    openModal(renderWorkoutModalForUser(client, { date, status: "Beütemezve" }));
  });
  document.querySelector("#trainer-assignment-form")?.addEventListener("submit", (event) => {
    event.preventDefault(); selectedClient().trainerIds = new FormData(event.currentTarget).getAll("trainerIds"); if (remoteMode) window.remoteStore.updateAssignments(selectedClient().id, selectedClient().trainerIds).then(refreshRemote).catch((error) => toast(`Mentési hiba: ${error.message}`)); saveData(); document.querySelector("#modal-backdrop").remove(); render(); toast("Edzői kapcsolatok frissítve");
  });
  document.querySelector("#trainer-form")?.addEventListener("submit", async (event) => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (remoteMode) await window.remoteStore.accountAdmin({ action: "create-trainer", ...values });
      else data.users.push({ ...values, id: `trainer-${Date.now()}`, role: "trainer", trainerIds: [], workouts: [] });
      document.querySelector("#modal-backdrop").remove(); await refreshRemote(); render(); toast("Edzői fiók létrehozva");
    } catch (error) { toast(`Nem sikerült létrehozni: ${error.message}`); }
  });
}

async function deleteCurrentAccount() {
  if (!confirm("Biztosan törlöd a saját fiókodat? Ez a művelet nem vonható vissza.")) return;
  try { if (remoteMode) await window.remoteStore.accountAdmin({ action: "delete-self" }); data.users = data.users.filter((user) => user.id !== currentUser()?.id); session = null; localStorage.removeItem(SESSION_KEY); syncRouteToUrl(true); render(); toast("A fiókod törölve."); }
  catch (error) { toast(`Nem sikerült törölni: ${error.message}`); }
}

async function exportMyData() {
  const user = currentUser();
  if (!user) return toast("A fiókadatok letöltéséhez jelentkezz be.");
  try {
    const exportData = remoteMode
      ? await window.remoteStore.exportMyData()
      : {
          exportedAt: new Date().toISOString(),
          profile: {
            id: user.id,
            role: user.role,
            name: user.name,
            email: user.email,
            specialty: user.specialty || "",
            goal: user.goal || "",
            status: user.status,
            adherence: user.adherence,
            notes: user.notes || ""
          },
          workouts: user.role === "client" ? user.workouts || [] : [],
          connections: (data.users || []).flatMap((item) => [
            ...(item.id === user.id ? (item.trainerIds || []).map((trainerId) => ({ clientId: user.id, trainerId })) : []),
            ...(item.trainerIds || []).includes(user.id) ? [{ clientId: item.id, trainerId: user.id }] : []
          ]),
          connectionRequests: (data.connectionRequests || []).filter((request) => request.requesterId === user.id || request.recipientId === user.id),
          notifications: (data.notifications || []).filter((notification) => notification.userId === user.id),
          coachProfile: user.role === "trainer"
            ? (() => {
                const profile = coachProfileFor(user.id);
                return profile ? { ...profile, photos: (profile.photos || []).map(({ path }) => ({ path })) } : null;
              })()
            : null
        };
    const file = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rutinnaplo-sajat-adataim-${toDateInputValue(new Date())}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Elindult a saját adataid letöltése.");
  } catch (error) {
    toast(`Nem sikerült letölteni az adatokat: ${error.message}`);
  }
}

async function deleteTrainer(trainerId) {
  if (!confirm("Biztosan törlöd ezt az edzői fiókot? A hozzárendelései is megszűnnek.")) return;
  try { if (remoteMode) await window.remoteStore.accountAdmin({ action: "delete-user", userId: trainerId }); data.users = data.users.filter((user) => user.id !== trainerId); render(); toast("Az edző törölve."); }
  catch (error) { toast(`Nem sikerült törölni: ${error.message}`); }
}

function bindEvents() {
  bindStorageNoticeEvents();
  if (remoteMode) document.querySelector("#login-form")?.addEventListener("submit", remoteLogin, { capture: true });
  const loginForm = document.querySelector("#login-form");
  if (loginForm && !document.querySelector("#forgot-password")) {
    const button = document.createElement("button"); button.type = "button"; button.id = "forgot-password"; button.className = "text-button"; button.textContent = "Elfelejtett jelszó"; loginForm.append(button);
    button.addEventListener("click", openForgotPassword);
  }
  document.querySelector("#login-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (remoteMode || !isLocalDevelopmentHost()) return toast("A helyi demó bejelentkezése csak fejlesztői gépen érhető el.");
    const email = document.querySelector("#email").value.trim().toLowerCase(); const password = document.querySelector("#password").value;
    const user = findLocalLoginUser(email, password);
    if (!user) return toast("Az e-mail-cím vagy a jelszó hibás."); session = user.id; localStorage.setItem(SESSION_KEY, session); currentView = defaultViewFor(user); syncRouteToUrl(true); render();
  });
  document.querySelector("#show-register")?.addEventListener("click", () => {
    if (!isPublicRegistrationEnabled()) return toast("A nyilvános regisztráció jelenleg nincs engedélyezve.");
    openRegistrationV2();
  });
  document.querySelectorAll("#app .legal-links [data-legal]").forEach((button) => button.addEventListener("click", () => openLegalDocument(button.dataset.legal)));
  document.querySelector("#logout")?.addEventListener("click", async () => { if (remoteMode) await window.remoteStore.signOut(); session = null; localStorage.removeItem(SESSION_KEY); syncRouteToUrl(true); render(); });
  document.querySelector("#settings-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = currentUser();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    values.email = values.email.trim().toLowerCase();
    if (data.users.some((item) => item.id !== user.id && item.email?.toLowerCase() === values.email)) {
      toast("Ezzel az e-mail-címmel már létezik fiók.");
      return;
    }
    const previous = { name: user.name, email: user.email, goal: user.goal, specialty: user.specialty };
    const emailChanged = values.email !== user.email.toLowerCase();
    Object.assign(user, values);
    try {
      if (remoteMode) {
        await window.remoteStore.updateProfile(user);
        if (emailChanged) await window.remoteStore.updateEmail(user.email);
      }
      saveData();
      render();
      toast(emailChanged && remoteMode ? "Az adatok mentve. Erősítsd meg az új e-mail-címet a postafiókodban." : "A személyes adatok mentve.");
    } catch (error) {
      if (remoteMode) await refreshRemote();
      else Object.assign(user, previous);
      toast(`Nem sikerült menteni a beállításokat: ${error.message}`);
    }
  });
  document.querySelector("#export-my-data")?.addEventListener("click", exportMyData);
  document.querySelector("#delete-account")?.addEventListener("click", deleteCurrentAccount);
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => navigateToView(button.dataset.view)));
  document.querySelectorAll("[data-trainer-application]").forEach((button) => button.addEventListener("click", async () => {
    const userId = button.dataset.userId;
    const decision = button.dataset.trainerApplication;
    const applicant = data.users.find((user) => user.id === userId);
    if (!applicant || applicant.trainerApplicationStatus !== "pending") return toast("Ez a jelentkezés már nem elérhető.");
    try {
      if (remoteMode) {
        await window.remoteStore.accountAdmin({ action: "decide-trainer-application", userId, decision });
        await refreshRemote();
      } else {
        applicant.trainerApplicationStatus = decision;
        if (decision === "approved") applicant.role = "trainer";
        data.trainerApplications = pendingTrainerApplications();
        saveData();
        render();
      }
      toast(decision === "approved" ? "Az edzői jelentkezés jóváhagyva." : "Az edzői jelentkezés elutasítva.");
    } catch (error) {
      toast(`Nem sikerült feldolgozni a jelentkezést: ${error.message}`);
    }
  }));
  document.querySelector("#calendar-previous")?.addEventListener("click", () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    calendarSelectedDate = toDateInputValue(calendarMonth);
    render();
  });
  document.querySelector("#calendar-next")?.addEventListener("click", () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    calendarSelectedDate = toDateInputValue(calendarMonth);
    render();
  });
  document.querySelector("#calendar-today")?.addEventListener("click", () => {
    calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    calendarSelectedDate = toDateInputValue(new Date());
    render();
  });
  document.querySelectorAll("[data-calendar-date]").forEach((button) => button.addEventListener("click", () => {
    const date = dateFromInputValue(button.dataset.calendarDate);
    if (!date) return;
    calendarSelectedDate = button.dataset.calendarDate;
    calendarMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    render();
  }));
  document.querySelector("#calendar-add-workout")?.addEventListener("click", openCalendarWorkout);
  document.querySelectorAll("[data-calendar-workout-client]").forEach((button) => button.addEventListener("click", () => {
    const client = calendarClientsFor(currentUser()).find((item) => item.id === button.dataset.calendarWorkoutClient);
    const index = Number(button.dataset.calendarWorkoutIndex);
    const workout = client?.workouts?.[index];
    if (!client || !workout) return toast("Ez az edzés már nem érhető el.");
    openModal(renderWorkoutModalForUser(client, workout, index));
  }));
  document.querySelectorAll("[data-coach-profile]").forEach((button) => button.addEventListener("click", () => navigateToView("coach-profile-detail", { coachId: button.dataset.coachProfile })));
  document.querySelectorAll("[data-coach-review]").forEach((button) => button.addEventListener("click", () => navigateToView("coach-profile-review", { coachId: button.dataset.coachReview })));
  document.querySelector("#connection-request-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.querySelector("#connection-email").value.trim().toLowerCase();
    try {
      if (remoteMode) {
        await window.remoteStore.createConnectionRequest(email);
        await refreshRemote();
      } else {
        createLocalConnectionRequest(currentUser(), email);
        saveData();
        render();
      }
      toast("A kapcsolódási kérés elküldve.");
    } catch (error) {
      toast(`Nem sikerült elküldeni a kérést: ${error.message}`);
    }
  });
  document.querySelectorAll("[data-connection-decision]").forEach((button) => button.addEventListener("click", async () => {
    const requestId = button.dataset.requestId;
    const decision = button.dataset.connectionDecision;
    try {
      if (remoteMode) {
        await window.remoteStore.respondConnectionRequest(requestId, decision);
        await refreshRemote();
      } else {
        respondLocalConnectionRequest(currentUser(), requestId, decision);
        saveData();
        render();
      }
      toast(decision === "approved" ? "A kapcsolat jóváhagyva." : "A kérés elutasítva.");
    } catch (error) {
      toast(`Nem sikerült frissíteni a kérést: ${error.message}`);
    }
  }));
  document.querySelectorAll("[data-coach-request]").forEach((button) => button.addEventListener("click", async () => {
    const coachId = button.dataset.coachRequest;
    try {
      if (remoteMode) {
        await window.remoteStore.createCoachConnectionRequest(coachId);
        await refreshRemote();
      } else {
        createLocalCoachRequest(currentUser(), coachId);
        saveData();
        render();
      }
      toast("A kapcsolódási kérés elküldve.");
    } catch (error) {
      toast(`Nem sikerült elküldeni a kérést: ${error.message}`);
    }
  }));
  document.querySelector("#coach-profile-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = currentUser();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const files = Array.from(document.querySelector("#coach-photos").files || []);
    const profile = coachProfileFor(user.id) || { id: user.id, name: user.name, photos: [] };
    const existingPhotos = profile.photos || [];
    if (existingPhotos.length + files.length > 5) {
      toast("Legfeljebb 5 képet adhatsz meg összesen.");
      return;
    }
    if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      toast("Csak JPG, PNG vagy WebP kép tölthető fel, legfeljebb 5 MB méretben.");
      return;
    }
    const uploadedPaths = [];
    const locallyStoredPaths = [];
    try {
      let photos = [...existingPhotos];
      if (remoteMode) {
        for (const file of files) {
          const path = await window.remoteStore.uploadCoachPhoto(file);
          uploadedPaths.push(path);
          photos.push({ path, url: "" });
        }
        await window.remoteStore.saveCoachProfile(values.specialty.trim(), values.bio.trim(), photos.map((photo) => photo.path));
        await refreshRemote();
      } else {
        for (const file of files) {
          const path = `local-photo-${crypto.randomUUID()}`;
          await localPhotoRequest("readwrite", (store) => store.put(file, path));
          locallyStoredPaths.push(path);
          photos.push({ path, url: URL.createObjectURL(file) });
        }
        const updatedProfile = { id: user.id, name: user.name, specialty: values.specialty.trim(), bio: values.bio.trim(), photos };
        const index = data.coachProfiles.findIndex((item) => item.id === user.id);
        if (index < 0) data.coachProfiles.push(updatedProfile);
        else data.coachProfiles[index] = updatedProfile;
        user.specialty = updatedProfile.specialty;
        saveData();
        render();
      }
      toast("A bemutatkozásod mentve.");
    } catch (error) {
      let cleanupMessage = "";
      if (remoteMode && uploadedPaths.length) {
        try { await window.remoteStore.deleteCoachPhotos(uploadedPaths); }
        catch (cleanupError) { cleanupMessage = ` Néhány feltöltött kép ideiglenesen megmaradhatott: ${cleanupError.message}`; }
      } else if (locallyStoredPaths.length) {
        try {
          for (const path of locallyStoredPaths) await localPhotoRequest("readwrite", (store) => store.delete(path));
        } catch (cleanupError) {
          cleanupMessage = ` Néhány feltöltött kép ideiglenesen megmaradhatott: ${cleanupError.message}`;
        }
      }
      toast(`Nem sikerült menteni a bemutatkozást: ${error.message}${cleanupMessage}`);
    }
  });
  document.querySelectorAll("[data-remove-coach-photo]").forEach((button) => button.addEventListener("click", async () => {
    const user = currentUser();
    const profile = coachProfileFor(user.id);
    const path = button.dataset.removeCoachPhoto;
    if (!profile) return;
    const remaining = profile.photos.filter((photo) => photo.path !== path);
    try {
      if (remoteMode) {
        await window.remoteStore.saveCoachProfile(profile.specialty, profile.bio, remaining.map((photo) => photo.path));
        await window.remoteStore.deleteCoachPhotos([path]);
        await refreshRemote();
      } else {
        const removedPhoto = profile.photos.find((photo) => photo.path === path);
        await localPhotoRequest("readwrite", (store) => store.delete(path));
        if (removedPhoto?.url) URL.revokeObjectURL(removedPhoto.url);
        profile.photos = remaining;
        saveData();
        render();
      }
      toast("A kép törölve.");
    } catch (error) {
      toast(`Nem sikerült törölni a képet: ${error.message}`);
    }
  }));
  document.querySelector("#mark-notifications-read")?.addEventListener("click", async () => {
    try {
      if (remoteMode) {
        await window.remoteStore.markConnectionNotificationsRead();
        await refreshRemote();
      } else {
        data.notifications.filter((item) => item.userId === currentUser().id && !item.readAt).forEach((item) => { item.readAt = new Date().toISOString(); });
        saveData();
        render();
      }
    } catch (error) {
      toast(`Nem sikerült frissíteni az értesítéseket: ${error.message}`);
    }
  });
  document.querySelector("#add-client")?.addEventListener("click", () => {
    if (remoteMode) {
      openModal(`<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">Supabase fiókkezelés</div><h2>Kliens regisztrációja</h2></div><button class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><p>A kliens a saját e-mail-címével és jelszavával hozza létre a fiókját a bejelentkezési képernyőn található <strong>Regisztráció</strong> gombbal.</p><p>Miután regisztrált, keresd meg a regisztrált e-mail-címe alapján a kapcsolódási panelen, és küldj neki kérést. A kliensnek jóvá kell hagynia a kapcsolatot, mielőtt megjelenik a klienseid között.</p><div style="display:flex;justify-content:flex-end;margin-top:18px"><button type="button" class="btn btn-dark" id="cancel-modal">Értem</button></div></div></div>`);
      return;
    }
    openModal();
  });
  document.querySelectorAll("[data-client-id]").forEach((button) => button.addEventListener("click", () => navigateToView("client-detail", { clientId: button.dataset.clientId })));
  document.querySelector("#edit-client")?.addEventListener("click", () => openModal(selectedClient()));
  document.querySelector("#add-workout")?.addEventListener("click", () => openModal(renderWorkoutModalForUser(currentUser().role === "client" ? currentUser() : selectedClient())));
  if (currentUser()?.role !== "admin") document.querySelector("#manage-trainers")?.remove();
  document.querySelector("#manage-trainers")?.addEventListener("click", () => openModal(renderTrainerAssignmentModal(selectedClient())));
  document.querySelectorAll("[data-workout-index]").forEach((button) => button.addEventListener("click", () => openModal(renderWorkoutModalForUser(selectedClient(), selectedClient().workouts[Number(button.dataset.workoutIndex)], button.dataset.workoutIndex))));
  document.querySelector("#add-trainer")?.addEventListener("click", () => openModal(renderTrainerModal()));
  document.querySelectorAll(".btn-delete-trainer").forEach((button) => button.addEventListener("click", () => deleteTrainer(button.dataset.trainerId)));
  document.querySelector("#client-search")?.addEventListener("input", (event) => { const needle = event.target.value.toLowerCase(); const filtered = data.users.filter((user) => user.role === "client" && `${user.name} ${user.email}`.toLowerCase().includes(needle)); document.querySelector("#client-table").innerHTML = renderClientTable(filtered); document.querySelectorAll("[data-client-id]").forEach((button) => button.addEventListener("click", () => navigateToView("client-detail", { clientId: button.dataset.clientId }))); });
}

function openForgotPassword() {
  document.querySelector("#app").innerHTML = `<main class="auth-shell"><section class="auth-art"><div class="brand">Rutin<span>Napló</span></div><div><h1>Újra hozzáférsz.</h1><p>Add meg az e-mail-címedet, és küldünk egy biztonságos jelszó-visszaállító linket.</p></div><div class="art-footer"><button class="text-button" style="color:var(--teal)" id="back-login">Vissza a bejelentkezéshez</button></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Jelszó visszaállítása</div><h2>Új jelszó kérése</h2><p>A linket az e-mail-fiókodba küldjük.</p><form id="forgot-form"><div class="field"><label for="forgot-email">E-mail-cím</label><input id="forgot-email" type="email" required /></div><div class="auth-actions"><button type="button" class="text-button" id="back-login-2">Mégse</button><button class="btn btn-dark">Link küldése</button></div></form></div></section></main>`;
  document.querySelector("#app").insertAdjacentHTML("beforeend", renderStorageNotice());
  bindStorageNoticeEvents();
  document.querySelectorAll("#back-login, #back-login-2").forEach((button) => button.addEventListener("click", render));
  document.querySelector("#forgot-form").addEventListener("submit", async (event) => { event.preventDefault(); if (!remoteMode) return toast("Helyi demo módban nem küldünk e-mailt. Jelszó-visszaállításhoz állíts be Supabase-kapcsolatot."); try { await window.remoteStore.requestPasswordReset(document.querySelector("#forgot-email").value.trim()); toast("A visszaállító linket elküldtük."); } catch (error) { toast(`Nem sikerült elküldeni: ${error.message}`); } });
}

function renderPasswordReset() {
  document.querySelector("#app").innerHTML = `<main class="auth-shell"><section class="auth-art"><div class="brand">Rutin<span>Napló</span></div><div><h1>Válassz új jelszót.</h1><p>Az új jelszóval ismét biztonságosan beléphetsz.</p></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Jelszó visszaállítása</div><h2>Új jelszó</h2><p>Legalább 8 karaktert használj.</p><form id="reset-form"><div class="field"><label for="reset-password">Új jelszó</label><input id="reset-password" type="password" minlength="8" required /></div><button class="btn btn-dark" type="submit">Jelszó mentése</button></form></div></section></main>`;
  document.querySelector("#app").insertAdjacentHTML("beforeend", renderStorageNotice());
  bindStorageNoticeEvents();
  document.querySelector("#reset-form").addEventListener("submit", async (event) => { event.preventDefault(); try { await window.remoteStore.updatePassword(document.querySelector("#reset-password").value); window.history.replaceState({}, "", window.location.pathname); toast("A jelszó frissítve."); render(); } catch (error) { toast(`Nem sikerült menteni: ${error.message}`); } });
}

function openRegistration() {
  document.querySelector("#app").innerHTML = `<main class="auth-shell"><section class="auth-art"><div class="brand">Rutin<span>Napló</span></div><div><h1>Your next chapter starts here.</h1><p>Register as a client to keep your profile and progress in one calm, focused space.</p></div><div class="art-footer">Already have an account? <button class="text-button" style="color:var(--teal)" id="back-login">Sign in</button></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Client registration</div><h2>Create your profile</h2><p>Your coach will see your registration and follow up with next steps.</p><form id="register-form"><div class="field"><label for="reg-name">Full name</label><input id="reg-name" name="name" required /></div><div class="field"><label for="reg-email">Email address</label><input id="reg-email" name="email" type="email" required /></div><div class="field"><label for="reg-password">Create password</label><input id="reg-password" name="password" type="password" minlength="6" required /></div><div class="field"><label for="reg-goal">What are you working toward?</label><input id="reg-goal" name="goal" required placeholder="e.g. Feel stronger and more mobile" /></div><div class="auth-actions"><button type="button" class="text-button" id="back-login-2">Back to sign in</button><button class="btn btn-dark">Register</button></div></form></div></section></main>`;
  document.querySelector("#app").innerHTML = `<main class="auth-shell"><section class="auth-art"><div class="brand">Rutin<span>Napló</span></div><div><h1>Az új fejezeted itt kezdődik.</h1><p>Regisztrálj kliensként, és tartsd egy helyen a profilodat és a fejlődésedet.</p></div><div class="art-footer">Már van fiókod? <button class="text-button" style="color:var(--teal)" id="back-login">Bejelentkezés</button></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Kliensregisztráció</div><h2>Profil létrehozása</h2><p>Az edződ látni fogja a regisztrációdat, és jelentkezik a következő lépésekkel.</p><form id="register-form"><div class="field"><label for="reg-name">Teljes név</label><input id="reg-name" name="name" required /></div><div class="field"><label for="reg-email">E-mail-cím</label><input id="reg-email" name="email" type="email" required /></div><div class="field"><label for="reg-password">Jelszó létrehozása</label><input id="reg-password" name="password" type="password" minlength="6" required /></div><div class="field"><label for="reg-goal">Min szeretnél dolgozni?</label><input id="reg-goal" name="goal" required placeholder="pl. Erősebb és mozgékonyabb szeretnék lenni" /></div><div class="auth-actions"><button type="button" class="text-button" id="back-login-2">Vissza a bejelentkezéshez</button><button class="btn btn-dark">Regisztráció</button></div></form></div></section></main>`;
  document.querySelectorAll("#back-login, #back-login-2").forEach((button) => button.addEventListener("click", render));
  document.querySelector("#register-form").addEventListener("submit", (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); if (data.users.some((user) => user.email.toLowerCase() === values.email.toLowerCase())) return toast("An account with that email already exists."); const user = { ...values, id: `client-${Date.now()}`, role: "client", status: "Active", joined: formatDate(), sessions: 0, adherence: 0, nextSession: "To be scheduled", notes: "New client - schedule an onboarding session." }; data.users.push(user); data.activities.unshift({ text: `${user.name} registered as a new client`, time: "Just now", mark: initials(user.name) }); saveData(); session = user.id; localStorage.setItem(SESSION_KEY, session); render(); toast("Üdvözlünk a RutinNaplóban"); });
}

function renderClientContent(user) {
  const workouts = user.workouts || [];
  const stats = workoutStats(user);
  return `<div class="topbar"><div><div class="eyebrow">Kezdőlap</div><h1>Szia, ${escapeHtml(user.name.split(" ")[0])}.</h1><p>A következetesség a munka. Folytasd.</p></div><div class="topbar-actions"><button class="btn btn-ghost" data-view="calendar">Edzésnaptár</button><button class="btn btn-teal" id="add-workout">+ Egyéni edzés</button></div></div><div class="detail-layout"><section class="panel profile-card"><div class="profile-avatar">${initials(user.name)}</div><h2>${escapeHtml(user.name)}</h2><p>${escapeHtml(user.email)}</p><span class="status status-${user.status === "Aktív" ? "active" : "paused"}">${escapeHtml(user.status || "Aktív")}</span><div class="profile-meta"><div class="meta-row"><span>Fókusz</span><strong>${escapeHtml(user.goal || "Nincs beállítva")}</strong></div><div class="meta-row"><span>Edzők</span><strong>${(user.trainerIds || []).map((id) => escapeHtml(trainerName(id))).join(", ") || "Nincs hozzárendelve"}</strong></div><div class="meta-row"><span>Következő edzés</span><strong>${escapeHtml(nextSessionLabel(user))}</strong></div></div></section><section class="panel"><div class="panel-head"><h2>Edzésstatisztika</h2><span class="eyebrow" style="margin:0">Összesített</span></div><div class="metric-grid"><div class="metric"><strong>${stats.completed}</strong><span>Teljesített edzés</span></div><div class="metric"><strong>${stats.upcoming}</strong><span>Közelgő edzés</span></div><div class="metric"><strong>${stats.adherence}%</strong><span>Teljesítési arány</span></div></div><h3>Esedékes edzések teljesítése</h3><div class="progress-bar" role="progressbar" aria-label="Esedékes edzések teljesítése" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.adherence}"><span style="width:${stats.adherence}%"></span></div><p class="settings-help">${stats.completed} teljesített a ${stats.due} esedékes vagy teljesített, nem lemondott edzésből. A jövőbeli edzéseket még nem számítjuk bele.</p><div class="panel-head" style="margin-top:28px"><h2>Edzésnapló</h2></div>${workouts.length ? workouts.map((workout) => `<div class="session-row"><div><strong>${escapeHtml(workout.type)}</strong><p>${escapeHtml(workout.date)} · ${escapeHtml(workout.time)} · ${workout.duration} perc · ${escapeHtml(trainerName(workout.trainerId))}</p></div><span class="status status-${workout.status === "Teljesítve" ? "active" : "paused"}">${escapeHtml(workout.status)}</span></div>`).join("") : `<div class="empty-state">Még nincs rögzített edzés.</div>`}<div class="panel" style="background:var(--mint);border:0;margin-top:20px"><h3>Edzői megjegyzés</h3><p style="font-size:.84rem;line-height:1.55;margin-bottom:0">${escapeHtml(user.notes || "Tartsd a fókuszt és figyelj a mozgásminőségre.")}</p></div></section></div>`;
}

restoreRouteFromUrl();
render();
window.remoteStore?.onPasswordRecovery?.(() => {
  if (!document.querySelector("#reset-form")) renderPasswordReset();
});
initializeRemote();

function openRegistrationV2() {
  if (!isPublicRegistrationEnabled()) {
    toast("A nyilvános regisztráció a jogi és szolgáltatói adatok véglegesítéséig szünetel.");
    return;
  }
  document.querySelector("#app").innerHTML = `<main class="auth-shell"><section class="auth-art"><div class="brand">Rutin<span>Napló</span></div><div><h1>Az új fejezeted itt kezdődik.</h1><p>Hozz létre kliensfiókot, vagy jelentkezz edzőkénti elbírálásra.</p></div><div class="art-footer">Már van fiókod? <button class="text-button" style="color:var(--teal)" id="back-login">Bejelentkezés</button></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Regisztráció · 18+</div><h2>Fiók létrehozása</h2><p>Adj meg egy e-mail-címet, amelyhez hozzáférsz${remoteMode ? " a megerősítő levélhez" : ""}.</p><form id="register-form"><div class="field"><label for="reg-role">Fiók típusa</label><select id="reg-role" name="role"><option value="client">Kliensként regisztrálok</option><option value="trainer">Edzőként jelentkezem</option></select></div><div class="field"><label for="reg-name">Teljes név</label><input id="reg-name" name="name" autocomplete="name" required /></div><div class="field"><label for="reg-email">E-mail-cím</label><input id="reg-email" name="email" type="email" autocomplete="email" required /></div><div class="field"><label for="reg-password">Jelszó létrehozása</label><input id="reg-password" name="password" type="password" autocomplete="new-password" minlength="8" required /></div><div class="field" id="reg-goal-field"><label for="reg-goal">Edzéscél (nem kötelező)</label><input id="reg-goal" name="goal" maxlength="160" placeholder="pl. Rendszeresebben szeretnék edzeni" /><small class="settings-help">Ne írj ide diagnózist, sérülést, gyógyszerelést vagy más egészségügyi adatot.</small></div><div class="field" id="reg-specialty-field" style="display:none"><label for="reg-specialty">Szakterület</label><input id="reg-specialty" name="specialty" maxlength="120" placeholder="pl. Erőnléti edzés" /></div><div class="legal-acknowledgements"><label><input type="checkbox" name="ageConfirmed" value="yes" required /> Kijelentem, hogy betöltöttem a 18. életévemet.</label><label><input type="checkbox" name="privacyAcknowledged" value="yes" required /> Elolvastam az adatkezelési tájékoztató tervezetét.</label><label><input type="checkbox" name="termsAcknowledged" value="yes" required /> Tudomásul veszem, hogy a felhasználási feltételek tervezet, és a szolgáltatás jelenleg tesztelés alatt áll.</label>${renderLegalLinks()}</div><div class="legal-status" role="status">A regisztráció most elérhető tesztelésre, de a jogi dokumentumok még tervezetek. Ne használj egészségügyi adatot. Edzői jelentkezésnél az e-mail-megerősítés után az adminisztrátor bírálja el a kérelmet; jóváhagyásig nem kapsz kliens- vagy edzői hozzáférést. A fiók létrehozása nem jelent fizetős előfizetést.</div><div class="auth-actions"><button type="button" class="text-button" id="back-login-2">Vissza a bejelentkezéshez</button><button class="btn btn-dark">Fiók létrehozása</button></div></form></div></section></main>`;
  const roleSelect = document.querySelector("#reg-role");
  const updateRegistrationFields = () => {
    const trainer = roleSelect.value === "trainer";
    document.querySelector("#reg-goal-field").style.display = trainer ? "none" : "block";
    document.querySelector("#reg-goal").disabled = trainer;
    document.querySelector("#reg-specialty-field").style.display = trainer ? "block" : "none";
    document.querySelector("#reg-specialty").required = trainer;
    document.querySelector("#reg-specialty").disabled = !trainer;
  };
  roleSelect.addEventListener("change", updateRegistrationFields);
  updateRegistrationFields();
  document.querySelectorAll("#back-login, #back-login-2").forEach((button) => button.addEventListener("click", render));
  if (remoteMode) document.querySelector("#register-form")?.addEventListener("submit", remoteRegister, { capture: true });
  document.querySelector("#register-form").addEventListener("submit", (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); if (!values.ageConfirmed || !values.privacyAcknowledged || !values.termsAcknowledged) return toast("A folytatáshoz jelöld be a szükséges nyilatkozatokat."); const email = values.email.trim().toLowerCase(); if (data.users.some((user) => user.email.toLowerCase() === email)) return toast("Ezzel az e-mail-címmel már létezik fiók."); const isTrainerApplicant = values.role === "trainer"; const user = { id: `${isTrainerApplicant ? "applicant" : "client"}-${Date.now()}`, role: "client", trainerApplicationStatus: isTrainerApplicant ? "pending" : "none", emailConfirmed: true, name: values.name.trim(), email, goal: values.goal?.trim() || "", specialty: values.specialty?.trim() || "", status: "Aktív", joined: formatDate(), createdAt: new Date().toISOString(), sessions: 0, adherence: 0, trainerIds: [], workouts: [], nextSession: "Nincs beütemezve", notes: isTrainerApplicant ? "" : "Új kliens - bevezető edzés beütemezése szükséges." }; data.users.push(user); data.activities.unshift({ text: isTrainerApplicant ? `${user.name} edzőnek jelentkezett` : `${user.name} új kliensként regisztrált`, time: "Most", mark: initials(user.name) }); saveData(); session = user.id; localStorage.setItem(SESSION_KEY, session); currentView = "profile"; syncRouteToUrl(true); render(); toast(isTrainerApplicant ? "A jelentkezésed rögzítettük. Az adminisztrátor elbírálja." : "Kliensfiók létrehozva"); });
}
