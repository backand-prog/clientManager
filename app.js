const STORAGE_KEY = "form-function-data";
const SESSION_KEY = "form-function-session";

const seedData = {
  users: [
    { id: "admin-1", role: "admin", name: "Andras Back", email: "admin@formfunction.test", password: "admin123" },
    { id: "client-1", role: "client", name: "Maya Chen", email: "maya@example.com", password: "client123", goal: "Strength & mobility", status: "Active", joined: "Jan 12, 2026", sessions: 18, adherence: 86, nextSession: "Tomorrow, 09:00", notes: "Building a strong base with consistent full-body sessions." },
    { id: "client-2", role: "client", name: "Leo Martins", email: "leo@example.com", password: "client123", goal: "Return to running", status: "Active", joined: "Feb 03, 2026", sessions: 12, adherence: 74, nextSession: "Thu, 18:30", notes: "Progressing carefully after a long break from running." },
    { id: "client-3", role: "client", name: "Sofia Patel", email: "sofia@example.com", password: "client123", goal: "Body recomposition", status: "Paused", joined: "Nov 18, 2025", sessions: 24, adherence: 91, nextSession: "Not scheduled", notes: "On a short travel break. Keep nutrition check-ins light." }
  ],
  activities: [
    { text: "Maya Chen completed a session", time: "Today, 08:42", mark: "MC" },
    { text: "Leo Martins updated his profile", time: "Yesterday, 17:20", mark: "LM" },
    { text: "New client registration: Nina Rossi", time: "Mar 18, 2026", mark: "NR" }
  ]
};

let data = loadData();
let session = localStorage.getItem(SESSION_KEY);
let currentView = "overview";

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(seedData); }
  catch { return structuredClone(seedData); }
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function currentUser() { return data.users.find((user) => user.id === session); }
function initials(name) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])); }
function toast(message) { const region = document.querySelector("#toast-region"); region.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`; setTimeout(() => { region.innerHTML = ""; }, 3000); }
function formatDate() { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date()); }

function render() {
  document.querySelector("#app").innerHTML = session && currentUser() ? renderDashboard(currentUser()) : renderAuth();
  bindEvents();
}

function renderAuth() {
  return `<main class="auth-shell">
    <section class="auth-art"><div class="brand">FORM <span>&</span> FUNCTION</div><div><h1>Make progress visible.</h1><p>A focused space for keeping your clients moving, accountable, and cared for.</p></div><div class="art-footer">Private client management for independent coaches.</div></section>
    <section class="auth-panel"><div class="auth-card">
      <div class="eyebrow">Coach workspace</div><h2>Welcome back</h2><p>Sign in to manage your practice.</p>
      <form id="login-form"><div class="field"><label for="email">Email address</label><input id="email" type="email" required placeholder="you@example.com" /></div><div class="field"><label for="password">Password</label><input id="password" type="password" required placeholder="Enter your password" /></div><div class="auth-actions"><button type="button" class="text-button" id="show-register">I am a new client</button><button class="btn btn-dark" type="submit">Sign in</button></div></form>
      <div class="demo-box"><strong>Try the demo</strong><br />Admin: admin@formfunction.test / admin123<br />Client: maya@example.com / client123</div>
    </div></section>
  </main>`;
}

function renderDashboard(user) {
  const isAdmin = user.role === "admin";
  return `<main class="app-shell dashboard"><aside class="sidebar"><div class="brand">FORM <span>&</span> FUNCTION</div>${isAdmin ? `<div class="nav-label">Workspace</div><button class="nav-btn ${currentView === "overview" ? "active" : ""}" data-view="overview">Overview</button><button class="nav-btn ${currentView === "clients" ? "active" : ""}" data-view="clients">Clients</button>` : `<div class="nav-label">My space</div><button class="nav-btn active" data-view="profile">My profile</button>`}<div class="sidebar-spacer"></div><div class="user-mini"><div class="avatar">${initials(user.name)}</div><div>${escapeHtml(user.name)}<small>${isAdmin ? "Administrator" : "Client"}</small></div></div><button class="nav-btn" id="logout" style="margin-top:14px">Sign out</button></aside><section class="main">${isAdmin ? renderAdminContent() : renderClientContent(user)}</section></main>`;
}

function renderAdminContent() {
  if (currentView === "clients") return renderClients();
  return `<div class="topbar"><div><div class="eyebrow">Tuesday, March 24, 2026</div><h1>Good morning, Andras.</h1><p>Here is how your coaching practice is moving.</p></div><button class="btn btn-teal" id="add-client">+ Add client</button></div><div class="stat-grid"><div class="stat"><div class="number">${data.users.filter((user) => user.role === "client").length}</div><div class="label">Total clients</div><div class="trend">+1 this month</div></div><div class="stat"><div class="number">2</div><div class="label">Sessions today</div><div class="trend">All on schedule</div></div><div class="stat"><div class="number">84%</div><div class="label">Avg. adherence</div><div class="trend">+6% vs last month</div></div><div class="stat"><div class="number">6</div><div class="label">Unread updates</div><div class="trend">Review when ready</div></div></div><div class="content-grid"><section class="panel"><div class="panel-head"><h2>Client snapshot</h2><button class="text-button" data-view="clients">View all</button></div>${renderClientTable(data.users.filter((user) => user.role === "client").slice(0, 4))}</section><section class="panel"><div class="panel-head"><h2>Recent activity</h2></div>${data.activities.slice(0, 4).map((item) => `<div class="activity"><div class="activity-mark">${item.mark}</div><p>${escapeHtml(item.text)}<small>${escapeHtml(item.time)}</small></p></div>`).join("")}</section></div>`;
}

function renderClientTable(clients) {
  if (!clients.length) return `<div class="empty-state">No clients yet. Add your first client to get started.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Client</th><th>Focus</th><th>Adherence</th><th>Status</th><th></th></tr></thead><tbody>${clients.map((client) => `<tr><td><div class="client-cell"><div class="avatar">${initials(client.name)}</div>${escapeHtml(client.name)}</div></td><td>${escapeHtml(client.goal || "Not set")}</td><td>${client.adherence || 0}%</td><td><span class="status status-${client.status === "Active" ? "active" : "paused"}">${escapeHtml(client.status || "Active")}</span></td><td><button class="text-button" data-client-id="${client.id}">Open</button></td></tr>`).join("")}</tbody></table></div>`;
}

function renderClients() {
  const clients = data.users.filter((user) => user.role === "client");
  return `<div class="topbar"><div><div class="eyebrow">Workspace / Clients</div><h1>Your clients</h1><p>Keep every plan, check-in, and milestone in one place.</p></div><button class="btn btn-teal" id="add-client">+ Add client</button></div><section class="panel"><div class="search-row"><input id="client-search" placeholder="Search by name or email" /><button class="btn btn-ghost">Filter</button></div><div id="client-table">${renderClientTable(clients)}</div></section>`;
}

function renderClientContent(user) {
  return `<div class="topbar"><div><div class="eyebrow">My space</div><h1>Hello, ${escapeHtml(user.name.split(" ")[0])}.</h1><p>Your consistency is the work. Keep going.</p></div><button class="btn btn-ghost" id="edit-profile">Edit profile</button></div><div class="detail-layout"><section class="panel profile-card"><div class="profile-avatar">${initials(user.name)}</div><h2>${escapeHtml(user.name)}</h2><p>${escapeHtml(user.email)}</p><span class="status status-${user.status === "Active" ? "active" : "paused"}">${escapeHtml(user.status || "Active")}</span><div class="profile-meta"><div class="meta-row"><span>Focus</span><strong>${escapeHtml(user.goal || "Not set")}</strong></div><div class="meta-row"><span>Member since</span><strong>${escapeHtml(user.joined || "Today")}</strong></div><div class="meta-row"><span>Next session</span><strong>${escapeHtml(user.nextSession || "To be scheduled")}</strong></div></div></section><section class="panel"><div class="panel-head"><h2>Your progress</h2><span class="eyebrow" style="margin:0">This month</span></div><div class="metric-grid"><div class="metric"><strong>${user.sessions || 0}</strong><span>Sessions completed</span></div><div class="metric"><strong>${user.adherence || 0}%</strong><span>Plan adherence</span></div><div class="metric"><strong>+12%</strong><span>Strength trend</span></div></div><h3>Plan adherence</h3><div class="progress-bar"><span style="width:${user.adherence || 0}%"></span></div><p style="color:var(--muted);font-size:.79rem">You are ${user.adherence >= 80 ? "building excellent momentum" : "making steady progress"}. Every session counts.</p><div class="panel-head" style="margin-top:28px"><h2>Recent sessions</h2></div><div class="session-row"><div><strong>Full body strength</strong><p>Mar 20, 2026 · 52 minutes</p></div><strong>Completed</strong><span class="status status-active">Good</span></div><div class="session-row"><div><strong>Mobility & core</strong><p>Mar 17, 2026 · 38 minutes</p></div><strong>Completed</strong><span class="status status-active">Great</span></div><div class="session-row"><div><strong>Lower body strength</strong><p>Mar 14, 2026 · 49 minutes</p></div><strong>Completed</strong><span class="status status-active">Good</span></div><div class="panel" style="background:var(--mint);border:0;margin-top:20px"><h3>Coach note</h3><p style="font-size:.84rem;line-height:1.55;margin-bottom:0">${escapeHtml(user.notes || "Keep showing up and focus on quality movement.")}</p></div></section></div>`;
}

function renderModal(type, client = {}) {
  const isEdit = Boolean(client.id);
  return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">${isEdit ? "Client record" : "New client"}</div><h2>${isEdit ? "Update client" : "Add a client"}</h2></div><button class="close" id="close-modal" aria-label="Close">&times;</button></div><form id="client-form" data-id="${client.id || ""}"><div class="form-grid"><div class="field"><label for="client-name">Full name</label><input id="client-name" name="name" required value="${escapeHtml(client.name || "")}" /></div><div class="field"><label for="client-email">Email</label><input id="client-email" name="email" type="email" required value="${escapeHtml(client.email || "")}" /></div><div class="field"><label for="client-goal">Primary focus</label><input id="client-goal" name="goal" value="${escapeHtml(client.goal || "")}" placeholder="e.g. Strength & mobility" /></div><div class="field"><label for="client-status">Status</label><select id="client-status" name="status"><option ${client.status === "Active" ? "selected" : ""}>Active</option><option ${client.status === "Paused" ? "selected" : ""}>Paused</option></select></div><div class="field"><label for="client-next">Next session</label><input id="client-next" name="nextSession" value="${escapeHtml(client.nextSession || "")}" placeholder="e.g. Friday, 10:00" /></div><div class="field"><label for="client-adherence">Adherence (%)</label><input id="client-adherence" name="adherence" type="number" min="0" max="100" value="${client.adherence || 0}" /></div><div class="field span-2"><label for="client-notes">Coach notes</label><textarea id="client-notes" name="notes">${escapeHtml(client.notes || "")}</textarea></div></div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px"><button type="button" class="btn btn-ghost" id="cancel-modal">Cancel</button><button class="btn btn-dark">${isEdit ? "Save changes" : "Create client"}</button></div></form></div></div>`;
}

function openModal(client = {}) { document.body.insertAdjacentHTML("beforeend", renderModal("client", client)); bindModalEvents(); }
function bindModalEvents() {
  document.querySelector("#close-modal")?.addEventListener("click", () => document.querySelector("#modal-backdrop").remove());
  document.querySelector("#cancel-modal")?.addEventListener("click", () => document.querySelector("#modal-backdrop").remove());
  document.querySelector("#client-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget); const id = event.currentTarget.dataset.id;
    const values = Object.fromEntries(formData.entries()); values.adherence = Number(values.adherence) || 0;
    if (id) Object.assign(data.users.find((user) => user.id === id), values);
    else { data.users.push({ ...values, id: `client-${Date.now()}`, role: "client", password: "welcome123", joined: formatDate(), sessions: 0 }); data.activities.unshift({ text: `${values.name} was added as a new client`, time: "Just now", mark: initials(values.name) }); }
    saveData(); document.querySelector("#modal-backdrop").remove(); render(); toast(id ? "Client record updated" : "Client added successfully");
  });
}

function bindEvents() {
  document.querySelector("#login-form")?.addEventListener("submit", (event) => {
    event.preventDefault(); const email = document.querySelector("#email").value.trim().toLowerCase(); const password = document.querySelector("#password").value;
    const user = data.users.find((item) => item.email.toLowerCase() === email && item.password === password);
    if (!user) return toast("That email and password do not match."); session = user.id; localStorage.setItem(SESSION_KEY, session); currentView = user.role === "admin" ? "overview" : "profile"; render();
  });
  document.querySelector("#show-register")?.addEventListener("click", () => openRegistration());
  document.querySelector("#logout")?.addEventListener("click", () => { session = null; localStorage.removeItem(SESSION_KEY); render(); });
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => { currentView = button.dataset.view; render(); }));
  document.querySelector("#add-client")?.addEventListener("click", () => openModal());
  document.querySelectorAll("[data-client-id]").forEach((button) => button.addEventListener("click", () => openModal(data.users.find((user) => user.id === button.dataset.clientId))));
  document.querySelector("#edit-profile")?.addEventListener("click", () => openModal(currentUser()));
  document.querySelector("#client-search")?.addEventListener("input", (event) => { const needle = event.target.value.toLowerCase(); const filtered = data.users.filter((user) => user.role === "client" && `${user.name} ${user.email}`.toLowerCase().includes(needle)); document.querySelector("#client-table").innerHTML = renderClientTable(filtered); document.querySelectorAll("[data-client-id]").forEach((button) => button.addEventListener("click", () => openModal(data.users.find((user) => user.id === button.dataset.clientId)))); });
}

function openRegistration() {
  document.querySelector("#app").innerHTML = `<main class="auth-shell"><section class="auth-art"><div class="brand">FORM <span>&</span> FUNCTION</div><div><h1>Your next chapter starts here.</h1><p>Register as a client to keep your profile and progress in one calm, focused space.</p></div><div class="art-footer">Already have an account? <button class="text-button" style="color:var(--teal)" id="back-login">Sign in</button></div></section><section class="auth-panel"><div class="auth-card"><div class="eyebrow">Client registration</div><h2>Create your profile</h2><p>Your coach will see your registration and follow up with next steps.</p><form id="register-form"><div class="field"><label for="reg-name">Full name</label><input id="reg-name" name="name" required /></div><div class="field"><label for="reg-email">Email address</label><input id="reg-email" name="email" type="email" required /></div><div class="field"><label for="reg-password">Create password</label><input id="reg-password" name="password" type="password" minlength="6" required /></div><div class="field"><label for="reg-goal">What are you working toward?</label><input id="reg-goal" name="goal" required placeholder="e.g. Feel stronger and more mobile" /></div><div class="auth-actions"><button type="button" class="text-button" id="back-login-2">Back to sign in</button><button class="btn btn-dark">Register</button></div></form></div></section></main>`;
  document.querySelectorAll("#back-login, #back-login-2").forEach((button) => button.addEventListener("click", render));
  document.querySelector("#register-form").addEventListener("submit", (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); if (data.users.some((user) => user.email.toLowerCase() === values.email.toLowerCase())) return toast("An account with that email already exists."); const user = { ...values, id: `client-${Date.now()}`, role: "client", status: "Active", joined: formatDate(), sessions: 0, adherence: 0, nextSession: "To be scheduled", notes: "New client - schedule an onboarding session." }; data.users.push(user); data.activities.unshift({ text: `${user.name} registered as a new client`, time: "Just now", mark: initials(user.name) }); saveData(); session = user.id; localStorage.setItem(SESSION_KEY, session); render(); toast("Welcome to Form & Function"); });
}

render();
