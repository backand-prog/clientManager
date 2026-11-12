import { currentUser } from "../auth.js";
import {
  data,
  selectedCoachId
} from "../state.js";
import { COACH_SERVICES, coachProfileFor, escapeHtml, initials, serviceLabel } from "../helpers.js";
import { filterAttrs, filterEmptyMessage, renderFilterBar, uniqueOptions } from "../filters.js";

function renderServiceChips(profile) {
  const services = profile.services || [];
  return services.length ? `<div class="service-chips">${services.map((key) => `<span class="service-chip service-chip-${escapeHtml(key)}">${escapeHtml(serviceLabel(key))}</span>`).join("")}</div>` : "";
}

export function renderCoachDirectory() {
  const profiles = data.coachProfiles || [];
  return `<div class="topbar"><div><div class="eyebrow">Felfedezés</div><h1>Edzők böngészése</h1><p>Ismerd meg az edzőket, majd küldj kapcsolódási kérést.</p></div></div>
    ${profiles.length ? `<div class="filter-scope">${renderFilterBar({ placeholder: "Keresés név, szakterület, helyszín vagy bemutatkozás alapján", selects: [{ key: "specialty", label: "Szakterület", options: uniqueOptions(profiles.map((profile) => profile.specialty)) }, { key: "services", label: "Szolgáltatás", alwaysShow: true, options: COACH_SERVICES }, { key: "location", label: "Helyszín", options: uniqueOptions(profiles.map((profile) => profile.location)) }, { key: "contact", label: "Elérhetőség", alwaysShow: true, options: [["email", "Van e-mail-cím"], ["photo", "Van fotó"]] }] })}<div class="coach-directory">${profiles.map((profile) => {
      const intro = profile.shortBio || (profile.bio.length > 200 ? `${profile.bio.slice(0, 197).trimEnd()}…` : profile.bio);
      const contactKinds = [profile.contactEmail ? "email" : "", (profile.photos || []).length ? "photo" : ""].filter(Boolean);
      return `<article class="panel coach-card"${filterAttrs(`${profile.name} ${profile.specialty} ${profile.location} ${profile.shortBio} ${profile.bio}`, { specialty: profile.specialty, location: profile.location, services: (profile.services || []).join("|"), contact: contactKinds.join("|") })}><div class="coach-card-heading"><div class="avatar">${initials(profile.name)}</div><div><h2>${escapeHtml(profile.name)}</h2><p>${escapeHtml(profile.specialty || "Személyi edző")}</p></div></div>${renderServiceChips(profile)}${intro ? `<p class="coach-card-intro">${escapeHtml(intro)}</p>` : `<p class="coach-card-intro muted">Az edző még nem írt rövid bemutatkozást.</p>`}<button class="btn btn-teal coach-open-profile" type="button" data-coach-profile="${escapeHtml(profile.id)}">Edző profiljának megnyitása</button></article>`;
    }).join("")}</div>${filterEmptyMessage("Nincs a keresésnek megfelelő edző. Próbálj másik szűrőt.")}</div>` : `<section class="panel empty-state">Még nincs közzétett edzői bemutatkozás. Nézz vissza később.</section>`}`;
}

export function renderCoachProfileDetail() {
  const profile = coachProfileFor(selectedCoachId);
  const isAdmin = currentUser()?.role === "admin";
  const backView = isAdmin ? "coach-profiles" : "coach-directory";
  const backLabel = isAdmin ? "Vissza az edzői profilokhoz" : "Vissza az edzőkhöz";
  if (!profile) return `<div class="topbar"><button class="text-button" data-view="${backView}">← ${backLabel}</button></div><section class="panel empty-state">Ez az edzői profil már nem érhető el.</section>`;
  const user = currentUser();
  const request = isAdmin ? null : data.connectionRequests.find((item) => item.requesterId === user.id && item.recipientId === profile.id && item.status === "pending");
  const connected = !isAdmin && (user.trainerIds || []).includes(profile.id);
  const contactReveal = profile.contactEmail
    ? `<details class="coach-contact-reveal"><summary class="btn btn-ghost">Kapcsolatfelvétel az edzővel</summary><p>Írj az edzőnek e-mailben: <a href="mailto:${escapeHtml(profile.contactEmail)}">${escapeHtml(profile.contactEmail)}</a></p></details>`
    : `<details class="coach-contact-reveal"><summary class="btn btn-ghost">Kapcsolatfelvétel az edzővel</summary><p>Az edző még nem adott meg e-mail-címet. Küldj kapcsolódási kérést, és ő jelentkezik.</p></details>`;
  const connectionAction = isAdmin
    ? ""
    : connected
      ? `<span class="status status-active">Már a kapcsolataid között van</span>`
      : request
        ? `<span class="status status-paused">Kérés elküldve · válaszra vár</span>`
        : `<button class="btn btn-teal" data-coach-request="${escapeHtml(profile.id)}">Jelentkezés az edzőhöz</button>`;
  const contactRows = [
    profile.phone ? `<div class="meta-row"><span>Telefon</span><strong>${escapeHtml(profile.phone)}</strong></div>` : "",
    profile.contactEmail ? `<div class="meta-row"><span>E-mail</span><strong>${escapeHtml(profile.contactEmail)}</strong></div>` : ""
  ].join("");
  return `<div class="topbar"><button class="text-button" data-view="${backView}">← ${backLabel}</button></div>
    <article class="panel coach-profile-detail">
      <div class="coach-card-heading"><div class="avatar">${initials(profile.name)}</div><div><div class="eyebrow">Edzői profil</div><h1>${escapeHtml(profile.name)}</h1><p>${escapeHtml(profile.specialty || "Személyi edző")}</p></div></div>${renderServiceChips(profile)}
      <h2>Bemutatkozás</h2><p class="coach-bio">${escapeHtml(profile.bio || "Az edző hamarosan bővebb bemutatkozást ad hozzá.")}</p>
      ${contactRows ? `<h2>Elérhetőségek</h2><div class="profile-meta coach-contact-meta">${contactRows}</div>` : ""}
      ${profile.location ? `<h2>Edzéshelyszín</h2><p class="coach-bio">${escapeHtml(profile.location)}</p>` : ""}
      ${profile.availability ? `<h2>Idősávok</h2><p class="coach-bio">${escapeHtml(profile.availability)}</p>` : ""}
      <h2>Képek</h2>${profile.photos?.length ? `<div class="coach-gallery coach-profile-gallery">${profile.photos.map((photo) => `<img src="${escapeHtml(photo.url)}" alt="${escapeHtml(profile.name)} edzésfotója" />`).join("")}</div>` : `<p class="muted">Ehhez a profilhoz még nem töltöttek fel képet.</p>`}
      ${isAdmin ? "" : `<div class="coach-actions">${connectionAction}${contactReveal}</div>${!connected && !request ? `<p class="settings-help">A „Jelentkezés az edzőhöz” gombbal kapcsolódási kérést küldesz; az edző jóváhagyása után kerülsz a kliensei közé. Ha előbb kérdeznél, használd a kapcsolatfelvételt.</p>` : ""}`}
    </article>`;
}

export function renderCoachProfileEditor(user) {
  const profile = coachProfileFor(user.id) || { name: user.name, specialty: user.specialty || "", bio: "", phone: "", contactEmail: user.email || "", location: "", availability: "", photos: [] };
  return `<div class="topbar"><div><div class="eyebrow">Edzői tér / Bemutatkozás</div><h1>Edzői bemutatkozás</h1><p>Oszd meg a tapasztalatodat, és mutasd meg a klienseknek, hogyan dolgozol.</p></div></div>
    <section class="panel coach-profile-editor"><form id="coach-profile-form"><div class="field"><label for="coach-specialty">Szakterület</label><input id="coach-specialty" name="specialty" maxlength="120" value="${escapeHtml(profile.specialty || "")}" required /></div>
      <fieldset class="field service-fieldset"><legend>Szolgáltatások</legend>${COACH_SERVICES.map(([value, label]) => `<label class="service-option"><input type="checkbox" name="services" value="${value}" ${(profile.services || ["training"]).includes(value) ? "checked" : ""} /> ${label}</label>`).join("")}<small class="settings-help">Ez jelenik meg az edzők böngészésénél. Legalább egyet válassz; a masszázs kiegészítő szolgáltatásként is vállalható.</small></fieldset>
      <div class="field"><label for="coach-short-bio">Rövid bemutatkozás (a böngészős kártyán jelenik meg)</label><textarea id="coach-short-bio" name="shortBio" maxlength="200" rows="3" placeholder="Egy-két mondat arról, miben segítesz a klienseknek...">${escapeHtml(profile.shortBio || "")}</textarea><small><span id="coach-short-bio-count">${(profile.shortBio || "").length}</span>/200 karakter</small></div>
      <div class="field"><label for="coach-bio">Hosszabb bemutatkozás (csak a profil megnyitása után látszik)</label><textarea id="coach-bio" name="bio" maxlength="2000" required placeholder="Írd le a tapasztalatodat és az edzésmódszeredet...">${escapeHtml(profile.bio || "")}</textarea><small>Legfeljebb 2000 karakter.</small></div>
      <fieldset class="coach-profile-section"><legend>Elérhetőségek</legend><div class="form-grid"><div class="field"><label for="coach-phone">Telefonszám</label><input id="coach-phone" name="phone" type="tel" maxlength="40" value="${escapeHtml(profile.phone || "")}" placeholder="pl. +36 30 123 4567" /></div><div class="field"><label for="coach-contact-email">Kapcsolati e-mail</label><input id="coach-contact-email" name="contactEmail" type="email" maxlength="254" value="${escapeHtml(profile.contactEmail || "")}" placeholder="pl. edzo@example.com" /></div></div><small>Csak a bejelentkezett felhasználók látják ezeket az adatokat.</small></fieldset>
      <fieldset class="coach-profile-section"><legend>Edzéshelyszín</legend><div class="field"><label for="coach-location">Terem vagy helyszín</label><input id="coach-location" name="location" maxlength="160" value="${escapeHtml(profile.location || "")}" placeholder="pl. FormFunction Stúdió, Budapest" /></div><small>Add meg, hol tartod vagy vállalod az edzéseket.</small></fieldset>
      <fieldset class="coach-profile-section"><legend>Idősávok</legend><div class="field"><label for="coach-availability">Milyen idősávokban vállalsz edzéseket</label><input id="coach-availability" name="availability" maxlength="300" value="${escapeHtml(profile.availability || "")}" placeholder="pl. H–P 06:00–20:00, Szo 08:00–12:00" /></div></fieldset>
      <div class="field"><label for="coach-photos">Képek (legfeljebb 5, egyenként legfeljebb 5 MB)</label><input id="coach-photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple /><small>JPG, PNG vagy WebP. A képek csak bejelentkezett felhasználók számára láthatók.</small></div>
      ${profile.photos?.length ? `<div class="coach-gallery">${profile.photos.map((photo) => `<div class="coach-gallery-item"><img src="${escapeHtml(photo.url)}" alt="${escapeHtml(profile.name)} edzésfotója" /><button class="btn btn-ghost" type="button" data-remove-coach-photo="${escapeHtml(photo.path)}">Kép törlése</button></div>`).join("")}</div>` : `<p class="muted">Még nem töltöttél fel képet.</p>`}
      <button class="btn btn-teal" type="submit">Bemutatkozás mentése</button>
    </form></section>`;
}
