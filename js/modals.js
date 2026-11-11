import * as api from "./api.js";
import { currentUser } from "./auth.js";
import {
  data
} from "./state.js";
import { render, toast, refreshRemote } from "./runtime.js";
import { assignedTrainerOptions, calendarClientsFor, currentPlan, escapeHtml, selectedClient, trainerName, trainers, visibleTrainingPlanDaysForClient, workoutDateToInputValue, workoutTypeCatalogOptions } from "./helpers.js";
import { renderTrainingPlanDay, renderTrainingPlanExercise } from "./views/trainingPlans.js";

export function openModal(client = {}) { document.body.insertAdjacentHTML("beforeend", typeof client === "string" ? client : renderModal("client", client)); bindModalEvents(); }

function bindModalEvents() {
  document.querySelector("#close-modal")?.addEventListener("click", () => document.querySelector("#modal-backdrop").remove());
  document.querySelector("#cancel-modal")?.addEventListener("click", () => document.querySelector("#modal-backdrop").remove());
  const trainingPlanForm = document.querySelector("#training-plan-form");
  const planDays = document.querySelector("#training-plan-days");
  document.querySelector("#plan-public")?.addEventListener("change", (event) => {
    document.querySelector("#plan-client-access").disabled = event.currentTarget.checked;
  });
  document.querySelector("#add-plan-day")?.addEventListener("click", () => {
    if (planDays.children.length >= 30) return toast("Egy edzésterv legfeljebb 30 edzésnapot tartalmazhat.");
    planDays.insertAdjacentHTML("beforeend", renderTrainingPlanDay({}, planDays.children.length));
  });
  trainingPlanForm?.addEventListener("click", (event) => {
    const addExercise = event.target.closest("[data-add-plan-exercise]");
    if (addExercise) {
      const exercises = addExercise.parentElement.querySelector("[data-plan-exercises]");
      if (exercises.children.length >= 30) return toast("Egy edzésnap legfeljebb 30 gyakorlatot tartalmazhat.");
      exercises.insertAdjacentHTML("beforeend", renderTrainingPlanExercise());
      return;
    }
    const removeExercise = event.target.closest("[data-remove-plan-exercise]");
    if (removeExercise) {
      removeExercise.closest("[data-plan-exercise]").remove();
      return;
    }
    const removeDay = event.target.closest("[data-remove-plan-day]");
    if (removeDay) removeDay.closest("[data-plan-day]").remove();
  });
  trainingPlanForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const isPublic = form.querySelector("#plan-public").checked;
    const plan = {
      id: form.dataset.planId || null,
      title: form.querySelector('[name="title"]').value.trim(),
      description: form.querySelector('[name="description"]').value.trim(),
      isPublic,
      clientIds: isPublic ? [] : [...form.querySelectorAll('[name="clientIds"]:checked')].map((input) => input.value),
      days: [...form.querySelectorAll("[data-plan-day]")].map((day) => ({
        id: day.dataset.dayId || null,
        title: day.querySelector('[name="dayTitle"]').value.trim(),
        notes: day.querySelector('[name="dayNotes"]').value.trim(),
        exercises: [...day.querySelectorAll("[data-plan-exercise]")].map((exercise) => ({
          name: exercise.querySelector('[name="exerciseName"]').value.trim(),
          sets: Number(exercise.querySelector('[name="exerciseSets"]').value),
          reps: exercise.querySelector('[name="exerciseReps"]').value.trim(),
          restSeconds: exercise.querySelector('[name="exerciseRest"]').value === "" ? null : Number(exercise.querySelector('[name="exerciseRest"]').value),
          notes: exercise.querySelector('[name="exerciseNotes"]').value.trim()
        }))
      }))
    };
    if (!plan.days.length || plan.days.some((day) => !day.title || !day.exercises.length || day.exercises.some((exercise) => !exercise.name || !exercise.reps || !Number.isInteger(exercise.sets) || exercise.sets < 1 || exercise.sets > 30 || (exercise.restSeconds !== null && (!Number.isInteger(exercise.restSeconds) || exercise.restSeconds < 0 || exercise.restSeconds > 1800))))) {
      return toast("Adj meg minden edzésnaphoz legalább egy érvényes gyakorlatot, sorozatot és ismétlésszámot.");
    }
    if (currentUser()?.role === "trainer" && currentPlan() === "free") {
      if (plan.days.length > 3) return toast("A Free csomagban egy edzésterv legfeljebb 3 edzésnapot tartalmazhat.");
      if (!plan.id && (data.trainingPlans || []).filter((item) => item.trainerId === currentUser().id).length >= 2) return toast("A Free csomagban legfeljebb 2 edzésterv készíthető.");
    }
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await api.saveTrainingPlan(plan);
      document.querySelector("#modal-backdrop")?.remove();
      await refreshRemote();
      toast(plan.id ? "Az edzésterv frissítve." : "Az edzésterv létrehozva.");
    } catch (error) {
      submit.disabled = false;
      toast(`Nem sikerült menteni az edzéstervet: ${error.message}`);
    }
  });
  document.querySelector("#group-workout-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const startsAt = new Date(values.startsAt);
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
      toast("A csoportos edzés kezdése jövőbeli időpont legyen.");
      return;
    }
    const workout = {
      title: values.title.trim(),
      description: values.description.trim(),
      startsAt: startsAt.toISOString(),
      duration: Number(values.duration),
      capacity: Number(values.capacity),
      location: (values.location || "").trim()
    };
    if (currentUser()?.role === "trainer" && currentPlan() === "free" && workout.capacity > 8) {
      toast("A Free csomagban a csoportos edzés legfeljebb 8 fős lehet.");
      return;
    }
    const submit = form.querySelector('button[type="submit"], button:not([type])');
    if (submit) submit.disabled = true;
    const editId = form.dataset.groupId || "";
    try {
      if (editId) await api.updateGroupWorkout(editId, workout);
      else await api.createGroupWorkout(workout);
      document.querySelector("#modal-backdrop")?.remove();
      await refreshRemote();
      toast(editId ? "A csoportos edzés frissítve." : "A csoportos edzés meghirdetve.");
    } catch (error) {
      if (submit) submit.disabled = false;
      toast(`Nem sikerült menteni a csoportos edzést: ${error.message}`);
    }
  });
  document.querySelector("#client-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget); const id = event.currentTarget.dataset.id;
    const values = Object.fromEntries(formData.entries());
    if (!id) return toast("Új kliens létrehozása ebben a felületen nem támogatott.");
    const client = data.users.find((user) => user.id === id);
    Object.assign(client, values);
    api.updateProfile(client).then(refreshRemote).catch((error) => toast(`Mentési hiba: ${error.message}`));
    document.querySelector("#modal-backdrop").remove(); render(); toast("Kliensadatok frissítve");
  });
  document.querySelector("#workout-form")?.addEventListener("submit", (event) => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); values.duration = Number(values.duration) || 0; const client = data.users.find((user) => user.id === event.currentTarget.dataset.clientId) || (currentUser().role === "client" ? currentUser() : selectedClient()); if (!client) return toast("Nem található a kliens ehhez az edzéshez."); client.workouts ||= []; const index = event.currentTarget.dataset.index;
    if (values.trainerId === "solo") values.trainerId = "";
    const workoutId = index === "" ? "" : client.workouts[Number(index)]?.id || "";
    // Kliens nem választhat edzőt: új edzése egyéni, meglévő edzésénél az edző változatlan marad.
    if (currentUser().role === "client") values.trainerId = index === "" ? "" : client.workouts[Number(index)]?.trainerId || "";
    else if (!values.trainerId) return toast("Válassz edzőt az edzéshez (csak a klienshez rendelt edző adható meg).");
    if (workoutId) values.id = workoutId;
    if (index === "") client.workouts.push(values); else client.workouts[Number(index)] = values;
    values.trainingPlanDayId ||= "";
    client.sessions = client.workouts.filter((workout) => workout.status === "Teljesítve").length; api.saveWorkout(client.id, values, workoutId).then(refreshRemote).catch((error) => toast(`Mentési hiba: ${error.message}`)); document.querySelector("#modal-backdrop").remove(); render(); toast(index === "" ? "Edzés hozzáadva" : "Edzés frissítve");
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
    event.preventDefault(); selectedClient().trainerIds = new FormData(event.currentTarget).getAll("trainerIds"); api.updateAssignments(selectedClient().id, selectedClient().trainerIds).then(refreshRemote).catch((error) => toast(`Mentési hiba: ${error.message}`)); document.querySelector("#modal-backdrop").remove(); render(); toast("Edzői kapcsolatok frissítve");
  });
  document.querySelector("#trainer-form")?.addEventListener("submit", async (event) => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api.accountAdmin({ action: "create-trainer", ...values });
      document.querySelector("#modal-backdrop").remove(); await refreshRemote(); render(); toast("Edzői fiók létrehozva");
    } catch (error) { toast(`Nem sikerült létrehozni: ${error.message}`); }
  });
  document.querySelector("#studio-coach-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector("button.btn-dark");
    const values = Object.fromEntries(new FormData(form).entries());
    submit.disabled = true;
    try {
      await api.inviteStudioCoach(values.email, values.name);
      document.querySelector("#modal-backdrop").remove();
      await refreshRemote();
      render();
      toast("A meghívó elküldve");
    } catch (error) {
      submit.disabled = false;
      toast(`Nem sikerült a meghívás: ${error.message}`);
    }
  });
}

function renderModal(type, client = {}) {
  const isEdit = Boolean(client.id);
  return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">${isEdit ? "Kliensadatok" : "Új kliens"}</div><h2>${isEdit ? "Kliens frissítése" : "Kliens hozzáadása"}</h2></div><button class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><form id="client-form" data-id="${client.id || ""}"><div class="form-grid"><div class="field"><label for="client-name">Teljes név</label><input id="client-name" name="name" required value="${escapeHtml(client.name || "")}" /></div><div class="field"><label for="client-email">E-mail</label><input id="client-email" name="email" type="email" required value="${escapeHtml(client.email || "")}" /></div><div class="field"><label for="client-goal">Fő cél</label><input id="client-goal" name="goal" value="${escapeHtml(client.goal || "")}" placeholder="pl. Erő és mobilitás" /></div><div class="field"><label for="client-status">Állapot</label><select id="client-status" name="status"><option ${client.status === "Aktív" ? "selected" : ""}>Aktív</option><option ${client.status === "Szüneteltetve" ? "selected" : ""}>Szüneteltetve</option></select></div><div class="field span-2"><label for="client-notes">Edzői megjegyzések</label><textarea id="client-notes" name="notes">${escapeHtml(client.notes || "")}</textarea></div></div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button type="button" class="btn btn-ghost" id="cancel-modal">Mégse</button><button class="btn btn-dark">${isEdit ? "Módosítások mentése" : "Kliens létrehozása"}</button></div></form></div></div>`;
}

function renderWorkoutModal(client, workout = {}, index = "") {
  const planDays = visibleTrainingPlanDaysForClient(client);
  const selectedDayId = workout.trainingPlanDayId || "";
  const dayOptions = planDays.map(({ dayId, label }) => `<option value="${escapeHtml(dayId)}" ${selectedDayId === dayId ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
  return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">${escapeHtml(client.name)} / Edzés</div><h2>${index === "" ? "Új edzés hozzáadása" : "Edzés szerkesztése"}</h2></div><button class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><form id="workout-form" data-index="${index}" data-client-id="${escapeHtml(client.id)}"><div class="form-grid"><div class="field"><label for="workout-date">Dátum</label><input id="workout-date" name="date" required type="date" value="${escapeHtml(workoutDateToInputValue(workout.date))}" /></div><div class="field"><label for="workout-time">Időpont</label><input id="workout-time" name="time" required type="time" value="${escapeHtml(workout.time || "09:00")}" /></div><div class="field span-2"><label for="workout-type">Edzés típusa</label><input id="workout-type" name="type" list="workout-type-catalog" required value="${escapeHtml(workout.type || "")}" placeholder="pl. Súlyzós edzés, Kardio…" />${workoutTypeCatalogOptions()}<small class="settings-help">Válassz a típusok közül, vagy írj be egyedi megnevezést.</small></div><div class="field span-2"><label for="workout-training-plan-day">Edzésnap (nem kötelező)</label><select id="workout-training-plan-day" name="trainingPlanDayId"><option value="">Nincs edzésnaphoz rendelve</option>${dayOptions}</select><small class="settings-help">${planDays.length ? "A kliens számára elérhető edzésterv napjai közül választhatsz." : "Ehhez a klienshez jelenleg nincs elérhető edzéstervnap."}</small></div><div class="field"><label for="workout-duration">Időtartam (perc)</label><input id="workout-duration" name="duration" required type="number" min="1" value="${workout.duration || 60}" /></div><div class="field"><label for="workout-status">Állapot</label><select id="workout-status" name="status"><option ${workout.status === "Beütemezve" ? "selected" : ""}>Beütemezve</option><option ${workout.status === "Teljesítve" ? "selected" : ""}>Teljesítve</option><option ${workout.status === "Lemondva" ? "selected" : ""}>Lemondva</option></select></div><div class="field span-2"><label for="workout-notes">Megjegyzés</label><textarea id="workout-notes" name="notes" placeholder="Rövid megjegyzés az edzésről">${escapeHtml(workout.notes || "")}</textarea><small class="privacy-warning">Ne írj ide diagnózist, sérülést, gyógyszerelést vagy más egészségügyi adatot.</small></div></div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button type="button" class="btn btn-ghost" id="cancel-modal">Mégse</button><button class="btn btn-dark">Edzés mentése</button></div></form></div></div>`;
}

export function renderWorkoutModalForUser(client, workout = {}, index = "") {
  const user = currentUser();
  // Kliens csak edző nélküli, egyéni edzést vehet fel: számára nincs edzőválasztó.
  if (user.role === "client") return renderWorkoutModal(client, workout, index);
  const trainerId = workout.trainerId || (user.role === "trainer" && index === "" ? user.id : "");
  const choices = assignedTrainerOptions(client.id);
  if (trainerId && !choices.some((trainer) => trainer.id === trainerId)) choices.push({ id: trainerId, name: trainerName(trainerId) });
  if (!choices.length) {
    return renderWorkoutModal(client, workout, index).replace(`<div class="field span-2"><label for="workout-notes">`, `<div class="field span-2"><label for="workout-trainer">Edző</label><select id="workout-trainer" name="trainerId" required disabled><option>Nincs a klienshez rendelt edző</option></select></div><div class="field span-2"><label for="workout-notes">`);
  }
  const options = `<option value="" disabled ${trainerId ? "" : "selected"}>Válassz edzőt</option>${choices.map((trainer) => `<option value="${escapeHtml(trainer.id)}" ${trainerId === trainer.id ? "selected" : ""}>${escapeHtml(trainer.name)}</option>`).join("")}`;
  return renderWorkoutModal(client, workout, index).replace(`<div class="field span-2"><label for="workout-notes">`, `<div class="field span-2"><label for="workout-trainer">Edző</label><select id="workout-trainer" name="trainerId" required>${options}</select><small class="settings-help">Csak a klienshez rendelt edzők közül választhatsz.</small></div><div class="field span-2"><label for="workout-notes">`);
}

export function renderTrainerAssignmentModal(client) {
  const selected = client.trainerIds || [];
  return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">${escapeHtml(client.name)} / Kapcsolatok</div><h2>Edzők hozzárendelése</h2></div><button class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><form id="trainer-assignment-form"><p style="color:var(--muted);font-size:.84rem;margin-top:0">Egy klienshez több edző is hozzárendelhető. A jelölés kikapcsolásával a kapcsolat megszűnik.</p>${trainers().length ? trainers().map((trainer) => `<label style="display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid var(--line);font-weight:600"><input type="checkbox" name="trainerIds" value="${trainer.id}" ${selected.includes(trainer.id) ? "checked" : ""} /> ${escapeHtml(trainer.name)} <span style="color:var(--muted);font-size:.75rem">${escapeHtml(trainer.specialty || "Edző")}</span></label>`).join("") : `<div class="empty-state">Még nincs regisztrált edző.</div>`}<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px"><button type="button" class="btn btn-ghost" id="cancel-modal">Mégse</button><button class="btn btn-dark">Kapcsolatok mentése</button></div></form></div></div>`;
}

export function renderTrainerModal() {
  return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">Adminisztráció</div><h2>Új edző létrehozása</h2></div><button class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><form id="trainer-form"><div class="field"><label for="trainer-name">Teljes név</label><input id="trainer-name" name="name" required /></div><div class="field"><label for="trainer-email">E-mail-cím</label><input id="trainer-email" name="email" type="email" required /></div><div class="field"><label for="trainer-password">Ideiglenes jelszó</label><input id="trainer-password" name="password" type="password" minlength="8" required /></div><div class="field"><label for="trainer-specialty">Szakterület</label><input id="trainer-specialty" name="specialty" placeholder="pl. Erőnléti edzés" /></div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button type="button" class="btn btn-ghost" id="cancel-modal">Mégse</button><button class="btn btn-dark">Edző létrehozása</button></div></form></div></div>`;
}

export function renderStudioCoachModal() {
  return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">Studio / Csapatom</div><h2>Új edző meghívása</h2></div><button class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><form id="studio-coach-form"><div class="field"><label for="studio-coach-name">Teljes név</label><input id="studio-coach-name" name="name" required maxlength="120" autocomplete="off" /></div><div class="field"><label for="studio-coach-email">E-mail-cím</label><input id="studio-coach-email" name="email" type="email" required autocomplete="off" /><small class="settings-help">A megadott címre meghívó e-mailt küldünk. Az elfogadás után a fiók a stúdiód al-edzőjeként működik.</small></div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button type="button" class="btn btn-ghost" id="cancel-modal">Mégse</button><button class="btn btn-dark">Meghívó küldése</button></div></form></div></div>`;
}

export function openUpgradeModal(reason) {
  openModal(`<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">Csomag</div><h2>Frissítés Pro-ra</h2></div><button class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><p>${escapeHtml(reason)}</p><p class="settings-help">A Pro csomag korlátlan klienst, edzéstervet és nagyobb csoportos edzéseket ad. Az online fizetés hamarosan érkezik; addig is az adminisztrátor tud csomagot váltani.</p><div style="display:flex;justify-content:flex-end;margin-top:18px"><button type="button" class="btn btn-dark" id="cancel-modal">Rendben</button></div></div></div>`);
}
