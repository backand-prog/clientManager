import { currentUser } from "../auth.js";
import {
  data,
  calendarMonth,
  calendarSelectedDate,
  setCalendarSelectedDate
} from "../state.js";
import { toDateInputValue } from "../utils.js";
import { toast } from "../runtime.js";
import { calendarClientsFor, dateFromInputValue, escapeHtml, groupWorkoutDate, groupWorkoutMeta, groupWorkoutStanding, groupWorkoutTime, trainerName, trainingPlanDayLabel, visibleGroupWorkouts, workoutDateToInputValue, workoutTrainerLabel } from "../helpers.js";
import { openModal, renderWorkoutModalForUser } from "../modals.js";

export function renderCalendar(user) {
  const clients = calendarClientsFor(user);
  const individualEvents = clients.flatMap((client) => (client.workouts || []).map((workout, index) => ({
    kind: "individual",
    client,
    workout,
    index,
    date: workoutDateToInputValue(workout.date)
  }))).filter((event) => event.date);
  const groupEvents = visibleGroupWorkouts(user).map((workout) => ({
    kind: "group",
    workout,
    date: groupWorkoutDate(workout) ? toDateInputValue(groupWorkoutDate(workout)) : ""
  })).filter((event) => event.date);
  const events = [...individualEvents, ...groupEvents].sort((a, b) =>
    a.date.localeCompare(b.date)
      || (a.kind === "group" ? groupWorkoutTime(a.workout) : a.workout.time || "").localeCompare(b.kind === "group" ? groupWorkoutTime(b.workout) : b.workout.time || "")
  );
  const selectedDate = dateFromInputValue(calendarSelectedDate) ? calendarSelectedDate : toDateInputValue(new Date());
  setCalendarSelectedDate(selectedDate);
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
    return `<article class="calendar-day ${outsideMonth ? "calendar-day-outside" : ""} ${dateValue === selectedDate ? "calendar-day-selected" : ""}"><button type="button" class="calendar-date" data-calendar-date="${dateValue}" aria-pressed="${dateValue === selectedDate}">${date.getDate()}</button><div class="calendar-events">${dayEvents.slice(0, 2).map((event) => event.kind === "group"
      ? `<button type="button" class="calendar-event calendar-group-event" data-calendar-date="${dateValue}" title="Csoportos edzés · ${escapeHtml(event.workout.title)}">${escapeHtml(groupWorkoutTime(event.workout))} ${escapeHtml(event.workout.title)} · csoportos</button>`
      : user.role === "client"
        ? `<span class="calendar-event" title="${escapeHtml(event.workout.type)} · ${escapeHtml(workoutTrainerLabel(event.workout))}">${escapeHtml(event.workout.time || "")} ${escapeHtml(event.workout.type)}</span>`
        : `<button type="button" class="calendar-event" data-calendar-workout-client="${escapeHtml(event.client.id)}" data-calendar-workout-index="${event.index}" title="${escapeHtml(event.workout.type)} · ${escapeHtml(event.client.name)}">${escapeHtml(event.workout.time || "")} ${escapeHtml(event.workout.type)} · ${escapeHtml(event.client.name)}</button>`).join("")}${dayEvents.length > 2 ? `<span class="calendar-more">+${dayEvents.length - 2} további</span>` : ""}</div></article>`;
  }).join("");
  const selectedEvents = events.filter((event) => event.date === selectedDate);
  const selectedLabel = new Intl.DateTimeFormat("hu-HU", { dateStyle: "full" }).format(dateFromInputValue(selectedDate));
  const selectedEventRows = selectedEvents.map((event) => {
    if (event.kind === "individual") {
      const planDayLabel = trainingPlanDayLabel(event.workout.trainingPlanDayId);
      return `<div class="session-row"><div><strong>${escapeHtml(event.workout.time || "")} · ${escapeHtml(event.workout.type)}</strong><p>${escapeHtml(event.client.name)} · ${event.workout.duration || 0} perc · ${escapeHtml(workoutTrainerLabel(event.workout))}</p>${planDayLabel ? `<p>Edzéstervnap: ${escapeHtml(planDayLabel)}</p>` : ""}${event.workout.notes ? `<p>${escapeHtml(event.workout.notes)}</p>` : ""}</div><span class="status status-${event.workout.status === "Teljesítve" ? "active" : event.workout.status === "Lemondva" ? "cancelled" : "paused"}">${escapeHtml(event.workout.status || "Beütemezve")}</span>${user.role !== "client" ? `<button type="button" class="text-button" data-calendar-workout-client="${escapeHtml(event.client.id)}" data-calendar-workout-index="${event.index}">Szerkesztés</button>` : ""}</div>`;
    }
    const workout = event.workout;
    const startsAt = groupWorkoutDate(workout);
    const isFuture = startsAt && startsAt.getTime() > Date.now();
    const isTrainerOwner = user.role === "trainer" && workout.trainerId === user.id;
    const isClient = user.role === "client";
    const standing = groupWorkoutStanding(workout, user.id);
    const isRegistered = standing.registered;
    const action = isClient && !workout.cancelledAt && isFuture
      ? isRegistered
        ? `<button type="button" class="btn btn-ghost" data-group-action="leave" data-group-id="${escapeHtml(workout.id)}">Leiratkozás</button>`
        : standing.waitlisted
          ? `<button type="button" class="btn btn-ghost" data-group-action="leave" data-group-id="${escapeHtml(workout.id)}">Leiratkozás a várólistáról</button>`
          : `<button type="button" class="btn btn-teal" data-group-action="join" data-group-id="${escapeHtml(workout.id)}">${standing.full ? "Várólistára jelentkezem" : "Jelentkezés"}</button>`
      : isTrainerOwner && !workout.cancelledAt
        ? `<div class="session-row-actions"><button type="button" class="btn btn-ghost" data-group-action="edit" data-group-id="${escapeHtml(workout.id)}">Szerkesztés</button><button type="button" class="btn btn-danger" data-group-action="cancel" data-group-id="${escapeHtml(workout.id)}">Edzés lemondása</button></div>`
        : "";
    const status = workout.cancelledAt ? "Lemondva" : !isFuture ? "Megtartva" : isClient ? standing.label : standing.full ? "Betelt" : "Jelentkezhető";
    const participantList = (isTrainerOwner || user.role === "admin") && (workout.participantNames?.length || workout.registrations?.length)
      ? `<p class="group-participants">Jelentkeztek: ${(workout.participantNames?.length ? workout.participantNames : workout.registrations.map((id) => data.users.find((item) => item.id === id)?.name || "Kliens")).map(escapeHtml).join(", ")}</p>`
      : "";
    return `<div class="session-row group-session-row"><div><strong>${escapeHtml(groupWorkoutTime(workout))} · ${escapeHtml(workout.title)}</strong><p>${escapeHtml(workout.trainerName || trainerName(workout.trainerId))} · ${escapeHtml(groupWorkoutMeta(workout))}</p>${workout.description ? `<p>${escapeHtml(workout.description)}</p>` : ""}${participantList}</div><span class="status status-${workout.cancelledAt ? "cancelled" : isRegistered || status === "Megtartva" ? "active" : "paused"}">${status}</span>${action}</div>`;
  }).join("");
  const addButtons = user.role === "client"
    ? `<button type="button" class="btn btn-teal" id="calendar-add-workout">+ Egyéni edzés</button>`
    : `${user.role === "trainer" ? `<button type="button" class="btn btn-teal" id="calendar-add-group-workout">+ Csoportos edzés</button>` : ""}<button type="button" class="btn btn-teal" id="calendar-add-workout">+ Egyéni edzés</button>`;
  const description = user.role === "client" ? "A saját és a kapcsolt edzők csoportos edzései." : user.role === "trainer" ? "A klienseid egyéni edzései és saját csoportos alkalmaid." : "A kliensek egyéni edzései és a csoportos alkalmak.";
  return `<div class="topbar"><div><div class="eyebrow">Munkatér / Naptár</div><h1>Edzésnaptár</h1><p>${description}</p></div><div class="topbar-actions">${addButtons}</div></div><section class="panel calendar-panel"><div class="calendar-toolbar"><button type="button" class="btn btn-ghost" id="calendar-previous" aria-label="Előző hónap">←</button><h2>${escapeHtml(monthTitle)}</h2><button type="button" class="btn btn-ghost" id="calendar-next" aria-label="Következő hónap">→</button><button type="button" class="text-button" id="calendar-today">Ma</button></div><div class="calendar-grid calendar-weekdays">${weekdays.map((day) => `<div>${day}</div>`).join("")}</div><div class="calendar-grid">${days}</div></section><section class="panel calendar-agenda"><div class="panel-head"><div><h2>${escapeHtml(selectedLabel)}</h2><p>A kiválasztott nap edzései</p></div><span class="eyebrow" style="margin:0">${selectedEvents.length} edzés</span></div>${selectedEventRows || `<div class="empty-state">Erre a napra nincs edzés beütemezve.</div>`}</section>`;
}

export function openCalendarWorkout() {
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

export function renderGroupWorkoutModal(workout = null) {
  const isEdit = Boolean(workout?.id);
  const date = dateFromInputValue(calendarSelectedDate) ? calendarSelectedDate : toDateInputValue(new Date());
  const defaultStart = new Date(`${date}T09:00`);
  const localStart = new Date(Math.max(defaultStart.getTime(), Date.now() + 60 * 60 * 1000));
  const existingStart = isEdit && groupWorkoutDate(workout) ? groupWorkoutDate(workout) : null;
  const startBase = existingStart || localStart;
  const startsAt = `${toDateInputValue(startBase)}T${String(startBase.getHours()).padStart(2, "0")}:${String(startBase.getMinutes()).padStart(2, "0")}`;
  const minStart = existingStart && existingStart.getTime() < Date.now() ? startsAt : `${toDateInputValue(new Date())}T${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">Naptár / Csoportos edzés</div><h2>${isEdit ? "Csoportos edzés szerkesztése" : "Új csoportos edzés"}</h2></div><button type="button" class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><form id="group-workout-form" data-group-id="${isEdit ? escapeHtml(workout.id) : ""}"><div class="field"><label for="group-title">Edzés neve</label><input id="group-title" name="title" maxlength="120" required value="${escapeHtml(workout?.title || "")}" /></div><div class="field"><label for="group-description">Leírás</label><textarea id="group-description" name="description" maxlength="2000">${escapeHtml(workout?.description || "")}</textarea></div><div class="form-grid"><div class="field span-2"><label for="group-starts-at">Kezdés</label><input id="group-starts-at" name="startsAt" type="datetime-local" min="${minStart}" value="${startsAt}" required /></div><div class="field"><label for="group-duration">Időtartam (perc)</label><input id="group-duration" name="duration" type="number" min="1" max="480" value="${workout?.duration || 60}" required /></div><div class="field"><label for="group-capacity">Férőhelyek</label><input id="group-capacity" name="capacity" type="number" min="${isEdit ? Math.max(2, workout.participantCount || 2) : 2}" max="100" value="${workout?.capacity || 8}" required /></div><div class="field span-2"><label for="group-location">Helyszín / terem (nem kötelező)</label><input id="group-location" name="location" maxlength="120" placeholder="Pl. A terem" value="${escapeHtml(workout?.location || "")}" /></div></div><p class="settings-help">A csoportos edzést csak a hozzád kapcsolt kliensek látják és látogathatják. Ha betelt a létszám, az újabb jelentkezők várólistára kerülnek, és lemondás esetén automatikusan előrelépnek.${isEdit ? " A férőhelyek száma nem lehet kevesebb a már jelentkezettek számánál." : ""}</p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancel-modal">Mégse</button><button class="btn btn-dark">${isEdit ? "Módosítások mentése" : "Edzés meghirdetése"}</button></div></form></div></div>`;
}
