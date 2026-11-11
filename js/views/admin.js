import * as api from "../api.js";
import { currentUser } from "../auth.js";
import {
  data,
  currentView,
  adminDashboardPeriod,
  remoteMode,
  setData,
  setSession
} from "../state.js";
import { render, toast } from "../runtime.js";
import { dateFromInputValue, escapeHtml, groupWorkoutDate, groupWorkoutDateLabel, groupWorkoutTime, initials, pendingTrainerApplications, planLabel, selectedClient, trainerName, trainers, upcomingWorkouts, workoutDateToInputValue } from "../helpers.js";
import { renderClients, renderEnhancedClientDetail } from "./clients.js";
import { renderCoachProfileDetail } from "./coaches.js";

function adminWorkoutRecords() {
  return data.users.filter((user) => user.role === "client").flatMap((client) =>
    (client.workouts || []).map((workout) => ({
      client,
      workout,
      date: workoutDateToInputValue(workout.date),
      time: workout.time || "",
      title: workout.type,
      status: workout.status,
      trainerId: workout.trainerId || "",
      startsAt: `${workoutDateToInputValue(workout.date)}T${workout.time || "00:00"}`
    }))
  ).filter((record) => record.date);
}

function adminPeriodData(period) {
  const now = new Date();
  let start;
  let bucketCount;
  let bucketDates;
  let labels;
  if (period === "week") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    bucketCount = 7;
    bucketDates = Array.from({ length: bucketCount }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
    labels = bucketDates.map((date) => new Intl.DateTimeFormat("hu-HU", { weekday: "short" }).format(date));
  } else if (period === "year") {
    start = new Date(now.getFullYear(), 0, 1);
    bucketCount = 12;
    bucketDates = Array.from({ length: bucketCount }, (_, index) => new Date(now.getFullYear(), index, 1));
    labels = bucketDates.map((date) => new Intl.DateTimeFormat("hu-HU", { month: "short" }).format(date));
  } else {
    period = "month";
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    bucketCount = 5;
    bucketDates = Array.from({ length: bucketCount }, (_, index) => new Date(start.getFullYear(), start.getMonth(), index * 7 + 1));
    labels = bucketDates.map((date, index) => {
      const from = index * 7 + 1;
      const to = Math.min(from + 6, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
      return `${from}–${to}.`;
    });
  }
  const end = period === "week"
    ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
    : period === "year"
      ? new Date(start.getFullYear() + 1, 0, 1)
      : new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const records = adminWorkoutRecords().filter((record) => {
    const date = dateFromInputValue(record.date);
    return date && date >= start && date < end;
  });
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({ label: labels[index], completed: 0, cancelled: 0 }));
  records.forEach((record) => {
    let index;
    const date = dateFromInputValue(record.date);
    if (period === "week") index = Math.floor((date - start) / 86400000);
    else if (period === "year") index = date.getMonth();
    else index = Math.floor((date.getDate() - 1) / 7);
    if (record.status === "Teljesítve") buckets[index].completed += 1;
    if (record.status === "Lemondva") buckets[index].cancelled += 1;
  });
  return { records, buckets };
}

export function renderAdminHome(admin) {
  const clients = data.users.filter((user) => user.role === "client");
  const upcoming = upcomingWorkouts(clients).slice(0, 5);
  const date = new Intl.DateTimeFormat("hu-HU", { dateStyle: "full" }).format(new Date());
  return `<div class="topbar"><div><div class="eyebrow">${escapeHtml(date)}</div><h1>Üdv, ${escapeHtml(admin.name.split(" ")[0])}.</h1><p>BackPlan munkaterületed rövid áttekintése.</p></div><div class="topbar-actions"><button class="btn btn-ghost" data-view="overview">Áttekintés</button><button class="btn btn-teal" data-view="calendar">Naptár</button></div></div><div class="stat-grid"><div class="stat"><div class="number">${clients.length}</div><div class="label">Összes kliens</div><div class="trend">Nyilvántartott kliensfiók</div></div><div class="stat"><div class="number">${trainers().length}</div><div class="label">Edző</div><div class="trend">Nyilvántartott edzőfiók</div></div><div class="stat"><div class="number">${upcoming.length}</div><div class="label">Közelgő edzés</div><div class="trend">A következő alkalmak</div></div></div><div class="content-grid"><section class="panel"><div class="panel-head"><h2>Közelgő edzések</h2><button class="text-button" data-view="calendar">Naptár megnyitása</button></div>${upcoming.length ? upcoming.map((item) => `<div class="session-row"><div><strong>${escapeHtml(item.workout.date)} · ${escapeHtml(item.workout.time)} · ${escapeHtml(item.workout.type)}</strong><p>${escapeHtml(item.client.name)} · ${escapeHtml(trainerName(item.workout.trainerId))}</p></div><button class="text-button" data-client-id="${escapeHtml(item.client.id)}">Kliens megnyitása</button></div>`).join("") : `<div class="empty-state">Nincs közelgő edzés beütemezve.</div>`}</section><section class="panel"><div class="panel-head"><h2>Legutóbbi aktivitás</h2></div>${data.activities.slice(0, 4).map((item) => `<div class="activity"><div class="activity-mark">${escapeHtml(item.mark)}</div><p>${escapeHtml(item.text)}<small>${escapeHtml(item.time)}</small></p></div>`).join("") || `<div class="empty-state">Még nincs aktivitás.</div>`}</section></div>`;
}

export function renderAdminContent() {
  if (currentView === "clients") return renderClients();
  if (currentView === "trainers") return renderTrainers();
  if (currentView === "trainer-applications") return renderTrainerApplications();
  if (currentView === "administrators") return renderAdminAccounts();
  if (currentView === "subscriptions") return renderAdminSubscriptions();
  if (currentView === "coach-profiles") return renderAdminCoachProfiles();
  if (currentView === "coach-profile-review") return renderCoachProfileDetail();
  if (currentView === "client-detail") return renderEnhancedClientDetail(selectedClient());
  return renderAdminOverview();
}

function renderAdminOverview() {
  const { records, buckets } = adminPeriodData(adminDashboardPeriod);
  const completed = records.filter((record) => record.status === "Teljesítve").length;
  const cancelled = records.filter((record) => record.status === "Lemondva").length;
  const scheduled = records.filter((record) => record.status === "Beütemezve").length;
  const completionRate = completed + cancelled ? Math.round((completed / (completed + cancelled)) * 100) : 0;
  const maxValue = Math.max(1, ...buckets.flatMap((bucket) => [bucket.completed, bucket.cancelled]));
  const chart = buckets.map((bucket) => `<div class="dashboard-chart-column" aria-label="${escapeHtml(bucket.label)}: ${bucket.completed} teljesített, ${bucket.cancelled} lemondott">
    <div class="dashboard-chart-bars">
      <span class="dashboard-chart-bar dashboard-chart-completed" style="height:${bucket.completed ? Math.max(4, (bucket.completed / maxValue) * 100) : 0}%" title="${bucket.completed} teljesített"></span>
      <span class="dashboard-chart-bar dashboard-chart-cancelled" style="height:${bucket.cancelled ? Math.max(4, (bucket.cancelled / maxValue) * 100) : 0}%" title="${bucket.cancelled} lemondott"></span>
    </div><span class="dashboard-chart-label">${escapeHtml(bucket.label)}</span>
  </div>`).join("");
  const recentWorkouts = adminWorkoutRecords().map((record) => ({
    title: record.title,
    date: dateFromInputValue(record.date) ? new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium" }).format(dateFromInputValue(record.date)) : record.date,
    time: record.time,
    status: record.status,
    meta: `${record.client.name} · ${trainerName(record.trainerId)}`,
    sortDate: new Date(record.startsAt).getTime(),
    mark: initials(record.client.name)
  }));
  const latest = [...recentWorkouts, ...(data.groupWorkouts || []).map((workout) => {
    const date = groupWorkoutDate(workout);
    return date ? {
      title: workout.title,
      date: groupWorkoutDateLabel(workout),
      time: groupWorkoutTime(workout),
      status: workout.cancelledAt ? "Lemondva" : date.getTime() <= Date.now() ? "Lezajlott" : "Beütemezve",
      meta: `Csoportos edzés · ${workout.trainerName || trainerName(workout.trainerId)} · ${workout.participantCount}/${workout.capacity} fő`,
      sortDate: date.getTime(),
      mark: "CS"
    } : null;
  }).filter(Boolean)].sort((a, b) => b.sortDate - a.sortDate).slice(0, 8);
  const periodLabels = { week: "Heti", month: "Havi", year: "Éves" };
  const chartDescription = buckets.map((bucket) => `${bucket.label}: ${bucket.completed} teljesített, ${bucket.cancelled} lemondott`).join("; ");
  return `<div class="topbar"><div><div class="eyebrow">Adminisztráció / Dashboard</div><h1>Áttekintés</h1><p>A nyilvántartott edzések és a legutóbbi alkalmak összesítése.</p></div><div class="dashboard-period-switch" role="group" aria-label="Dashboard időszak">${Object.entries(periodLabels).map(([period, label]) => `<button type="button" class="btn ${adminDashboardPeriod === period ? "btn-dark" : "btn-ghost"}" data-admin-period="${period}" aria-pressed="${adminDashboardPeriod === period}">${label}</button>`).join("")}</div></div>
    <div class="stat-grid dashboard-stats"><div class="stat"><div class="number">${records.length}</div><div class="label">${periodLabels[adminDashboardPeriod]} egyéni edzés</div><div class="trend">Minden státusz</div></div><div class="stat"><div class="number">${completed}</div><div class="label">Teljesített</div><div class="trend">A kiválasztott időszakban</div></div><div class="stat"><div class="number">${cancelled}</div><div class="label">Lemondott</div><div class="trend">A kiválasztott időszakban</div></div><div class="stat"><div class="number">${completionRate}%</div><div class="label">Teljesítési arány</div><div class="trend">${scheduled} beütemezve, a jövőbelieket is számítva</div></div></div>
    <div class="content-grid dashboard-content-grid"><section class="panel dashboard-chart-panel"><div class="panel-head"><div><h2>Edzésstatisztika</h2><p>${periodLabels[adminDashboardPeriod]} bontás · egyéni, teljesített és lemondott edzések</p></div></div><div class="dashboard-chart-legend"><span><i class="dashboard-chart-completed"></i>Teljesített</span><span><i class="dashboard-chart-cancelled"></i>Lemondott</span></div><div class="dashboard-chart" role="img" aria-label="Egyéni edzések ${periodLabels[adminDashboardPeriod].toLowerCase()} bontásban: ${escapeHtml(chartDescription)}">${chart}</div></section>
    <section class="panel dashboard-recent-panel"><div class="panel-head"><div><h2>Legutóbbi edzések</h2><p>Egyéni és csoportos alkalmak</p></div><button class="text-button" data-view="calendar">Naptár</button></div>${latest.length ? latest.map((item) => `<div class="activity"><div class="activity-mark">${escapeHtml(item.mark)}</div><p><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.date)} · ${escapeHtml(item.time)} · ${escapeHtml(item.meta)}</small></p><span class="status ${item.status === "Teljesítve" || item.status === "Megtartva" ? "status-active" : item.status === "Lemondva" ? "status-cancelled" : "status-paused"}">${escapeHtml(item.status)}</span></div>`).join("") : `<div class="empty-state">Még nincs rögzített edzés.</div>`}</section></div>`;
}

function renderAdminAccounts() {
  const accounts = data.adminAccounts;
  const rows = (accounts || []).map((account) => {
    const canPromote = account.role === "client" && account.id !== currentUser()?.id && account.emailConfirmed !== false;
    const emailStatus = account.emailConfirmed === false ? "E-mail nincs megerősítve" : "";
    const roleLabel = account.role === "admin" ? "Adminisztrátor" : account.role === "trainer" ? "Edző" : "Kliens";
    const action = canPromote
      ? `<button type="button" class="btn btn-ghost" data-grant-admin="${escapeHtml(account.id)}">Adminjog megadása</button>`
      : account.role === "admin" ? "Már admin" : account.role === "client" && account.emailConfirmed === false ? "E-mail-megerősítés szükséges" : "Nem emelhető adminná";
    return `<tr><td><div class="client-cell"><div class="avatar">${initials(account.name || "")}</div>${escapeHtml(account.name || "Névtelen fiók")}</div></td><td>${escapeHtml(account.email || "Nincs elérhető e-mail-cím")}${emailStatus ? `<small class="account-email-status">${emailStatus}</small>` : ""}</td><td><span class="status ${account.role === "admin" ? "status-active" : "status-paused"}">${roleLabel}</span></td><td>${action}</td></tr>`;
  }).join("");
  const accountContent = !accounts
    ? `<div class="empty-state">Adminisztrátori fiókok betöltése…</div>`
    : rows ? `<div class="table-wrap admin-accounts-table"><table><thead><tr><th>Név</th><th>E-mail-cím</th><th>Szerepkör</th><th>Művelet</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : `<div class="empty-state">Nincs megjeleníthető fiók.</div>`;
  return `<div class="topbar"><div><div class="eyebrow">Munkatér / Adminisztrátorok</div><h1>Adminjogosultságok</h1><p>Regisztrált, megerősített kliensfiókok adminisztrátorrá emelése.</p></div></div><section class="panel"><div class="legal-status" role="note">Csak megerősített e-mail-című fióknak adhatsz adminjogot. Az adminisztrátorok azonos jogosultságúak; csak megbízható fióknak add meg ezt a szerepkört.</div>${accountContent}</section>`;
}

function renderAdminSubscriptions() {
  const subscriptions = data.adminSubscriptions;
  const rows = (subscriptions || []).map((sub) => `<tr><td><div class="client-cell"><div class="avatar">${initials(sub.name || "")}</div>${escapeHtml(sub.name || "Edző")}</div></td><td><span class="plan-badge plan-badge-${escapeHtml(sub.plan)}">${planLabel(sub.plan)}</span></td><td>${sub.status === "active" ? "Aktív" : escapeHtml(sub.status)}</td><td><select class="plan-select" data-set-plan-user="${escapeHtml(sub.id)}">${["free", "pro", "studio"].map((plan) => `<option value="${plan}" ${sub.plan === plan ? "selected" : ""}>${planLabel(plan)}</option>`).join("")}</select></td></tr>`).join("");
  const content = !subscriptions
    ? `<div class="empty-state">Előfizetések betöltése…</div>`
      : rows ? `<div class="table-wrap"><table><thead><tr><th>Edző</th><th>Csomag</th><th>Állapot</th><th>Csomag módosítása</th></tr></thead><tbody>${rows}</tbody></table></div>`
        : `<div class="empty-state">Még nincs edzői fiók.</div>`;
  return `<div class="topbar"><div><div class="eyebrow">Adminisztráció / Előfizetések</div><h1>Edzői csomagok</h1><p>Az edzők előfizetési csomagjainak kezelése. A módosítás azonnal érvénybe lép.</p></div></div><section class="panel"><div class="legal-status" role="note">Free: max 3 kliens, csoportos edzés max 6 fő, 2 edzésterv (max 3 nap/terv). Pro és Studio: korlátlan. Az online fizetés hamarosan érkezik.</div>${content}</section>`;
}

function renderAdminCoachProfiles() {
  const profiles = data.coachProfiles || [];
  return `<div class="topbar"><div><div class="eyebrow">Adminisztráció / Edzői profilok</div><h1>Edzői profilok áttekintése</h1><p>Ellenőrizd az edzők bemutatkozását és feltöltött képeit.</p></div></div>
    ${profiles.length ? `<div class="coach-directory">${profiles.map((profile) => `<article class="panel coach-card"><div class="coach-card-heading"><div class="avatar">${initials(profile.name)}</div><div><h2>${escapeHtml(profile.name)}</h2><p>${escapeHtml(profile.specialty || "Személyi edző")}</p></div></div><button class="btn btn-teal coach-open-profile" type="button" data-coach-review="${escapeHtml(profile.id)}">Profil áttekintése</button></article>`).join("")}</div>` : `<section class="panel empty-state">Még nincs áttekinthető edzői profil.</section>`}`;
}

function renderTrainers() {
  const trainerList = trainers();
  return `<div class="topbar"><div><div class="eyebrow">Munkatér / Edzők</div><h1>Edzők</h1><p>Az edzői fiókokat és hozzáféréseket itt kezelheted.</p></div><button class="btn btn-teal" id="add-trainer">+ Új edző</button></div><section class="panel"><div class="table-wrap"><table><thead><tr><th>Edző</th><th>Szakterület</th><th>Hozzárendelt kliens</th><th></th></tr></thead><tbody>${trainerList.length ? trainerList.map((trainer) => `<tr><td><div class="client-cell"><div class="avatar">${initials(trainer.name)}</div>${escapeHtml(trainer.name)}</div><small>${escapeHtml(trainer.email || "")}</small></td><td>${escapeHtml(trainer.specialty || "Általános edzés")}</td><td>${data.users.filter((client) => client.role === "client" && (client.trainerIds || []).includes(trainer.id)).length}</td><td><button class="text-button" data-coach-review="${escapeHtml(trainer.id)}" ${(data.coachProfiles || []).some((profile) => profile.id === trainer.id) ? "" : 'disabled title="Még nincs kitöltött bemutatkozó profil"'}>Megtekintés</button> <button class="text-button btn-delete-trainer" data-trainer-id="${trainer.id}">Törlés</button></td></tr>`).join("") : `<tr><td colspan="4"><div class="empty-state">Még nincs edző.</div></td></tr>`}</tbody></table></div></section>`;
}

function renderTrainerApplications() {
  const applications = pendingTrainerApplications();
  return `<div class="topbar"><div><div class="eyebrow">Munkatér / Edzői jelentkezések</div><h1>Edzői jelentkezések</h1><p>E-mail-megerősítés után hagyd jóvá vagy utasítsd el az edzői hozzáférést.</p></div></div><section class="panel">${applications.length ? applications.map((application) => `<div class="connection-row"><div><strong>${escapeHtml(application.full_name)}</strong><p>${escapeHtml(application.email || "Nincs e-mail-cím")} · ${escapeHtml(application.specialty || "Nincs megadva szakterület")}</p><small>${application.created_at ? `Jelentkezett: ${escapeHtml(new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium" }).format(new Date(application.created_at)))}` : ""}${application.emailConfirmed ? " · E-mail megerősítve" : " · E-mail-megerősítésre vár"}</small></div><button class="btn btn-teal" data-trainer-application="approved" data-user-id="${escapeHtml(application.id)}" ${application.emailConfirmed ? "" : "disabled"}>Jóváhagyás</button><button class="btn btn-ghost" data-trainer-application="rejected" data-user-id="${escapeHtml(application.id)}">Elutasítás</button></div>`).join("") : `<div class="empty-state">Nincs elbírálásra váró edzői jelentkezés.</div>`}</section>`;
}

export async function loadAdminAccounts() {
  if (!remoteMode) return;
  try {
    data.adminAccounts = await api.listAdminAccounts();
    render();
  } catch (error) {
    toast(`Nem sikerült betölteni az adminisztrátori fiókokat: ${error.message}`);
  }
}

export async function loadTrainerEmails() {
  if (!remoteMode) return;
  try {
    const accounts = await api.listTrainerAccounts();
    const emails = new Map(accounts.map((account) => [account.id, account]));
    data.users.forEach((user) => {
      const account = emails.get(user.id);
      if (user.role === "trainer" && account) { user.email = account.email; user.emailConfirmed = account.emailConfirmed; }
    });
    render();
  } catch (error) {
    toast(`Nem sikerült betölteni az edzők e-mail-címét: ${error.message}`);
  }
}

export async function deleteTrainer(trainerId) {
  if (!confirm("Biztosan törlöd ezt az edzői fiókot? A hozzárendelései is megszűnnek.")) return;
  try { await api.accountAdmin({ action: "delete-user", userId: trainerId }); data.users = data.users.filter((user) => user.id !== trainerId); render(); toast("Az edző törölve."); }
  catch (error) { toast(`Nem sikerült törölni: ${error.message}`); }
}

export async function grantAdminRole(userId) {
  const account = data.adminAccounts?.find((item) => item.id === userId);
  if (!account || account.role !== "client" || account.emailConfirmed === false) return;
  if (!confirm(`Biztosan adminisztrátori jogosultságot adsz ${account.name || account.email} fiókjának? Az adminok minden adminisztrátori funkcióhoz hozzáférnek.`)) return;
  try {
    await api.accountAdmin({ action: "grant-admin", userId });
    const remoteData = await api.load();
    if (!remoteData) throw new Error("A fiók frissítése után nem sikerült újratölteni az adatokat.");
    setData(remoteData);
    setSession(remoteData.sessionId);
    data.adminAccounts = await api.listAdminAccounts();
    render();
    toast("Az adminjogosultság megadva.");
  } catch (error) {
    toast(`Nem sikerült adminjogot adni: ${error.message}`);
  }
}
