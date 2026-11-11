import {
  data
} from "../state.js";
import { currentPlan, escapeHtml, groupWorkoutDateLabel, groupWorkoutMeta, groupWorkoutStanding, groupWorkoutTime, initials, nextSessionLabel, planLabel, trainerName, upcomingGroupWorkouts, upcomingWorkouts, workoutStats } from "../helpers.js";

const PAID_PLANS = [
  { id: "pro", description: "Korlátlan kliens, edzésterv és nagyobb csoportos edzések." },
  { id: "studio", description: "Minden Pro funkció stúdiók és nagyobb csapatok számára." }
];

export function isStudioLeaderActive() {
  return currentPlan() === "studio" && ["active", "trialing"].includes(data.subscription?.status);
}

export function renderStudioTeam() {
  if (!isStudioLeaderActive()) {
    return `<div class="topbar"><div><div class="eyebrow">Stúdió</div><h1>Csapatom</h1></div></div><section class="panel connection-center"><div class="empty-state">A csapatkezelés a Studio csomaggal érhető el.</div></section>`;
  }
  const team = data.studioTeam || [];
  const rows = team.length
    ? team.map((member) => `<div class="connection-row"><div><strong>${escapeHtml(member.name)}</strong><p>${escapeHtml(member.email)}${member.specialty ? ` · ${escapeHtml(member.specialty)}` : ""}</p></div><span class="plan-badge">${member.accepted ? "Aktív" : "Meghívva"}</span></div>`).join("")
    : `<div class="empty-state">Még nincs al-edző a csapatodban.</div>`;
  return `<div class="topbar"><div><div class="eyebrow">Stúdió</div><h1>Csapatom</h1><p>A stúdiódhoz tartozó al-edzők. Az ő kliensei, edzései és edzéstervei számodra is láthatók.</p></div><button class="btn btn-teal" id="invite-studio-coach">Új edző meghívása</button></div><section class="panel connection-center">${rows}</section>`;
}

export function renderSubscription() {
  const current = currentPlan();
  const subscription = data.subscription || {};
  const isLive = ["active", "trialing"].includes(subscription.status);
  const periodEnd = subscription.currentPeriodEnd
    ? new Intl.DateTimeFormat("hu-HU", { dateStyle: "long" }).format(new Date(subscription.currentPeriodEnd))
    : "";
  const cards = PAID_PLANS.map((plan) => {
    const isCurrent = plan.id === current;
    return `<div class="connection-row"><div><strong>${planLabel(plan.id)}</strong><p>${escapeHtml(plan.description)}</p></div>${isCurrent
      ? `<span class="plan-badge plan-badge-${plan.id}">Aktuális csomag</span>`
      : `<button class="btn btn-teal" data-checkout-plan="${plan.id}">Előfizetés</button>`}</div>`;
  }).join("");
  const hasPaidPlan = current !== "free" && ["active", "trialing", "past_due"].includes(subscription.status);
  const statusNote = subscription.status === "past_due"
    ? `<div class="empty-state">A legutóbbi fizetés sikertelen volt. Kérjük, frissítsd a fizetési módot az ügyfélportálon.</div>`
    : "";
  const manage = hasPaidPlan
    ? `<div class="connection-row"><div><strong>Előfizetés kezelése</strong><p>Csomagváltás, fizetési mód, számlák és lemondás a Stripe ügyfélportálon.</p></div><button class="btn btn-teal" data-manage-subscription>Előfizetés kezelése / Lemondás</button></div>`
    : "";
  return `<div class="topbar"><div><div class="eyebrow">Fiók / Előfizetés</div><h1>Előfizetés</h1><p>Aktuális csomagod: <span class="plan-badge plan-badge-${current}">${planLabel(current)}</span>${isLive && periodEnd && current !== "free" ? ` · érvényes: ${escapeHtml(periodEnd)}` : ""}</p></div></div><section class="panel connection-center">${statusNote}${manage}${cards}</section>`;
}

export function renderConnectionCenter(user) {
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

export function renderNotificationPreview(user) {
  const unread = (data.notifications || []).filter((item) => item.userId === user.id && !item.readAt);
  if (!unread.length) return "";
  return `<section class="panel notification-preview"><div class="panel-head"><div><h2>Új értesítések</h2><p>${unread.length} olvasatlan értesítés</p></div><button class="text-button" data-view="notifications">Összes megtekintése</button></div>${unread.slice(0, 3).map((item) => `<div class="activity notification-unread"><div class="activity-mark">!</div><p>${escapeHtml(item.message)}<small>${escapeHtml(item.createdAt ? new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt)) : "")}</small></p></div>`).join("")}</section>`;
}

export function renderNotifications(user) {
  const notifications = (data.notifications || []).filter((item) => item.userId === user.id);
  return `<div class="topbar"><div><div class="eyebrow">Munkatér / Értesítések</div><h1>Értesítések</h1><p>Korábbi kapcsolati kéréseid és döntéseid.</p></div>${notifications.some((item) => !item.readAt) ? `<button class="btn btn-ghost" id="mark-notifications-read">Összes olvasottnak jelölése</button>` : ""}</div><section class="panel notification-list">${notifications.length ? notifications.map((item) => `<div class="activity ${item.readAt ? "" : "notification-unread"}"><div class="activity-mark">${item.readAt ? "✓" : "!"}</div><p>${escapeHtml(item.message)}<small>${escapeHtml(item.createdAt ? new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt)) : "")}</small></p></div>`).join("") : `<div class="empty-state">Még nincsenek értesítéseid.</div>`}</section>`;
}

export function renderSettings(user) {
  const isClient = user.role === "client";
  return `<div class="topbar"><div><div class="eyebrow">Fiók / Beállítások</div><h1>Beállítások</h1><p>Személyes adatok és fiókbiztonság kezelése.</p></div></div><section class="panel settings-panel"><h2>Személyes adatok</h2><p class="settings-help">A fiók e-mail-címének módosítása után az új címet meg kell erősítened.</p><form id="settings-form"><div class="field"><label for="settings-name">Teljes név</label><input id="settings-name" name="name" autocomplete="name" required value="${escapeHtml(user.name)}" /></div><div class="field"><label for="settings-email">E-mail-cím</label><input id="settings-email" name="email" type="email" autocomplete="email" required value="${escapeHtml(user.email)}" /></div><div class="field">${isClient ? `<label for="settings-goal">Fő cél</label><input id="settings-goal" name="goal" value="${escapeHtml(user.goal || "")}" /><small class="settings-help">Ne adj meg diagnózist, sérülést vagy más egészségügyi adatot.</small>` : `<label for="settings-specialty">Szakterület</label><input id="settings-specialty" name="specialty" value="${escapeHtml(user.specialty || "")}" />`}</div><div class="settings-actions"><button class="btn btn-teal" type="submit">Adatok mentése</button></div></form><div class="settings-privacy"><h2>Személyes adataid</h2><p class="settings-help">Töltsd le az alkalmazásban rólad tárolt adatokat. A fájlt biztonságos helyen tárold.</p><button class="btn btn-ghost" id="export-my-data">Saját adataim letöltése</button></div><div class="settings-danger"><h2>Fiók törlése</h2><p>A fiók törlése végleges, és eltávolítja a profilodat és a hozzá tartozó adatokat. Számlázási vagy jogszabályban előírt megőrzésre köteles adatot külön szabályok érinthetnek.</p><button class="btn btn-danger" id="delete-account">Fiók törlése</button></div></section>`;
}

export function renderUserGuide() {
  return `<div class="topbar"><div><div class="eyebrow">Súgó</div><h1>Felhasználói kézikönyv</h1><p>A BackPlan funkcióinak és szerepköreinek útmutatója.</p></div></div><section class="panel guide-panel"><h2>Olvasd el vagy töltsd le a kézikönyvet</h2><p class="settings-help">A PDF fejezetenként ismerteti az adminisztrátori, edzői és kliensfunkciókat, képernyőképekkel és példákkal.</p><div class="topbar-actions"><a class="btn btn-ghost" href="/BackPlan_felhasznaloi_kezikonyv.pdf" target="_blank" rel="noopener">Megnyitás új lapon</a><a class="btn btn-teal" href="/BackPlan_felhasznaloi_kezikonyv.pdf" download="BackPlan_felhasznaloi_kezikonyv.pdf">PDF letöltése</a></div></section>`;
}

export function renderTrainerContent(trainer) {
  const clients = data.users.filter((user) => user.role === "client" && (user.trainerIds || []).includes(trainer.id));
  const sessions = clients.reduce((total, client) => total + (client.workouts || []).filter((workout) => workout.trainerId === trainer.id).length, 0);
  const upcoming = upcomingWorkouts(clients).filter((item) => item.workout.trainerId === trainer.id).slice(0, 5);
  const groupSessions = upcomingGroupWorkouts(trainer).slice(0, 5);
  return `<div class="topbar"><div><div class="eyebrow">Edzői tér</div><h1>Szia, ${escapeHtml(trainer.name.split(" ")[1] || trainer.name)}.</h1><p>A klienseid és a közelgő edzéseid áttekintése.</p></div><div class="topbar-actions"><button class="btn btn-ghost" data-view="clients">Kliensek</button><button class="btn btn-teal" data-view="calendar">Naptár</button></div></div><div class="stat-grid"><div class="stat"><div class="number">${clients.length}</div><div class="label">Hozzád rendelt kliens</div><div class="trend">Aktív kapcsolat</div></div><div class="stat"><div class="number">${sessions}</div><div class="label">Edzés a naplóban</div><div class="trend">Összes rögzített edzés</div></div><div class="stat"><div class="number">${upcoming.length}</div><div class="label">Közelgő edzés</div><div class="trend">A következő alkalmak</div></div><div class="stat"><div class="number">${groupSessions.length}</div><div class="label">Csoportos edzés</div><div class="trend">Meghirdetett közelgő alkalom</div></div></div><section class="panel"><div class="panel-head"><h2>Közelgő edzések</h2><button class="text-button" data-view="calendar">Naptár megnyitása</button></div>${upcoming.length ? upcoming.map((item) => `<div class="session-row"><div><strong>${escapeHtml(item.workout.date)} · ${escapeHtml(item.workout.time)} · ${escapeHtml(item.workout.type)}</strong><p>${escapeHtml(item.client.name)} · ${item.workout.duration || 0} perc</p></div><button class="text-button" data-client-id="${escapeHtml(item.client.id)}">Kliens megnyitása</button></div>`).join("") : `<div class="empty-state">Nincs közelgő edzés beütemezve.</div>`}</section><section class="panel group-dashboard-panel"><div class="panel-head"><div><h2>Közelgő csoportos edzések</h2><p>A meghirdetett alkalmaid és a jelentkezők száma.</p></div><button class="text-button" data-view="calendar">Kezelés a naptárban</button></div>${groupSessions.length ? groupSessions.map((workout) => `<div class="session-row"><div><strong>${escapeHtml(groupWorkoutDateLabel(workout))} · ${escapeHtml(groupWorkoutTime(workout))} · ${escapeHtml(workout.title)}</strong><p>${escapeHtml(groupWorkoutMeta(workout))}</p>${(workout.participantNames?.length || workout.registrations?.length) ? `<p class="group-participants">Jelentkeztek: ${(workout.participantNames?.length ? workout.participantNames : workout.registrations.map((id) => data.users.find((item) => item.id === id)?.name || "Kliens")).map(escapeHtml).join(", ")}</p>` : ""}</div><button type="button" class="btn btn-danger" data-group-action="cancel" data-group-id="${escapeHtml(workout.id)}">Lemondás</button></div>`).join("") : `<div class="empty-state">Még nincs meghirdetett csoportos edzés.</div>`}</section></div>`;
}

export function renderClientContent(user) {
  const workouts = user.workouts || [];
  const stats = workoutStats(user);
  const groupSessions = upcomingGroupWorkouts(user).slice(0, 5);
  return `<div class="topbar"><div><div class="eyebrow">Kezdőlap</div><h1>Szia, ${escapeHtml(user.name.split(" ")[0])}.</h1><p>A következetesség a munka. Folytasd.</p></div><div class="topbar-actions"><button class="btn btn-ghost" data-view="calendar">Edzésnaptár</button><button class="btn btn-teal" id="add-workout">+ Egyéni edzés</button></div></div><div class="detail-layout"><section class="panel profile-card"><div class="profile-avatar">${initials(user.name)}</div><h2>${escapeHtml(user.name)}</h2><p>${escapeHtml(user.email)}</p><span class="status status-${user.status === "Aktív" ? "active" : "paused"}">${escapeHtml(user.status || "Aktív")}</span><div class="profile-meta"><div class="meta-row"><span>Fókusz</span><strong>${escapeHtml(user.goal || "Nincs beállítva")}</strong></div><div class="meta-row"><span>Edzők</span><strong>${(user.trainerIds || []).map((id) => escapeHtml(trainerName(id))).join(", ") || "Nincs hozzárendelve"}</strong></div><div class="meta-row"><span>Következő edzés</span><strong>${escapeHtml(nextSessionLabel(user))}</strong></div></div></section><section class="panel"><div class="panel-head"><h2>Edzésstatisztika</h2><span class="eyebrow" style="margin:0">Összesített</span></div><div class="metric-grid"><div class="metric"><strong>${stats.completed}</strong><span>Teljesített edzés</span></div><div class="metric"><strong>${stats.upcoming}</strong><span>Közelgő edzés</span></div><div class="metric"><strong>${stats.adherence}%</strong><span>Teljesítési arány</span></div></div><h3>Esedékes edzések teljesítése</h3><div class="progress-bar" role="progressbar" aria-label="Esedékes edzések teljesítése" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.adherence}"><span style="width:${stats.adherence}%"></span></div><p class="settings-help">${stats.completed} teljesített a ${stats.due} esedékes vagy teljesített, nem lemondott edzésből. A jövőbeli edzéseket még nem számítjuk bele.</p><div class="panel-head" style="margin-top:28px"><h2>Edzésnapló</h2></div>${workouts.length ? workouts.map((workout) => `<div class="session-row"><div><strong>${escapeHtml(workout.type)}</strong><p>${escapeHtml(workout.date)} · ${escapeHtml(workout.time)} · ${workout.duration} perc · ${escapeHtml(trainerName(workout.trainerId))}</p></div><span class="status status-${workout.status === "Teljesítve" ? "active" : "paused"}">${escapeHtml(workout.status)}</span></div>`).join("") : `<div class="empty-state">Még nincs rögzített edzés.</div>`}<div class="panel" style="background:var(--mint);border:0;margin-top:20px"><h3>Edzői megjegyzés</h3><p style="font-size:.84rem;line-height:1.55;margin-bottom:0">${escapeHtml(user.notes || "Tartsd a fókuszt és figyelj a mozgásminőségre.")}</p></div></section></div><section class="panel group-dashboard-panel"><div class="panel-head"><div><h2>Csoportos edzések</h2><p>A hozzád rendelt edzők nyitott alkalmai.</p></div><button class="text-button" data-view="calendar">Naptár megnyitása</button></div>${groupSessions.length ? groupSessions.map((workout) => {
    const standing = groupWorkoutStanding(workout, user.id);
    const registered = standing.registered;
    const action = registered
      ? `<button type="button" class="btn btn-ghost" data-group-action="leave" data-group-id="${escapeHtml(workout.id)}">Leiratkozás</button>`
      : standing.waitlisted
        ? `<button type="button" class="btn btn-ghost" data-group-action="leave" data-group-id="${escapeHtml(workout.id)}">Leiratkozás a várólistáról</button>`
        : `<button type="button" class="btn btn-teal" data-group-action="join" data-group-id="${escapeHtml(workout.id)}">${standing.full ? "Várólistára jelentkezem" : "Jelentkezés"}</button>`;
    const status = standing.label;
    return `<div class="session-row"><div><strong>${escapeHtml(groupWorkoutDateLabel(workout))} · ${escapeHtml(groupWorkoutTime(workout))} · ${escapeHtml(workout.title)}</strong><p>${escapeHtml(workout.trainerName || trainerName(workout.trainerId))} · ${escapeHtml(groupWorkoutMeta(workout))}</p>${workout.description ? `<p>${escapeHtml(workout.description)}</p>` : ""}</div><span class="status ${registered ? "status-active" : "status-paused"}">${status}</span>${action}</div>`;
  }).join("") : `<div class="empty-state">Jelenleg nincs közelgő csoportos edzés a kapcsolt edzőidtől.</div>`}</section>`;
}
