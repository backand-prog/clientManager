const STORAGE_KEY = "form-function-data";
const SESSION_KEY = "form-function-session";

const seedData = {
  users: [
    { id: "admin-1", role: "admin", name: "Andras Back", email: "admin@formfunction.test", password: "admin123" },
    { id: "client-1", role: "client", name: "Maya Chen", email: "maya@example.com", password: "client123", goal: "Erő és mobilitás", status: "Aktív", joined: "2026. jan. 12.", sessions: 18, adherence: 86, nextSession: "Holnap, 09:00", notes: "Stabil alapok építése következetes, teljes testes edzésekkel.", workouts: [{ date: "2026. márc. 20.", time: "08:00", type: "Teljes testes erősítés", duration: 52, status: "Teljesítve", notes: "Jó technika, magabiztos terhelés." }, { date: "2026. márc. 17.", time: "08:00", type: "Mobilitás és törzs", duration: 38, status: "Teljesítve", notes: "" }] },
    { id: "client-2", role: "client", name: "Leo Martins", email: "leo@example.com", password: "client123", goal: "Visszatérés a futáshoz", status: "Aktív", joined: "2026. febr. 03.", sessions: 12, adherence: 74, nextSession: "Csütörtök, 18:30", notes: "Óvatos visszatérés a hosszabb kihagyás után.", workouts: [{ date: "2026. márc. 19.", time: "18:30", type: "Futótechnika", duration: 45, status: "Teljesítve", notes: "" }] },
    { id: "client-3", role: "client", name: "Sofia Patel", email: "sofia@example.com", password: "client123", goal: "Testkompozíció", status: "Szüneteltetve", joined: "2025. nov. 18.", sessions: 24, adherence: 91, nextSession: "Nincs beütemezve", notes: "Rövid utazási szüneten van.", workouts: [] }
  ],
  activities: [
    { text: "Maya Chen teljesített egy edzést", time: "Ma, 08:42", mark: "MC" },
    { text: "Leo Martins frissítette a profilját", time: "Tegnap, 17:20", mark: "LM" },
    { text: "Új regisztráció: Nina Rossi", time: "2026. márc. 18.", mark: "NR" }
  ]
};

let data = loadData();
let session = localStorage.getItem(SESSION_KEY);
let currentView = "overview";
let selectedClientId = null;

function loadData() {
  try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (!stored) return structuredClone(seedData); stored.users.forEach((user) => { user.workouts ||= []; if (user.status === "Active") user.status = "Aktív"; if (user.status === "Paused") user.status = "Szüneteltetve"; if (user.goal === "Strength & mobility") user.goal = "Erő és mobilitás"; if (user.goal === "Return to running") user.goal = "Visszatérés a futáshoz"; if (user.goal === "Body recomposition") user.goal = "Testkompozíció"; }); return stored; }
  catch { return structuredClone(seedData); }
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function currentUser() { return data.users.find((user) => user.id === session); }
function selectedClient() { return data.users.find((user) => user.id === selectedClientId); }
function initials(name) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])); }
function toast(message) { const region = document.querySelector("#toast-region"); region.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`; setTimeout(() => { region.innerHTML = ""; }, 3000); }
function formatDate() { return new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short", day: "numeric" }).format(new Date()); }

function render() {
  document.querySelector("#app").innerHTML = session && currentUser() ? renderDashboard(currentUser()) : renderAuth();
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
    <section class="auth-art"><div class="brand">FORM <span>&</span> FUNCTION</div><div><h1>Tedd láthatóvá a fejlődést.</h1><p>Átlátható munkatér személyi edzőknek, ahol minden kliens fejlődése egy helyen követhető.</p></div><div class="art-footer">Privát klienskezelés független edzőknek.</div></section>
    <section class="auth-panel"><div class="auth-card">
      <div class="eyebrow">Edzői munkatér</div><h2>Üdv újra</h2><p>Jelentkezz be a praxisod kezeléséhez.</p>
      <form id="login-form"><div class="field"><label for="email">E-mail-cím</label><input id="email" type="email" required placeholder="te@example.com" /></div><div class="field"><label for="password">Jelszó</label><input id="password" type="password" required placeholder="Írd be a jelszavad" /></div><div class="auth-actions"><button type="button" class="text-button" id="show-register">Új kliens vagyok</button><button class="btn btn-dark" type="submit">Bejelentkezés</button></div></form>
      <div class="demo-box"><strong>Demo hozzáférés</strong><br />Admin: admin@formfunction.test / admin123<br />Kliens: maya@example.com / client123</div>
    </div></section>
  </main>`;
}

function renderDashboard(user) {
  const isAdmin = user.role === "admin";
  return `<main class="app-shell dashboard"><aside class="sidebar"><div class="brand">FORM <span>&</span> FUNCTION</div>${isAdmin ? `<div class="nav-label">Munkatér</div><button class="nav-btn ${currentView === "overview" ? "active" : ""}" data-view="overview">Áttekintés</button><button class="nav-btn ${currentView === "clients" ? "active" : ""}" data-view="clients">Kliensek</button>` : `<div class="nav-label">Saját tér</div><button class="nav-btn active" data-view="profile">Profilom</button>`}<div class="sidebar-spacer"></div><div class="user-mini"><div class="avatar">${initials(user.name)}</div><div>${escapeHtml(user.name)}<small>${isAdmin ? "Adminisztrátor" : "Kliens"}</small></div></div><button class="nav-btn" id="logout" style="margin-top:14px">Kijelentkezés</button></aside><section class="main">${isAdmin ? renderAdminContent() : renderClientContent(user)}</section></main>`;
}

function renderAdminContent() {
  if (currentView === "clients") return renderClients();
  if (currentView === "client-detail") return renderClientDetail(selectedClient());
  const clients = data.users.filter((user) => user.role === "client");
  const openSessions = clients.reduce((total, client) => total + (client.workouts || []).filter((workout) => workout.status === "Beütemezve").length, 0);
  return `<div class="topbar"><div><div class="eyebrow">2026. március 24., kedd</div><h1>Jó reggelt, Andras.</h1><p>Így halad a coaching praxisod.</p></div><button class="btn btn-teal" id="add-client">+ Új kliens</button></div><div class="stat-grid"><div class="stat"><div class="number">${clients.length}</div><div class="label">Összes kliens</div><div class="trend">+1 ebben a hónapban</div></div><div class="stat"><div class="number">${openSessions}</div><div class="label">Nyitott edzések</div><div class="trend">Beütemezve</div></div><div class="stat"><div class="number">84%</div><div class="label">Átlagos teljesítés</div><div class="trend">+6% az előző hónaphoz képest</div></div><div class="stat"><div class="number">6</div><div class="label">Olvasatlan frissítés</div><div class="trend">Átnézésre vár</div></div></div><div class="content-grid"><section class="panel"><div class="panel-head"><h2>Kliens áttekintő</h2><button class="text-button" data-view="clients">Összes megtekintése</button></div>${renderClientTable(clients.slice(0, 4))}</section><section class="panel"><div class="panel-head"><h2>Legutóbbi aktivitás</h2></div>${data.activities.slice(0, 4).map((item) => `<div class="activity"><div class="activity-mark">${item.mark}</div><p>${escapeHtml(item.text)}<small>${escapeHtml(item.time)}</small></p></div>`).join("")}</section></div>`;
}

function renderClientTable(clients) {
  if (!clients.length) return `<div class="empty-state">Még nincs kliens. Add hozzá az első klienst.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Kliens</th><th>Fókusz</th><th>Edzések</th><th>Teljesítés</th><th>Állapot</th><th></th></tr></thead><tbody>${clients.map((client) => `<tr><td><div class="client-cell"><div class="avatar">${initials(client.name)}</div>${escapeHtml(client.name)}</div></td><td>${escapeHtml(client.goal || "Nincs beállítva")}</td><td><strong>${(client.workouts || []).length}</strong> edzés</td><td>${client.adherence || 0}%</td><td><span class="status status-${client.status === "Aktív" ? "active" : "paused"}">${escapeHtml(client.status || "Aktív")}</span></td><td><button class="text-button" data-client-id="${client.id}">Megnyitás</button></td></tr>`).join("")}</tbody></table></div>`;
}

function renderClients() {
  const clients = data.users.filter((user) => user.role === "client");
  return `<div class="topbar"><div><div class="eyebrow">Munkatér / Kliensek</div><h1>Klienseid</h1><p>Minden terv, visszajelzés és edzés egy helyen.</p></div><button class="btn btn-teal" id="add-client">+ Új kliens</button></div><section class="panel"><div class="search-row"><input id="client-search" placeholder="Keresés név vagy e-mail alapján" /><button class="btn btn-ghost">Szűrés</button></div><div id="client-table">${renderClientTable(clients)}</div></section>`;
}

function renderClientDetail(client) {
  if (!client) return renderClients();
  const workouts = client.workouts || [];
  return `<div class="topbar"><div><button class="text-button" data-view="clients">← Vissza a kliensekhez</button><div class="eyebrow" style="margin-top:18px">Kliens / ${escapeHtml(client.name)}</div><h1>${escapeHtml(client.name)}</h1><p>${escapeHtml(client.goal || "Nincs beállított fókusz")}</p></div><div style="display:flex;gap:10px"><button class="btn btn-ghost" id="edit-client">Profil szerkesztése</button><button class="btn btn-teal" id="add-workout">+ Új edzés</button></div></div><div class="detail-layout"><section class="panel profile-card"><div class="profile-avatar">${initials(client.name)}</div><h2>${escapeHtml(client.name)}</h2><p>${escapeHtml(client.email)}</p><span class="status status-${client.status === "Aktív" ? "active" : "paused"}">${escapeHtml(client.status || "Aktív")}</span><div class="profile-meta"><div class="meta-row"><span>Fókusz</span><strong>${escapeHtml(client.goal || "Nincs beállítva")}</strong></div><div class="meta-row"><span>Csatlakozott</span><strong>${escapeHtml(client.joined || "Ma")}</strong></div><div class="meta-row"><span>Következő edzés</span><strong>${escapeHtml(client.nextSession || "Nincs beütemezve")}</strong></div></div></section><section class="panel"><div class="panel-head"><h2>Edzések</h2><span class="eyebrow" style="margin:0">${workouts.length} rögzítve</span></div>${workouts.length ? workouts.map((workout, index) => `<div class="session-row"><div><strong>${escapeHtml(workout.type)}</strong><p>${escapeHtml(workout.date)} · ${escapeHtml(workout.time)} · ${workout.duration} perc</p>${workout.notes ? `<p>${escapeHtml(workout.notes)}</p>` : ""}</div><span class="status status-${workout.status === "Teljesítve" ? "active" : "paused"}">${escapeHtml(workout.status)}</span><button class="text-button" data-workout-index="${index}">Szerkesztés</button></div>`).join("") : `<div class="empty-state">Ehhez a klienshez még nincs rögzített edzés.</div>`}</section></div>`;
}

function renderClientContent(user) {
  return `<div class="topbar"><div><div class="eyebrow">My space</div><h1>Hello, ${escapeHtml(user.name.split(" ")[0])}.</h1><p>Your consistency is the work. Keep going.</p></div><button class="btn btn-ghost" id="edit-profile">Edit profile</button></div><div class="detail-layout"><section class="panel profile-card"><div class="profile-avatar">${initials(user.name)}</div><h2>${escapeHtml(user.name)}</h2><p>${escapeHtml(user.email)}</p><span class="status status-${user.status === "Active" ? "active" : "paused"}">${escapeHtml(user.status || "Active")}</span><div class="profile-meta"><div class="meta-row"><span>Focus</span><strong>${escapeHtml(user.goal || "Not set")}</strong></div><div class="meta-row"><span>Member since</span><strong>${escapeHtml(user.joined || "Today")}</strong></div><div class="meta-row"><span>Next session</span><strong>${escapeHtml(user.nextSession || "To be scheduled")}</strong></div></div></section><section class="panel"><div class="panel-head"><h2>Your progress</h2><span class="eyebrow" style="margin:0">This month</span></div><div class="metric-grid"><div class="metric"><strong>${user.sessions || 0}</strong><span>Sessions completed</span></div><div class="metric"><strong>${user.adherence || 0}%</strong><span>Plan adherence</span></div><div class="metric"><strong>+12%</strong><span>Strength trend</span></div></div><h3>Plan adherence</h3><div class="progress-bar"><span style="width:${user.adherence || 0}%"></span></div><p style="color:var(--muted);font-size:.79rem">You are ${user.adherence >= 80 ? "building excellent momentum" : "making steady progress"}. Every session counts.</p><div class="panel-head" style="margin-top:28px"><h2>Recent sessions</h2></div><div class="session-row"><div><strong>Full body strength</strong><p>Mar 20, 2026 · 52 minutes</p></div><strong>Completed</strong><span class="status status-active">Good</span></div><div class="session-row"><div><strong>Mobility & core</strong><p>Mar 17, 2026 · 38 minutes</p></div><strong>Completed</strong><span class="status status-active">Great</span></div><div class="session-row"><div><strong>Lower body strength</strong><p>Mar 14, 2026 · 49 minutes</p></div><strong>Completed</strong><span class="status status-active">Good</span></div><div class="panel" style="background:var(--mint);border:0;margin-top:20px"><h3>Coach note</h3><p style="font-size:.84rem;line-height:1.55;margin-bottom:0">${escapeHtml(user.notes || "Keep showing up and focus on quality movement.")}</p></div></section></div>`;
}

function renderModal(type, client = {}) {
  const isEdit = Boolean(client.id);
  return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">${isEdit ? "Kliensadatok" : "Új kliens"}</div><h2>${isEdit ? "Kliens frissítése" : "Kliens hozzáadása"}</h2></div><button class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><form id="client-form" data-id="${client.id || ""}"><div class="form-grid"><div class="field"><label for="client-name">Teljes név</label><input id="client-name" name="name" required value="${escapeHtml(client.name || "")}" /></div><div class="field"><label for="client-email">E-mail</label><input id="client-email" name="email" type="email" required value="${escapeHtml(client.email || "")}" /></div><div class="field"><label for="client-goal">Fő cél</label><input id="client-goal" name="goal" value="${escapeHtml(client.goal || "")}" placeholder="pl. Erő és mobilitás" /></div><div class="field"><label for="client-status">Állapot</label><select id="client-status" name="status"><option ${client.status === "Aktív" ? "selected" : ""}>Aktív</option><option ${client.status === "Szüneteltetve" ? "selected" : ""}>Szüneteltetve</option></select></div><div class="field"><label for="client-next">Következő edzés</label><input id="client-next" name="nextSession" value="${escapeHtml(client.nextSession || "")}" placeholder="pl. Péntek, 10:00" /></div><div class="field"><label for="client-adherence">Terv teljesítése (%)</label><input id="client-adherence" name="adherence" type="number" min="0" max="100" value="${client.adherence || 0}" /></div><div class="field span-2"><label for="client-notes">Edzői megjegyzések</label><textarea id="client-notes" name="notes">${escapeHtml(client.notes || "")}</textarea></div></div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button type="button" class="btn btn-ghost" id="cancel-modal">Mégse</button><button class="btn btn-dark">${isEdit ? "Módosítások mentése" : "Kliens létrehozása"}</button></div></form></div></div>`;
}

function renderWorkoutModal(client, workout = {}, index = "") {
  return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">${escapeHtml(client.name)} / Edzés</div><h2>${index === "" ? "Új edzés hozzáadása" : "Edzés szerkesztése"}</h2></div><button class="close" id="close-modal" aria-label="Bezárás">&times;</button></div><form id="workout-form" data-index="${index}"><div class="form-grid"><div class="field"><label for="workout-date">Dátum</label><input id="workout-date" name="date" required type="date" value="${escapeHtml(workout.date || "")}" /></div><div class="field"><label for="workout-time">Időpont</label><input id="workout-time" name="time" required type="time" value="${escapeHtml(workout.time || "09:00")}" /></div><div class="field span-2"><label for="workout-type">Edzés típusa</label><input id="workout-type" name="type" required value="${escapeHtml(workout.type || "")}" placeholder="pl. Teljes testes erősítés" /></div><div class="field"><label for="workout-duration">Időtartam (perc)</label><input id="workout-duration" name="duration" required type="number" min="1" value="${workout.duration || 60}" /></div><div class="field"><label for="workout-status">Állapot</label><select id="workout-status" name="status"><option ${workout.status === "Beütemezve" ? "selected" : ""}>Beütemezve</option><option ${workout.status === "Teljesítve" ? "selected" : ""}>Teljesítve</option><option ${workout.status === "Lemondva" ? "selected" : ""}>Lemondva</option></select></div><div class="field span-2"><label for="workout-notes">Megjegyzés</label><textarea id="workout-notes" name="notes" placeholder="Rövid megjegyzés az edzésről">${escapeHtml(workout.notes || "")}</textarea></div></div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button type="button" class="btn btn-ghost" id="cancel-modal">Mégse</button><button class="btn btn-dark">Edzés mentése</button></div></form></div></div>`;
}

function openModal(client = {}) { document.body.insertAdjacentHTML("beforeend", typeof client === "string" ? client : renderModal("client", client)); bindModalEvents(); }
function bindModalEvents() {
  document.querySelector("#close-modal")?.addEventListener("click", () => document.querySelector("#modal-backdrop").remove());
  document.querySelector("#cancel-modal")?.addEventListener("click", () => document.querySelector("#modal-backdrop").remove());
  document.querySelector("#client-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget); const id = event.currentTarget.dataset.id;
    const values = Object.fromEntries(formData.entries()); values.adherence = Number(values.adherence) || 0;
    if (id) Object.assign(data.users.find((user) => user.id === id), values);
    else { data.users.push({ ...values, id: `client-${Date.now()}`, role: "client", password: "welcome123", joined: formatDate(), sessions: 0, workouts: [] }); data.activities.unshift({ text: `${values.name} új kliensként hozzáadva`, time: "Most", mark: initials(values.name) }); }
    saveData(); document.querySelector("#modal-backdrop").remove(); render(); toast(id ? "Kliensadatok frissítve" : "Kliens sikeresen hozzáadva");
  });
  document.querySelector("#workout-form")?.addEventListener("submit", (event) => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); values.duration = Number(values.duration) || 0; const client = selectedClient(); client.workouts ||= []; const index = event.currentTarget.dataset.index;
    if (index === "") client.workouts.push(values); else client.workouts[Number(index)] = values;
    client.sessions = client.workouts.filter((workout) => workout.status === "Teljesítve").length; saveData(); document.querySelector("#modal-backdrop").remove(); render(); toast(index === "" ? "Edzés hozzáadva" : "Edzés frissítve");
  });
}

function bindEvents() {
  document.querySelector("#login-form")?.addEventListener("submit", (event) => {
    event.preventDefault(); const email = document.querySelector("#email").value.trim().toLowerCase(); const password = document.querySelector("#password").value;
    const user = data.users.find((item) => item.email.toLowerCase() === email && item.password === password);
    if (!user) return toast("Az e-mail-cím vagy a jelszó hibás."); session = user.id; localStorage.setItem(SESSION_KEY, session); currentView = user.role === "admin" ? "overview" : "profile"; render();
  });
  document.querySelector("#show-register")?.addEventListener("click", () => openRegistration());
  document.querySelector("#logout")?.addEventListener("click", () => { session = null; localStorage.removeItem(SESSION_KEY); render(); });
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => { currentView = button.dataset.view; render(); }));
  document.querySelector("#add-client")?.addEventListener("click", () => openModal());
  document.querySelectorAll("[data-client-id]").forEach((button) => button.addEventListener("click", () => { selectedClientId = button.dataset.clientId; currentView = "client-detail"; render(); }));
  document.querySelector("#edit-client")?.addEventListener("click", () => openModal(selectedClient()));
  document.querySelector("#add-workout")?.addEventListener("click", () => openModal(renderWorkoutModal(selectedClient())));
  document.querySelectorAll("[data-workout-index]").forEach((button) => button.addEventListener("click", () => openModal(renderWorkoutModal(selectedClient(), selectedClient().workouts[Number(button.dataset.workoutIndex)], button.dataset.workoutIndex))));
  document.querySelector("#edit-profile")?.addEventListener("click", () => openModal(currentUser()));
  document.querySelector("#client-search")?.addEventListener("input", (event) => { const needle = event.target.value.toLowerCase(); const filtered = data.users.filter((user) => user.role === "client" && `${user.name} ${user.email}`.toLowerCase().includes(needle)); document.querySelector("#client-table").innerHTML = renderClientTable(filtered); document.querySelectorAll("[data-client-id]").forEach((button) => button.addEventListener("click", () => { selectedClientId = button.dataset.clientId; currentView = "client-detail"; render(); })); });
}

function openRegistration() {
  document.querySelector("#app").innerHTML = `<main class="auth-shell"><section class="auth-art"><div class="brand">FORM <span>&</span> FUNCTION</div><div><h1>Your next chapter starts here.</h1><p>Register as a client to keep your profile and progress in one calm, focused space.</p></div><div class="art-footer">Already have an account? <button class="text-button" style="color:var(--teal)" id="back-login">Sign in</button></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Client registration</div><h2>Create your profile</h2><p>Your coach will see your registration and follow up with next steps.</p><form id="register-form"><div class="field"><label for="reg-name">Full name</label><input id="reg-name" name="name" required /></div><div class="field"><label for="reg-email">Email address</label><input id="reg-email" name="email" type="email" required /></div><div class="field"><label for="reg-password">Create password</label><input id="reg-password" name="password" type="password" minlength="6" required /></div><div class="field"><label for="reg-goal">What are you working toward?</label><input id="reg-goal" name="goal" required placeholder="e.g. Feel stronger and more mobile" /></div><div class="auth-actions"><button type="button" class="text-button" id="back-login-2">Back to sign in</button><button class="btn btn-dark">Register</button></div></form></div></section></main>`;
  document.querySelector("#app").innerHTML = `<main class="auth-shell"><section class="auth-art"><div class="brand">FORM <span>&</span> FUNCTION</div><div><h1>Az új fejezeted itt kezdődik.</h1><p>Regisztrálj kliensként, és tartsd egy helyen a profilodat és a fejlődésedet.</p></div><div class="art-footer">Már van fiókod? <button class="text-button" style="color:var(--teal)" id="back-login">Bejelentkezés</button></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Kliensregisztráció</div><h2>Profil létrehozása</h2><p>Az edződ látni fogja a regisztrációdat, és jelentkezik a következő lépésekkel.</p><form id="register-form"><div class="field"><label for="reg-name">Teljes név</label><input id="reg-name" name="name" required /></div><div class="field"><label for="reg-email">E-mail-cím</label><input id="reg-email" name="email" type="email" required /></div><div class="field"><label for="reg-password">Jelszó létrehozása</label><input id="reg-password" name="password" type="password" minlength="6" required /></div><div class="field"><label for="reg-goal">Min szeretnél dolgozni?</label><input id="reg-goal" name="goal" required placeholder="pl. Erősebb és mozgékonyabb szeretnék lenni" /></div><div class="auth-actions"><button type="button" class="text-button" id="back-login-2">Vissza a bejelentkezéshez</button><button class="btn btn-dark">Regisztráció</button></div></form></div></section></main>`;
  document.querySelectorAll("#back-login, #back-login-2").forEach((button) => button.addEventListener("click", render));
  document.querySelector("#register-form").addEventListener("submit", (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); if (data.users.some((user) => user.email.toLowerCase() === values.email.toLowerCase())) return toast("An account with that email already exists."); const user = { ...values, id: `client-${Date.now()}`, role: "client", status: "Active", joined: formatDate(), sessions: 0, adherence: 0, nextSession: "To be scheduled", notes: "New client - schedule an onboarding session." }; data.users.push(user); data.activities.unshift({ text: `${user.name} registered as a new client`, time: "Just now", mark: initials(user.name) }); saveData(); session = user.id; localStorage.setItem(SESSION_KEY, session); render(); toast("Welcome to Form & Function"); });
}

render();
