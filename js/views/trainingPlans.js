import { currentUser } from "../auth.js";
import {
  data
} from "../state.js";
import { escapeHtml, exerciseCatalogOptions } from "../helpers.js";

export function renderTrainingPlanExercise(exercise = {}) {
  return `<div class="plan-exercise" data-plan-exercise>
    <div class="field"><label>Gyakorlat neve</label><input name="exerciseName" list="exercise-catalog" required maxlength="120" value="${escapeHtml(exercise.name || "")}" placeholder="Keresés vagy saját gyakorlat" /><small class="settings-help">Kezdj el gépelni az alapgyakorlatok kereséséhez, vagy adj meg saját nevet.</small></div>
    <div class="field"><label>Sorozat</label><input name="exerciseSets" type="number" min="1" max="30" required value="${escapeHtml(exercise.sets ?? 3)}" /></div>
    <div class="field"><label>Ismétlés</label><input name="exerciseReps" required maxlength="60" value="${escapeHtml(exercise.reps || "")}" placeholder="pl. 8–10" /></div>
    <div class="field"><label>Pihenő (mp)</label><input name="exerciseRest" type="number" min="0" max="1800" value="${escapeHtml(exercise.restSeconds ?? "")}" placeholder="90" /></div>
    <div class="field span-2"><label>Megjegyzés</label><input name="exerciseNotes" maxlength="1000" value="${escapeHtml(exercise.notes || "")}" placeholder="Technikai vagy tempó instrukció" /></div>
    <button type="button" class="text-button plan-remove-action" data-remove-plan-exercise>Gyakorlat eltávolítása</button>
  </div>`;
}

export function renderTrainingPlanDay(day = {}, index = 0) {
  const exercises = day.exercises?.length ? day.exercises : [{ name: "", sets: 3, reps: "", restSeconds: "", notes: "" }];
  return `<section class="plan-day" data-plan-day data-day-id="${escapeHtml(day.id || "")}">
    <div class="plan-day-heading"><h3>Edzésnap</h3><button type="button" class="text-button" data-remove-plan-day>Nap eltávolítása</button></div>
    <div class="field"><label>Edzésnap neve</label><input name="dayTitle" required maxlength="120" value="${escapeHtml(day.title || `Edzésnap ${index + 1}`)}" placeholder="pl. A nap · Alsótest" /></div>
    <div class="field"><label>Edzésnap megjegyzése</label><textarea name="dayNotes" maxlength="1000" placeholder="Opcionális instrukciók">${escapeHtml(day.notes || "")}</textarea></div>
    <div class="plan-exercises" data-plan-exercises>${exercises.map(renderTrainingPlanExercise).join("")}</div>
    <button type="button" class="btn btn-ghost plan-add-exercise" data-add-plan-exercise>+ Gyakorlat hozzáadása</button>
  </section>`;
}

export function renderTrainingPlanModal(plan = {}) {
  const user = currentUser();
  const clients = data.users.filter((item) => item.role === "client" && (item.trainerIds || []).includes(user.id));
  const selectedClientIds = new Set(plan.clientIds || []);
  const days = plan.days?.length ? plan.days : [{ title: "Edzésnap 1", exercises: [{ name: "", sets: 3, reps: "", notes: "" }] }];
  return `<div class="modal-backdrop" id="modal-backdrop"><section class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="plan-editor-title">
    <div class="modal-head"><div><div class="eyebrow">${plan.id ? "Edzésterv szerkesztése" : "Új edzésterv"}</div><h2 id="plan-editor-title">${plan.id ? "Edzésterv szerkesztése" : "Edzésterv készítése"}</h2></div><button type="button" class="close" id="close-modal" aria-label="Bezárás">&times;</button></div>
    <form id="training-plan-form" data-plan-id="${escapeHtml(plan.id || "")}">
      <div class="field"><label for="plan-title">Edzésterv neve</label><input id="plan-title" name="title" required maxlength="120" value="${escapeHtml(plan.title || "")}" placeholder="pl. Alapozó erőnléti terv" /></div>
      <div class="field"><label for="plan-description">Rövid leírás</label><textarea id="plan-description" name="description" maxlength="2000" placeholder="Kinek szól, mi a terv fókusza?">${escapeHtml(plan.description || "")}</textarea><small class="settings-help">Ne adj meg diagnózist, sérülésre vagy egészségi állapotra vonatkozó adatot.</small></div>
      <label class="plan-public-toggle"><input type="checkbox" id="plan-public" name="isPublic" ${plan.isPublic ? "checked" : ""} /> <span><strong>Publikus edzésterv</strong><small>Minden bejelentkezett felhasználó számára látható.</small></span></label>
      <fieldset class="plan-sharing" id="plan-client-access" ${plan.isPublic ? "disabled" : ""}><legend>Megosztás a hozzád rendelt kliensekkel</legend>${clients.length
        ? clients.map((client) => `<label><input type="checkbox" name="clientIds" value="${escapeHtml(client.id)}" ${selectedClientIds.has(client.id) ? "checked" : ""} /> ${escapeHtml(client.name)}</label>`).join("")
        : `<p class="settings-help">Még nincs hozzád rendelt kliensed; előbb hozz létre kapcsolatot a klienssel.</p>`}</fieldset>
      <div class="plan-days-heading"><h3>Edzésnapok és gyakorlatok</h3><p>Minden edzésnaphoz legalább egy gyakorlatot adj meg.</p></div>
      <div id="training-plan-days">${days.map((day, index) => renderTrainingPlanDay(day, index)).join("")}</div>
      ${exerciseCatalogOptions()}
      <button type="button" class="btn btn-ghost" id="add-plan-day">+ Edzésnap hozzáadása</button>
      <div class="plan-editor-actions"><button type="button" class="btn btn-ghost" id="cancel-modal">Mégse</button><button type="submit" class="btn btn-dark">Edzésterv mentése</button></div>
    </form>
  </section></div>`;
}

function renderTrainingPlanCard(plan, user) {
  const isOwner = user.role === "trainer" && plan.trainerId === user.id;
  const sharingLabel = plan.isPublic
    ? "Publikus · bejelentkezett felhasználóknak"
    : isOwner
      ? plan.clientIds?.length
        ? `Megosztva: ${plan.clientIds.map((id) => data.users.find((item) => item.id === id)?.name || "Kliens").map(escapeHtml).join(", ")}`
        : "Privát · csak te láthatod"
      : "Megosztott edzésterv";
  return `<article class="training-plan-card">
    <div class="training-plan-heading"><div><div class="eyebrow">${escapeHtml(plan.trainerName || (isOwner ? user.name : "BackPlan edző"))}</div><h2>${escapeHtml(plan.title)}</h2></div><div class="training-plan-actions">${isOwner ? `<button type="button" class="btn btn-ghost" data-edit-training-plan="${escapeHtml(plan.id)}">Szerkesztés</button><button type="button" class="text-button plan-delete-action" data-delete-training-plan="${escapeHtml(plan.id)}">Törlés</button>` : ""}</div></div>
    <p class="training-plan-description">${escapeHtml(plan.description || "Nincs leírás.")}</p><div class="training-plan-meta"><span class="status ${plan.isPublic ? "status-active" : "status-paused"}">${escapeHtml(sharingLabel)}</span><span>${plan.days?.length || 0} edzésnap</span></div>
    <div class="training-plan-days">${(plan.days || []).map((day, index) => `<section class="training-plan-day"><div><span class="eyebrow">Edzésnap ${index + 1}</span><h3>${escapeHtml(day.title)}</h3>${day.notes ? `<p>${escapeHtml(day.notes)}</p>` : ""}</div><div class="training-plan-exercises">${(day.exercises || []).map((exercise) => `<div class="training-plan-exercise"><strong>${escapeHtml(exercise.name)}</strong><span>${escapeHtml(exercise.sets)} × ${escapeHtml(exercise.reps)}${exercise.restSeconds !== null && exercise.restSeconds !== "" ? ` · ${escapeHtml(exercise.restSeconds)} mp pihenő` : ""}</span>${exercise.notes ? `<p>${escapeHtml(exercise.notes)}</p>` : ""}</div>`).join("")}</div></section>`).join("")}</div>
  </article>`;
}

export function renderTrainingPlans(user) {
  const plans = (data.trainingPlans || []).filter((plan) => {
    if (user.role === "trainer") return plan.trainerId === user.id || plan.isPublic;
    if (user.role === "client") return plan.isPublic || ((plan.clientIds || []).includes(user.id) && (user.trainerIds || []).includes(plan.trainerId));
    return plan.isPublic;
  });
  const isTrainer = user.role === "trainer";
  const description = isTrainer
    ? "Állíts össze többnapos terveket gyakorlatokkal, majd oszd meg a kapcsolt kliensekkel vagy tedd publikussá."
    : "A neked megosztott és minden bejelentkezett felhasználó számára elérhető edzéstervek.";
  return `<div class="topbar"><div><div class="eyebrow">${isTrainer ? "Edzői tér" : "Munkatér"} / Tervezés</div><h1>Edzéstervek</h1><p>${description}</p></div>${isTrainer ? `<button type="button" class="btn btn-teal" id="add-training-plan">+ Új edzésterv</button>` : ""}</div>
    ${plans.length ? `<div class="training-plan-list">${plans.map((plan) => renderTrainingPlanCard(plan, user)).join("")}</div>` : `<section class="panel empty-state">${isTrainer ? "Még nincs edzésterved. Hozz létre egyet, és válaszd ki, kikkel osztod meg." : "Jelenleg nincs számodra elérhető edzésterv."}</section>`}`;
}
