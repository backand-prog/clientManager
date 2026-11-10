import {
  data
} from "../state.js";
import { currentPlan, escapeHtml, initials, nextSessionLabel, planLabel, trainerName, trainers, trainingPlanDayLabel, workoutStats } from "../helpers.js";

export function renderClientTable(clients) {
  if (!clients.length) return `<div class="empty-state">Még nincs kliens. Add hozzá az első klienst.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Kliens</th><th>Fókusz</th><th>Edzések</th><th>Teljesítés</th><th>Állapot</th><th></th></tr></thead><tbody>${clients.map((client) => `<tr><td><div class="client-cell"><div class="avatar">${initials(client.name)}</div>${escapeHtml(client.name)}</div></td><td>${escapeHtml(client.goal || "Nincs beállítva")}</td><td><strong>${(client.workouts || []).length}</strong> edzés</td><td>${workoutStats(client).adherence}%</td><td><span class="status status-${client.status === "Aktív" ? "active" : "paused"}">${escapeHtml(client.status || "Aktív")}</span></td><td><button class="text-button" data-client-id="${client.id}">Megnyitás</button></td></tr>`).join("")}</tbody></table></div>`;
}

export function renderClients() {
  const clients = data.users.filter((user) => user.role === "client");
  return `<div class="topbar"><div><div class="eyebrow">Munkatér / Kliensek</div><h1>Klienseid</h1><p>Minden terv, visszajelzés és edzés egy helyen.</p></div><button class="btn btn-teal" id="add-client">Kliens regisztrációja</button></div><section class="panel"><div class="search-row"><input id="client-search" placeholder="Keresés név vagy e-mail alapján" aria-label="Keresés név vagy e-mail alapján" /></div><div id="client-table">${renderClientTable(clients)}</div></section>`;
}

export function renderEnhancedClientDetail(client) {
  if (!client) return renderClients();
  const workouts = client.workouts || [];
  const assignedTrainers = (client.trainerIds || []).map((id) => trainers().find((trainer) => trainer.id === id)).filter(Boolean);
  return `<div class="topbar"><div><button class="text-button" data-view="clients">← Vissza a kliensekhez</button><div class="eyebrow" style="margin-top:18px">Kliens / ${escapeHtml(client.name)}</div><h1>${escapeHtml(client.name)}</h1><p>${escapeHtml(client.goal || "Nincs beállított fókusz")}</p></div><div style="display:flex;gap:10px"><button class="btn btn-ghost" id="edit-client">Profil szerkesztése</button><button class="btn btn-ghost" id="manage-trainers">Edzők kezelése</button><button class="btn btn-teal" id="add-workout">+ Új edzés</button></div></div><div class="detail-layout"><section class="panel profile-card"><div class="profile-avatar">${initials(client.name)}</div><h2>${escapeHtml(client.name)}</h2><p>${escapeHtml(client.email)}</p><span class="status status-${client.status === "Aktív" ? "active" : "paused"}">${escapeHtml(client.status || "Aktív")}</span><div class="profile-meta"><div class="meta-row"><span>Fókusz</span><strong>${escapeHtml(client.goal || "Nincs beállítva")}</strong></div><div class="meta-row"><span>Edzők</span><strong>${assignedTrainers.length ? assignedTrainers.map((trainer) => escapeHtml(trainer.name)).join(", ") : "Nincs hozzárendelve"}</strong></div><div class="meta-row"><span>Következő edzés</span><strong>${escapeHtml(nextSessionLabel(client))}</strong></div></div></section><section class="panel"><div class="panel-head"><h2>Edzések</h2><span class="eyebrow" style="margin:0">${workouts.length} rögzítve</span></div>${workouts.length ? workouts.map((workout, index) => `<div class="session-row"><div><strong>${escapeHtml(workout.type)}</strong><p>${escapeHtml(workout.date)} · ${escapeHtml(workout.time)} · ${workout.duration} perc · ${escapeHtml(trainerName(workout.trainerId))}</p>${trainingPlanDayLabel(workout.trainingPlanDayId) ? `<p>Edzéstervnap: ${escapeHtml(trainingPlanDayLabel(workout.trainingPlanDayId))}</p>` : ""}${workout.notes ? `<p>${escapeHtml(workout.notes)}</p>` : ""}</div><span class="status status-${workout.status === "Teljesítve" ? "active" : "paused"}">${escapeHtml(workout.status)}</span><button class="text-button" data-workout-index="${index}">Szerkesztés</button></div>`).join("") : `<div class="empty-state">Ehhez a klienshez még nincs rögzített edzés.</div>`}</section></div>`;
}

export function renderTrainerClients(trainer) {
  const clients = data.users.filter((user) => user.role === "client" && (user.trainerIds || []).includes(trainer.id));
  const planBadge = `<span class="plan-badge plan-badge-${currentPlan()}">${planLabel()} csomag${currentPlan() === "free" ? ` · ${clients.length}/3 kliens` : ""}</span>`;
  return `<div class="topbar"><div><div class="eyebrow">Edzői tér / Kliensek</div><h1>Klienseid ${planBadge}</h1><p>Minden hozzád rendelt kliens és edzésük.</p></div></div><section class="panel">${renderClientTable(clients)}</section>`;
}
