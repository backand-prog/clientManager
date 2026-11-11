import * as api from "./api.js";
import * as auth from "./auth.js";
import { currentUser, isPublicRegistrationEnabled } from "./auth.js";
import {
  data,
  session,
  currentView,
  selectedClientId,
  selectedCoachId,
  calendarMonth,
  storageNoticeDismissed,
  remoteMode,
  emptyAppData,
  setData,
  setSession,
  setCurrentView,
  setSelectedClientId,
  setSelectedCoachId,
  setCalendarMonth,
  setCalendarSelectedDate,
  setAdminDashboardPeriod,
  setStorageNoticeDismissed
} from "./state.js";
import { toDateInputValue } from "./utils.js";
import { calendarClientsFor, coachProfileFor, currentPlan, dateFromInputValue, escapeHtml, initials, pendingTrainerApplications, planLabel, selectedClient, trainers } from "./helpers.js";
import { openModal, openUpgradeModal, renderStudioCoachModal, renderTrainerAssignmentModal, renderTrainerModal, renderWorkoutModalForUser } from "./modals.js";
import { deleteTrainer, grantAdminRole, loadAdminAccounts, loadTrainerEmails, renderAdminContent, renderAdminHome } from "./views/admin.js";
import { openCalendarWorkout, renderCalendar, renderGroupWorkoutModal } from "./views/calendar.js";
import { renderClientTable, renderEnhancedClientDetail, renderTrainerClients } from "./views/clients.js";
import { renderCoachDirectory, renderCoachProfileDetail, renderCoachProfileEditor } from "./views/coaches.js";
import { renderClientContent, renderConnectionCenter, renderNotificationPreview, renderNotifications, renderSettings, renderSubscription, renderStudioTeam, isStudioLeaderActive, renderTrainerContent, renderUserGuide } from "./views/general.js";
import { renderTrainingPlanModal, renderTrainingPlans } from "./views/trainingPlans.js";
import { registerRuntime } from "./runtime.js";

function renderLegalLinks() {
  return `<div class="legal-links" aria-label="Jogi dokumentumok"><button type="button" data-legal="privacy">Adatkezelési tájékoztató (tervezet)</button><button type="button" data-legal="terms">Felhasználási feltételek (tervezet)</button><button type="button" data-legal="cookies">Süti- és helyi tárolási tájékoztató</button></div>`;
}

function renderStorageNotice() {
  if (storageNoticeDismissed) return "";
  return `<aside class="storage-notice" aria-label="Sütik és helyi tárolás" aria-live="polite"><div><strong>Csak a működéshez szükséges böngészős tárolást használjuk.</strong><p>Nem használunk analitikai vagy hirdetési sütiket. Részletek a kezelt tárolókról és azok céljáról:</p></div><div class="storage-notice-actions"><button type="button" class="text-button" data-legal="cookies">Részletek</button><button type="button" class="btn btn-ghost" id="dismiss-storage-notice">Tudomásul vettem</button></div></aside>`;
}

function bindStorageNoticeEvents() {
  document.querySelector("#dismiss-storage-notice")?.addEventListener("click", () => {
    setStorageNoticeDismissed(true);
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
  dialog.innerHTML = `<div class="panel-head"><div><div class="eyebrow">BackPlan · ${escapeHtml(window.LEGAL_NOTICES.status === "draft" ? "Tervezet" : "Hatályos")}</div><h2 id="legal-dialog-title">${escapeHtml(documentInfo.title)}</h2></div><button type="button" class="close" aria-label="Bezárás">&times;</button></div><p class="settings-help">Dokumentumverzió: ${escapeHtml(documentVersion)} · Utolsó tervezet: 2026. október 28.</p>${window.LEGAL_NOTICES.status === "draft" ? `<div class="legal-status" role="status">Ez a dokumentum tervezet, nem végleges jogi tájékoztató vagy szerződési feltétel. A 18+ kliensregisztráció és edzői jelentkezés tesztelésre elérhető; fizetési funkció nincs.</div>` : ""}${sections}`;
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
    if (currentView === "guide") return "/admin/guide";
    if (currentView === "training-plans") return "/admin/training-plans";
    if (currentView === "home") return "/admin/home";
    if (currentView === "overview") return "/admin/overview";
    if (currentView === "calendar") return "/admin/calendar";
    if (currentView === "clients") return "/admin/clients";
    if (currentView === "trainers") return "/admin/trainers";
    if (currentView === "trainer-applications") return "/admin/trainer-applications";
    if (currentView === "administrators") return "/admin/administrators";
    if (currentView === "notifications") return "/admin/notifications";
    if (currentView === "coach-profiles") return "/admin/coach-profiles";
    if (currentView === "coach-profile-review") return `/admin/coach-profiles/${encodeURIComponent(selectedCoachId || "")}`;
    if (currentView === "client-detail") return `/admin/clients/${encodeURIComponent(selectedClientId || "")}`;
    return "/admin/settings";
  }
  if (user.role === "trainer") {
    if (currentView === "guide") return "/coach/guide";
    if (currentView === "training-plans") return "/coach/training-plans";
    if (currentView === "home" || currentView === "trainer-home") return "/coach/home";
    if (currentView === "clients") return "/coach/clients";
    if (currentView === "calendar") return "/coach/calendar";
    if (currentView === "coach-profile") return "/coach/profile";
    if (currentView === "client-detail") return `/coach/clients/${encodeURIComponent(selectedClientId || "")}`;
    if (currentView === "connections") return "/coach/connections";
    if (currentView === "notifications") return "/coach/notifications";
    if (currentView === "subscription") return "/coach/subscription";
    if (currentView === "team") return "/coach/team";
    return "/coach/settings";
  }
  if (currentView === "guide") return "/client/guide";
  if (currentView === "training-plans") return "/client/training-plans";
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
  setCurrentView(view);
  setSelectedClientId(view === "client-detail" ? clientId : null);
  setSelectedCoachId(["coach-profile-detail", "coach-profile-review"].includes(view) ? coachId : null);
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
  setCurrentView(defaultViewFor(user));
  setSelectedClientId(null);
  setSelectedCoachId(null);

  if (user.role === "admin") {
    if (segments[0] === "admin" && segments[1] === "guide") setCurrentView("guide");
    else if (segments[0] === "admin" && segments[1] === "training-plans") setCurrentView("training-plans");
    else if (segments[0] === "admin" && segments[1] === "home") setCurrentView("home");
    else if (segments[0] === "admin" && segments[1] === "overview") setCurrentView("overview");
    else if (segments[0] === "admin" && segments[1] === "calendar") setCurrentView("calendar");
    else if (segments[0] === "admin" && segments[1] === "clients" && segments[2]) {
      setCurrentView("client-detail");
      setSelectedClientId(segments[2]);
    } else if (segments[0] === "admin" && segments[1] === "clients") setCurrentView("clients");
    else if (segments[0] === "admin" && segments[1] === "trainers") setCurrentView("trainers");
    else if (segments[0] === "admin" && segments[1] === "trainer-applications") setCurrentView("trainer-applications");
    else if (segments[0] === "admin" && segments[1] === "administrators") setCurrentView("administrators");
    else if (segments[0] === "admin" && segments[1] === "notifications") setCurrentView("notifications");
    else if (segments[0] === "admin" && segments[1] === "coach-profiles" && segments[2]) {
      setCurrentView("coach-profile-review");
      setSelectedCoachId(segments[2]);
    } else if (segments[0] === "admin" && segments[1] === "coach-profiles") setCurrentView("coach-profiles");
    else if (segments[0] === "admin") setCurrentView(segments[1] === "settings" ? "settings" : "overview");
  } else if (user.role === "trainer") {
    if (segments[0] === "coach" && segments[1] === "guide") setCurrentView("guide");
    else if (segments[0] === "coach" && segments[1] === "training-plans") setCurrentView("training-plans");
    else if (segments[0] === "coach" && segments[1] === "home") setCurrentView("home");
    else if (segments[0] === "coach" && segments[1] === "calendar") setCurrentView("calendar");
    else if (segments[0] === "coach" && segments[1] === "profile") setCurrentView("coach-profile");
    else if (segments[0] === "coach" && segments[1] === "connections") setCurrentView("connections");
    else if (segments[0] === "coach" && segments[1] === "notifications") setCurrentView("notifications");
    else if (segments[0] === "coach" && segments[1] === "settings") setCurrentView("settings");
    else if (segments[0] === "coach" && segments[1] === "subscription") setCurrentView("subscription");
    else if (segments[0] === "coach" && segments[1] === "team") setCurrentView("team");
    else if (segments[0] === "coach" && segments[1] === "clients" && segments[2]) {
      setCurrentView("client-detail");
      setSelectedClientId(segments[2]);
    } else if (segments[0] === "coach" && segments[1] === "clients") setCurrentView("clients");
  } else if (segments[0] === "client" && segments[1] === "guide") setCurrentView("guide");
  else if (segments[0] === "client" && segments[1] === "training-plans") setCurrentView("training-plans");
  else if (segments[0] === "client" && segments[1] === "calendar") setCurrentView("calendar");
  else if (segments[0] === "client" && segments[1] === "connections") setCurrentView("connections");
  else if (segments[0] === "client" && segments[1] === "notifications") setCurrentView("notifications");
  else if (segments[0] === "client" && segments[1] === "settings") setCurrentView("settings");
  else if (segments[0] === "client" && segments[1] === "coaches" && segments[2]) {
    setCurrentView("coach-profile-detail");
    setSelectedCoachId(segments[2]);
  } else if (segments[0] === "client" && segments[1] === "coaches") setCurrentView("coach-directory");
  else if (segments[0] === "client") setCurrentView("profile");

  syncRouteToUrl(true);
}

function toast(message) { const region = document.querySelector("#toast-region"); region.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`; setTimeout(() => { region.innerHTML = ""; }, 3000); }

async function refreshRemote() {
  if (!remoteMode) return;
  try {
    const remoteData = await api.load();
    if (remoteData) {
      setData(remoteData);
      setSession(remoteData.sessionId);
      if (currentView === "administrators") data.adminAccounts = await api.listAdminAccounts();
      if (currentView === "subscriptions") data.adminSubscriptions = await api.listSubscriptions();
      render();
    }
  } catch (error) { toast(`Adatbázis-hiba: ${error.message}`); }
}

async function handleCheckoutReturn() {
  const params = new URLSearchParams(window.location.search);
  const result = params.get("checkout");
  if (!result) return;
  params.delete("checkout");
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  if (result !== "success") { toast("A fizetés megszakadt, a csomagod nem változott."); return; }

  toast("Sikeres fizetés! Az előfizetésed frissítése folyamatban…");
  const before = currentPlan();
  // A Stripe webhook a visszairányítás után pár másodperccel érkezhet meg.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await refreshRemote();
    if (currentPlan() !== before) { toast(`Az előfizetésed aktív: ${planLabel()} csomag.`); return; }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  toast("A fizetés megtörtént, a csomag frissítése kis időt vehet igénybe. Később frissítsd az oldalt.");
}

async function initializeRemote() {
  if (!remoteMode) {
    setSession(null);
    render();
    toast("Az alkalmazás háttérrendszere nincs konfigurálva.");
    return;
  }
  if (window.location.search.includes("password-reset=1") || window.location.hash.includes("type=recovery")) { renderPasswordReset(); return; }
  try {
    const remoteData = await api.load();
    if (remoteData) {
      setData(remoteData);
      setSession(remoteData.sessionId);
      restoreRouteFromUrl();
      if (currentView === "administrators") data.adminAccounts = await api.listAdminAccounts();
      if (currentView === "subscriptions") data.adminSubscriptions = await api.listSubscriptions();
      render();
      await handleCheckoutReturn();
    } else {
      setSession(null);
      render();
    }
  } catch (error) {
    setSession(null);
    setData(emptyAppData());
    render();
    toast(`A szolgáltatás háttérrendszere nem érhető el: ${error.message}`);
  }
}

async function remoteLogin(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  const email = document.querySelector("#email").value.trim().toLowerCase();
  const password = document.querySelector("#password").value;
  try { const remoteData = await auth.signIn(email, password); setData(remoteData); setSession(remoteData.sessionId); setCurrentView(defaultViewFor(currentUser())); syncRouteToUrl(true); render(); }
  catch (error) {
    const networkFailure = error instanceof TypeError || /failed to fetch|fetch failed|networkerror|err_name_not_resolved/i.test(String(error?.message || error));
    if (networkFailure) {
      setSession(null);
      setData(emptyAppData());
      render();
      toast("A Supabase nem érhető el. Ellenőrizd a kapcsolatot, majd próbálj újra bejelentkezni.");
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
    const user = await auth.signUp(values);
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
    <section class="auth-art"><div class="brand">Back<span>Plan</span></div><div><h1>Tedd láthatóvá a fejlődést.</h1><p>Átlátható munkatér személyi edzőknek, ahol minden kliens fejlődése egy helyen követhető.</p></div><div class="art-footer">Privát klienskezelés független edzőknek.</div></section>
    <section class="auth-panel"><div class="auth-card">
      <div class="eyebrow">Edzői munkatér</div><h2>Üdv újra</h2><p>Jelentkezz be a praxisod kezeléséhez.</p>
      <form id="login-form"><div class="field"><label for="email">E-mail-cím</label><input id="email" type="email" autocomplete="username" required placeholder="te@example.com" /></div><div class="field"><label for="password">Jelszó</label><input id="password" type="password" autocomplete="current-password" required placeholder="Írd be a jelszavad" /></div><div class="auth-actions"><button type="button" class="text-button" id="show-register" ${isPublicRegistrationEnabled() ? "" : "disabled"}>Regisztráció</button><button class="btn btn-dark" type="submit">Bejelentkezés</button></div></form>
      ${window.LEGAL_NOTICES?.status === "draft" ? `<div class="legal-status" role="status">A 18+ kliensregisztráció és edzői jelentkezés elérhető tesztelésre. A jogi tájékoztatók tervezetek; a szolgáltatás nem tekinthető hivatalos, éles indulásra késznek.</div>` : ""}
      ${renderLegalLinks()}
    </div></section>
  </main>`;
}

function renderTrainerApplicationStatus(user) {
  const rejected = user.trainerApplicationStatus === "rejected";
  const emailConfirmed = user.emailConfirmed !== false;
  return `<main class="auth-shell"><section class="auth-art"><div class="brand">Back<span>Plan</span></div><div><h1>${rejected ? "Köszönjük a jelentkezésed." : "A jelentkezésed megérkezett."}</h1><p>${rejected ? "Az adminisztrátor most nem hagyta jóvá az edzői hozzáférést." : "Az edzői munkatér az adminisztrátori elbírálásig nem érhető el."}</p></div><div class="art-footer">BackPlan · Edzői jelentkezés</div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">${rejected ? "Jelentkezés lezárva" : "Elbírálás folyamatban"}</div><h2>${rejected ? "A jelentkezésedet elutasítottuk" : "Az adminisztrátori döntésre vársz"}</h2><p>${rejected ? "Ha úgy gondolod, hogy tévedés történt, vedd fel a kapcsolatot az alkalmazás üzemeltetőjével." : `${emailConfirmed ? "Az e-mail-címed megerősítve." : "Erősítsd meg a regisztrációkor megadott e-mail-címet."} Az adminisztrátor ellenőrzi a jelentkezésedet, és jóváhagyás esetén aktiválja az edzői fiókot.`}</p><div class="legal-status" role="status">${rejected ? "Az edzői funkciókhoz nem férsz hozzá. Új jelentkezéshez fordulj az üzemeltetőhöz." : `Jelentkező: ${escapeHtml(user.name)} · Szakterület: ${escapeHtml(user.specialty || "Nincs megadva")}. Jóváhagyásig nem férsz hozzá kliens- vagy edzői munkatérhez.`}</div><div class="auth-actions"><a class="btn btn-ghost" href="/BackPlan_felhasznaloi_kezikonyv.pdf" target="_blank" rel="noopener">Felhasználói kézikönyv</a><button class="btn btn-ghost" id="logout">Kijelentkezés</button><button class="btn btn-danger" id="delete-account">Fiók törlése</button></div></div></section></main>`;
}

function renderDashboard(user) {
  const isAdmin = user.role === "admin";
  const isTrainer = user.role === "trainer";
  const unreadCount = (data.notifications || []).filter((item) => item.userId === user.id && !item.readAt).length;
  const notificationBadge = unreadCount ? `<span class="nav-badge" aria-label="${unreadCount} olvasatlan értesítés">${unreadCount > 9 ? "9+" : unreadCount}</span>` : "";
  const notificationsBtn = `<button class="nav-btn ${currentView === "notifications" ? "active" : ""}" data-view="notifications">Értesítések${notificationBadge}</button>`;
  const guideBtn = `<button class="nav-btn ${currentView === "guide" ? "active" : ""}" data-view="guide">Felhasználói kézikönyv</button>`;
  const settingsBtn = `<button class="nav-btn ${currentView === "settings" ? "active" : ""}" data-view="settings">Beállítások</button>`;
  const plansBtn = `<button class="nav-btn ${currentView === "training-plans" ? "active" : ""}" data-view="training-plans">Edzéstervek</button>`;
  const navigation = isAdmin
    ? `<div class="nav-label">Munkatér</div><button class="nav-btn ${currentView === "overview" ? "active" : ""}" data-view="overview">Áttekintés</button><button class="nav-btn ${currentView === "home" ? "active" : ""}" data-view="home">Kezdőlap</button><button class="nav-btn ${currentView === "clients" || currentView === "client-detail" ? "active" : ""}" data-view="clients">Kliensek</button><button class="nav-btn ${currentView === "trainers" ? "active" : ""}" data-view="trainers">Edzők</button><button class="nav-btn ${currentView === "calendar" ? "active" : ""}" data-view="calendar">Naptár</button>${plansBtn}<button class="nav-btn ${currentView === "trainer-applications" ? "active" : ""}" data-view="trainer-applications">Edzői jelentkezések${pendingTrainerApplications().length ? ` (${pendingTrainerApplications().length})` : ""}</button><button class="nav-btn ${["coach-profiles", "coach-profile-review"].includes(currentView) ? "active" : ""}" data-view="coach-profiles">Edzői profilok</button><button class="nav-btn ${currentView === "administrators" ? "active" : ""}" data-view="administrators">Adminisztrátorok</button><button class="nav-btn ${currentView === "subscriptions" ? "active" : ""}" data-view="subscriptions">Előfizetések</button>${notificationsBtn}<div class="nav-label">Rendszer</div>${guideBtn}`
    : isTrainer
      ? `<div class="nav-label">Edzői tér</div><button class="nav-btn ${currentView === "home" || currentView === "trainer-home" ? "active" : ""}" data-view="home">Kezdőlap</button><button class="nav-btn ${currentView === "clients" || currentView === "client-detail" ? "active" : ""}" data-view="clients">Kliensek</button><button class="nav-btn ${currentView === "calendar" ? "active" : ""}" data-view="calendar">Naptár</button>${plansBtn}<button class="nav-btn ${currentView === "coach-profile" ? "active" : ""}" data-view="coach-profile">Bemutatkozásom</button><button class="nav-btn ${currentView === "connections" ? "active" : ""}" data-view="connections">Kapcsolatok</button>${isStudioLeaderActive() ? `<button class="nav-btn ${currentView === "team" ? "active" : ""}" data-view="team">Csapatom</button>` : ""}<button class="nav-btn ${currentView === "subscription" ? "active" : ""}" data-view="subscription">Előfizetés</button>${notificationsBtn}<div class="nav-label">Rendszer</div>${settingsBtn}${guideBtn}`
      : `<div class="nav-label">Saját tér</div><button class="nav-btn ${currentView === "home" || currentView === "profile" ? "active" : ""}" data-view="home">Kezdőlap</button><button class="nav-btn ${currentView === "calendar" ? "active" : ""}" data-view="calendar">Naptár</button>${plansBtn}<button class="nav-btn ${["coach-directory", "coach-profile-detail"].includes(currentView) ? "active" : ""}" data-view="coach-directory">Edzők böngészése</button><button class="nav-btn ${currentView === "connections" ? "active" : ""}" data-view="connections">Kapcsolatok</button>${notificationsBtn}<div class="nav-label">Rendszer</div>${settingsBtn}${guideBtn}`;
  const workspace = currentView === "guide"
    ? renderUserGuide()
    : currentView === "training-plans"
      ? renderTrainingPlans(user)
    : isAdmin
      ? currentView === "home" ? renderAdminHome(user) : currentView === "calendar" ? renderCalendar(user) : currentView === "notifications" ? renderNotifications(user) : renderAdminContent()
      : isTrainer
        ? currentView === "home" || currentView === "trainer-home" ? renderTrainerContent(user) : currentView === "clients" ? renderTrainerClients(user) : currentView === "calendar" ? renderCalendar(user) : currentView === "coach-profile" ? renderCoachProfileEditor(user) : currentView === "client-detail" ? renderEnhancedClientDetail(selectedClient()) : currentView === "connections" ? renderConnectionCenter(user) : currentView === "notifications" ? renderNotifications(user) : currentView === "settings" ? renderSettings(user) : currentView === "subscription" ? renderSubscription() : currentView === "team" ? renderStudioTeam() : renderTrainerContent(user)
        : currentView === "home" || currentView === "profile" ? renderClientContent(user) : currentView === "calendar" ? renderCalendar(user) : currentView === "coach-directory" ? renderCoachDirectory() : currentView === "coach-profile-detail" ? renderCoachProfileDetail() : currentView === "connections" ? renderConnectionCenter(user) : currentView === "notifications" ? renderNotifications(user) : currentView === "settings" ? renderSettings(user) : renderClientContent(user);
  return `<main class="app-shell dashboard"><aside class="sidebar"><div class="brand">Back<span>Plan</span></div>${navigation}<div class="sidebar-spacer"></div><div class="user-mini"><div class="avatar">${initials(user.name)}</div><div>${escapeHtml(user.name)}<small>${isAdmin ? "Adminisztrátor" : isTrainer ? "Edző" : "Kliens"}</small></div></div><button class="nav-btn" id="logout" style="margin-top:14px">Kijelentkezés</button></aside><section class="main">${renderNotificationPreview(user)}${workspace}${renderLegalLinks()}</section></main>`;
}

async function deleteCurrentAccount() {
  if (!confirm("Biztosan törlöd a saját fiókodat? Ez a művelet nem vonható vissza.")) return;
  try { await api.accountAdmin({ action: "delete-self" }); data.users = data.users.filter((user) => user.id !== currentUser()?.id); setSession(null); syncRouteToUrl(true); render(); toast("A fiókod törölve."); }
  catch (error) { toast(`Nem sikerült törölni: ${error.message}`); }
}

async function exportMyData() {
  const user = currentUser();
  if (!user) return toast("A fiókadatok letöltéséhez jelentkezz be.");
  try {
    const exportData = await api.exportMyData();
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

function bindEvents() {
  bindStorageNoticeEvents();
  document.querySelector("#login-form")?.addEventListener("submit", remoteLogin);
  const loginForm = document.querySelector("#login-form");
  if (loginForm && !document.querySelector("#forgot-password")) {
    const button = document.createElement("button"); button.type = "button"; button.id = "forgot-password"; button.className = "text-button"; button.textContent = "Elfelejtett jelszó"; loginForm.append(button);
    button.addEventListener("click", openForgotPassword);
  }
  document.querySelector("#show-register")?.addEventListener("click", () => {
    if (!isPublicRegistrationEnabled()) return toast("A nyilvános regisztráció jelenleg nincs engedélyezve.");
    openRegistrationV2();
  });
  document.querySelectorAll("#app .legal-links [data-legal]").forEach((button) => button.addEventListener("click", () => openLegalDocument(button.dataset.legal)));
  document.querySelector("#logout")?.addEventListener("click", async () => { await auth.signOut(); setSession(null); syncRouteToUrl(true); render(); });
  document.querySelector("#settings-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = currentUser();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    values.email = values.email.trim().toLowerCase();
    if (data.users.some((item) => item.id !== user.id && item.email?.toLowerCase() === values.email)) {
      toast("Ezzel az e-mail-címmel már létezik fiók.");
      return;
    }
    const emailChanged = values.email !== user.email.toLowerCase();
    Object.assign(user, values);
    try {
      await api.updateProfile(user);
      if (emailChanged) await auth.updateEmail(user.email);
      render();
      toast(emailChanged ? "Az adatok mentve. Erősítsd meg az új e-mail-címet a postafiókodban." : "A személyes adatok mentve.");
    } catch (error) {
      await refreshRemote();
      toast(`Nem sikerült menteni a beállításokat: ${error.message}`);
    }
  });
  document.querySelector("#export-my-data")?.addEventListener("click", exportMyData);
  document.querySelector("#delete-account")?.addEventListener("click", deleteCurrentAccount);
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    navigateToView(button.dataset.view);
    if (button.dataset.view === "administrators") void loadAdminAccounts();
    if (button.dataset.view === "trainers") void loadTrainerEmails();
  }));
  document.querySelector("#add-training-plan")?.addEventListener("click", () => {
    const user = currentUser();
    if (user?.role === "trainer" && currentPlan() === "free" && (data.trainingPlans || []).filter((plan) => plan.trainerId === user.id).length >= 2) {
      openUpgradeModal("A Free csomagban legfeljebb 2 edzésterv készíthető.");
      return;
    }
    openModal(renderTrainingPlanModal());
  });
  document.querySelectorAll("[data-edit-training-plan]").forEach((button) => button.addEventListener("click", () => {
    const plan = (data.trainingPlans || []).find((item) => item.id === button.dataset.editTrainingPlan && item.trainerId === currentUser()?.id);
    if (!plan) return toast("Az edzésterv nem érhető el vagy nincs szerkesztési jogosultságod.");
    openModal(renderTrainingPlanModal(plan));
  }));
  document.querySelectorAll("[data-delete-training-plan]").forEach((button) => button.addEventListener("click", async () => {
    const planId = button.dataset.deleteTrainingPlan;
    const plan = (data.trainingPlans || []).find((item) => item.id === planId && item.trainerId === currentUser()?.id);
    if (!plan) return toast("Az edzésterv nem érhető el vagy nincs törlési jogosultságod.");
    if (!confirm(`Biztosan törlöd a(z) „${plan.title}” edzéstervet? Ez nem vonható vissza.`)) return;
    button.disabled = true;
    try {
      await api.deleteTrainingPlan(planId);
      await refreshRemote();
      toast("Az edzésterv törölve.");
    } catch (error) {
      button.disabled = false;
      toast(`Nem sikerült törölni az edzéstervet: ${error.message}`);
    }
  }));
  document.querySelectorAll("[data-admin-period]").forEach((button) => button.addEventListener("click", () => {
    setAdminDashboardPeriod(button.dataset.adminPeriod);
    render();
  }));
  document.querySelectorAll("[data-group-action]").forEach((button) => button.addEventListener("click", async () => {
    const { groupId, groupAction } = button.dataset;
    const workout = (data.groupWorkouts || []).find((item) => item.id === groupId);
    const user = currentUser();
    if (!workout || !user) return toast("Ez a csoportos edzés már nem érhető el.");
    if (groupAction === "edit") {
      if (user.role !== "trainer" || workout.trainerId !== user.id) return toast("Csak a saját csoportos edzésedet szerkesztheted.");
      if (workout.cancelledAt) return toast("A lemondott edzés már nem szerkeszthető.");
      openModal(renderGroupWorkoutModal(workout));
      return;
    }
    if (groupAction === "cancel" && !confirm("Biztosan lemondod ezt a csoportos edzést? A jelentkezett kliensek értesítést kapnak.")) return;
    button.disabled = true;
    try {
      if (groupAction === "join") await api.joinGroupWorkout(groupId);
      else if (groupAction === "leave") await api.leaveGroupWorkout(groupId);
      else if (groupAction === "cancel") await api.cancelGroupWorkout(groupId);
      else throw new Error("Ismeretlen művelet.");
      await refreshRemote();
      const joined = (data.groupWorkouts || []).find((item) => String(item.id) === String(groupId));
      const onWaitlist = groupAction === "join" && joined?.isWaitlisted;
      toast(onWaitlist ? "A csoportos edzés betelt, felkerültél a várólistára." : groupAction === "join" ? "Jelentkeztél a csoportos edzésre." : groupAction === "leave" ? "Leiratkoztál a csoportos edzésről." : "A csoportos edzés lemondva.");
    } catch (error) {
      button.disabled = false;
      toast(`Nem sikerült végrehajtani a műveletet: ${error.message}`);
    }
  }));
  document.querySelectorAll("[data-grant-admin]").forEach((button) => button.addEventListener("click", () => grantAdminRole(button.dataset.grantAdmin)));
  document.querySelectorAll("[data-checkout-plan]").forEach((button) => button.addEventListener("click", async () => {
    const plan = button.dataset.checkoutPlan;
    if (plan === currentPlan()) return;
    button.disabled = true;
    try {
      window.location.assign(await api.startCheckout(plan));
    } catch (error) {
      button.disabled = false;
      toast(`Nem sikerült elindítani a fizetést: ${error.message}`);
    }
  }));
  document.querySelectorAll("[data-manage-subscription]").forEach((button) => button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await api.openCustomerPortal();
    } catch (error) {
      button.disabled = false;
      toast(`Nem sikerült megnyitni az ügyfélportált: ${error.message}`);
    }
  }));
  document.querySelectorAll("[data-set-plan-user]").forEach((select) => select.addEventListener("change", async () => {
    const userId = select.dataset.setPlanUser;
    const plan = select.value;
    select.disabled = true;
    try {
      await api.accountAdmin({ action: "set-plan", userId, plan });
      data.adminSubscriptions = await api.listSubscriptions();
      render();
      toast(`A csomag frissítve: ${planLabel(plan)}.`);
    } catch (error) {
      toast(`Nem sikerült módosítani a csomagot: ${error.message}`);
      select.disabled = false;
    }
  }));
  document.querySelectorAll("[data-trainer-application]").forEach((button) => button.addEventListener("click", async () => {
    const userId = button.dataset.userId;
    const decision = button.dataset.trainerApplication;
    const applicant = data.users.find((user) => user.id === userId);
    if (!applicant || applicant.trainerApplicationStatus !== "pending") return toast("Ez a jelentkezés már nem elérhető.");
    try {
      await api.accountAdmin({ action: "decide-trainer-application", userId, decision });
      await refreshRemote();
      toast(decision === "approved" ? "Az edzői jelentkezés jóváhagyva." : "Az edzői jelentkezés elutasítva.");
    } catch (error) {
      toast(`Nem sikerült feldolgozni a jelentkezést: ${error.message}`);
    }
  }));
  document.querySelector("#calendar-previous")?.addEventListener("click", () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
    setCalendarSelectedDate(toDateInputValue(calendarMonth));
    render();
  });
  document.querySelector("#calendar-next")?.addEventListener("click", () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
    setCalendarSelectedDate(toDateInputValue(calendarMonth));
    render();
  });
  document.querySelector("#calendar-today")?.addEventListener("click", () => {
    setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    setCalendarSelectedDate(toDateInputValue(new Date()));
    render();
  });
  document.querySelectorAll("[data-calendar-date]").forEach((button) => button.addEventListener("click", () => {
    const date = dateFromInputValue(button.dataset.calendarDate);
    if (!date) return;
    setCalendarSelectedDate(button.dataset.calendarDate);
    setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    render();
  }));
  document.querySelector("#calendar-add-workout")?.addEventListener("click", openCalendarWorkout);
  document.querySelector("#calendar-add-group-workout")?.addEventListener("click", () => openModal(renderGroupWorkoutModal()));
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
      await api.createConnectionRequest(email);
      await refreshRemote();
      toast("A kapcsolódási kérés elküldve.");
    } catch (error) {
      toast(`Nem sikerült elküldeni a kérést: ${error.message}`);
    }
  });
  document.querySelectorAll("[data-connection-decision]").forEach((button) => button.addEventListener("click", async () => {
    const requestId = button.dataset.requestId;
    const decision = button.dataset.connectionDecision;
    try {
      await api.respondConnectionRequest(requestId, decision);
      await refreshRemote();
      toast(decision === "approved" ? "A kapcsolat jóváhagyva." : "A kérés elutasítva.");
    } catch (error) {
      toast(`Nem sikerült frissíteni a kérést: ${error.message}`);
    }
  }));
  document.querySelectorAll("[data-coach-request]").forEach((button) => button.addEventListener("click", async () => {
    const coachId = button.dataset.coachRequest;
    try {
      await api.createCoachConnectionRequest(coachId);
      await refreshRemote();
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
    try {
      let photos = [...existingPhotos];
      for (const file of files) {
        const path = await api.uploadCoachPhoto(file);
        uploadedPaths.push(path);
        photos.push({ path, url: "" });
      }
      await api.saveCoachProfile(values.specialty.trim(), values.bio.trim(), photos.map((photo) => photo.path), { phone: values.phone.trim(), contactEmail: values.contactEmail.trim(), location: values.location.trim(), availability: values.availability.trim() });
      await refreshRemote();
      toast("A bemutatkozásod mentve.");
    } catch (error) {
      let cleanupMessage = "";
      if (uploadedPaths.length) {
        try { await api.deleteCoachPhotos(uploadedPaths); }
        catch (cleanupError) { cleanupMessage = ` Néhány feltöltött kép ideiglenesen megmaradhatott: ${cleanupError.message}`; }
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
      await api.saveCoachProfile(profile.specialty, profile.bio, remaining.map((photo) => photo.path), { phone: profile.phone || "", contactEmail: profile.contactEmail || "", location: profile.location || "", availability: profile.availability || "" });
      await api.deleteCoachPhotos([path]);
      await refreshRemote();
      toast("A kép törölve.");
    } catch (error) {
      toast(`Nem sikerült törölni a képet: ${error.message}`);
    }
  }));
  document.querySelector("#mark-notifications-read")?.addEventListener("click", async () => {
    try {
      await api.markConnectionNotificationsRead();
      await refreshRemote();
    } catch (error) {
      toast(`Nem sikerült frissíteni az értesítéseket: ${error.message}`);
    }
  });
  document.querySelector("#add-client")?.addEventListener("click", () => {
    openModal(`<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">Supabase fiókkezelés</div><h2>Kliens regisztrációja</h2></div><button class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><p>A kliens a saját e-mail-címével és jelszavával hozza létre a fiókját a bejelentkezési képernyőn található <strong>Regisztráció</strong> gombbal.</p><p>Miután regisztrált, keresd meg a regisztrált e-mail-címe alapján a kapcsolódási panelen, és küldj neki kérést. A kliensnek jóvá kell hagynia a kapcsolatot, mielőtt megjelenik a klienseid között.</p><div style="display:flex;justify-content:flex-end;margin-top:18px"><button type="button" class="btn btn-dark" id="cancel-modal">Értem</button></div></div></div>`);
  });
  document.querySelectorAll("[data-client-id]").forEach((button) => button.addEventListener("click", () => navigateToView("client-detail", { clientId: button.dataset.clientId })));
  document.querySelector("#edit-client")?.addEventListener("click", () => openModal(selectedClient()));
  document.querySelector("#add-workout")?.addEventListener("click", () => openModal(renderWorkoutModalForUser(currentUser().role === "client" ? currentUser() : selectedClient())));
  if (currentUser()?.role !== "admin") document.querySelector("#manage-trainers")?.remove();
  document.querySelector("#manage-trainers")?.addEventListener("click", () => openModal(renderTrainerAssignmentModal(selectedClient())));
  document.querySelectorAll("[data-workout-index]").forEach((button) => button.addEventListener("click", () => openModal(renderWorkoutModalForUser(selectedClient(), selectedClient().workouts[Number(button.dataset.workoutIndex)], button.dataset.workoutIndex))));
  document.querySelector("#add-trainer")?.addEventListener("click", () => openModal(renderTrainerModal()));
  document.querySelector("#invite-studio-coach")?.addEventListener("click", () => openModal(renderStudioCoachModal()));
  document.querySelectorAll(".btn-delete-trainer").forEach((button) => button.addEventListener("click", () => deleteTrainer(button.dataset.trainerId)));
  document.querySelector("#client-search")?.addEventListener("input", (event) => { const needle = event.target.value.toLowerCase(); const filtered = data.users.filter((user) => user.role === "client" && `${user.name} ${user.email}`.toLowerCase().includes(needle)); document.querySelector("#client-table").innerHTML = renderClientTable(filtered); document.querySelectorAll("[data-client-id]").forEach((button) => button.addEventListener("click", () => navigateToView("client-detail", { clientId: button.dataset.clientId }))); });
}

function openForgotPassword() {
  document.querySelector("#app").innerHTML = `<main class="auth-shell"><section class="auth-art"><div class="brand">Back<span>Plan</span></div><div><h1>Újra hozzáférsz.</h1><p>Add meg az e-mail-címedet, és küldünk egy biztonságos jelszó-visszaállító linket.</p></div><div class="art-footer"><button class="text-button" style="color:var(--teal)" id="back-login">Vissza a bejelentkezéshez</button></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Jelszó visszaállítása</div><h2>Új jelszó kérése</h2><p>A linket az e-mail-fiókodba küldjük.</p><form id="forgot-form"><div class="field"><label for="forgot-email">E-mail-cím</label><input id="forgot-email" type="email" required /></div><div class="auth-actions"><button type="button" class="text-button" id="back-login-2">Mégse</button><button class="btn btn-dark">Link küldése</button></div></form></div></section></main>`;
  document.querySelector("#app").insertAdjacentHTML("beforeend", renderStorageNotice());
  bindStorageNoticeEvents();
  document.querySelectorAll("#back-login, #back-login-2").forEach((button) => button.addEventListener("click", render));
  document.querySelector("#forgot-form").addEventListener("submit", async (event) => { event.preventDefault(); try { await auth.requestPasswordReset(document.querySelector("#forgot-email").value.trim()); toast("A visszaállító linket elküldtük."); } catch (error) { toast(`Nem sikerült elküldeni: ${error.message}`); } });
}

function renderPasswordReset() {
  document.querySelector("#app").innerHTML = `<main class="auth-shell"><section class="auth-art"><div class="brand">Back<span>Plan</span></div><div><h1>Válassz új jelszót.</h1><p>Az új jelszóval ismét biztonságosan beléphetsz.</p></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Jelszó visszaállítása</div><h2>Új jelszó</h2><p>Legalább 8 karaktert használj.</p><form id="reset-form"><div class="field"><label for="reset-password">Új jelszó</label><input id="reset-password" type="password" minlength="8" required /></div><button class="btn btn-dark" type="submit">Jelszó mentése</button></form></div></section></main>`;
  document.querySelector("#app").insertAdjacentHTML("beforeend", renderStorageNotice());
  bindStorageNoticeEvents();
  document.querySelector("#reset-form").addEventListener("submit", async (event) => { event.preventDefault(); try { await auth.updatePassword(document.querySelector("#reset-password").value); window.history.replaceState({}, "", window.location.pathname); toast("A jelszó frissítve."); render(); } catch (error) { toast(`Nem sikerült menteni: ${error.message}`); } });
}

function openRegistrationV2() {
  if (!isPublicRegistrationEnabled()) {
    toast("A nyilvános regisztráció a jogi és szolgáltatói adatok véglegesítéséig szünetel.");
    return;
  }
  document.querySelector("#app").innerHTML = `<main class="auth-shell"><section class="auth-art"><div class="brand">Back<span>Plan</span></div><div><h1>Az új fejezeted itt kezdődik.</h1><p>Hozz létre kliensfiókot, vagy jelentkezz edzőkénti elbírálásra.</p></div><div class="art-footer">Már van fiókod? <button class="text-button" style="color:var(--teal)" id="back-login">Bejelentkezés</button></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Regisztráció · 18+</div><h2>Fiók létrehozása</h2><p>Adj meg egy e-mail-címet, amelyhez hozzáférsz a megerősítő levélhez.</p><form id="register-form"><div class="field"><label for="reg-role">Fiók típusa</label><select id="reg-role" name="role"><option value="client">Kliensként regisztrálok</option><option value="trainer">Edzőként jelentkezem</option></select></div><div class="field"><label for="reg-name">Teljes név</label><input id="reg-name" name="name" autocomplete="name" required /></div><div class="field"><label for="reg-email">E-mail-cím</label><input id="reg-email" name="email" type="email" autocomplete="email" required /></div><div class="field"><label for="reg-password">Jelszó létrehozása</label><input id="reg-password" name="password" type="password" autocomplete="new-password" minlength="8" required /></div><div class="field" id="reg-goal-field"><label for="reg-goal">Edzéscél (nem kötelező)</label><input id="reg-goal" name="goal" maxlength="160" placeholder="pl. Rendszeresebben szeretnék edzeni" /><small class="settings-help">Ne írj ide diagnózist, sérülést, gyógyszerelést vagy más egészségügyi adatot.</small></div><div class="field" id="reg-specialty-field" style="display:none"><label for="reg-specialty">Szakterület</label><input id="reg-specialty" name="specialty" maxlength="120" placeholder="pl. Erőnléti edzés" /></div><div class="legal-acknowledgements"><label><input type="checkbox" name="ageConfirmed" value="yes" required /> Kijelentem, hogy betöltöttem a 18. életévemet.</label><label><input type="checkbox" name="privacyAcknowledged" value="yes" required /> Elolvastam az adatkezelési tájékoztató tervezetét.</label><label><input type="checkbox" name="termsAcknowledged" value="yes" required /> Tudomásul veszem, hogy a felhasználási feltételek tervezet, és a szolgáltatás jelenleg tesztelés alatt áll.</label>${renderLegalLinks()}</div><div class="legal-status" role="status">A regisztráció most elérhető tesztelésre, de a jogi dokumentumok még tervezetek. Ne használj egészségügyi adatot. Edzői jelentkezésnél az e-mail-megerősítés után az adminisztrátor bírálja el a kérelmet; jóváhagyásig nem kapsz kliens- vagy edzői hozzáférést. A fiók létrehozása nem jelent fizetős előfizetést.</div><div class="auth-actions"><button type="button" class="text-button" id="back-login-2">Vissza a bejelentkezéshez</button><button class="btn btn-dark">Fiók létrehozása</button></div></form></div></section></main>`;
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
  document.querySelector("#register-form").addEventListener("submit", remoteRegister);
}

window.addEventListener("popstate", () => {
  restoreRouteFromUrl();
  render();
});

export function startApp() {
  restoreRouteFromUrl();
  render();
  auth.onPasswordRecovery(() => {
    if (!document.querySelector("#reset-form")) renderPasswordReset();
  });
  initializeRemote();
}

registerRuntime({ render, toast, refreshRemote });
