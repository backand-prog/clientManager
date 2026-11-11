import { escapeHtml } from "./helpers.js";

const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Egy szűrt lista attribútumai: a keresett szöveg és a szűrők értékei.
export function filterAttrs(searchText, values = {}) {
  const extra = Object.entries(values).map(([key, value]) => ` data-f-${key}="${escapeHtml(String(value ?? ""))}"`).join("");
  return ` data-filter-item data-search="${escapeHtml(normalize(searchText))}"${extra}`;
}

export function uniqueOptions(values) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "hu"))
    .map((value) => [value, value]);
}

// selects: [{ key, label, options: [[érték, felirat]] }]
export function renderFilterBar({ placeholder = "Keresés", selects = [] } = {}) {
  const fields = selects.filter((select) => select.options.length > 1 || select.alwaysShow).map((select) => `<select data-filter-key="${escapeHtml(select.key)}" aria-label="${escapeHtml(select.label)}"><option value="">${escapeHtml(select.label)}: mind</option>${select.options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}</select>`).join("");
  return `<div class="filter-bar"><input type="search" data-filter-search placeholder="${escapeHtml(placeholder)}" aria-label="${escapeHtml(placeholder)}" autocomplete="off" />${fields}<button type="button" class="text-button" data-filter-reset hidden>Szűrők törlése</button><span class="filter-count" aria-live="polite"></span></div>`;
}

function applyFilters(scope) {
  const bar = scope.querySelector(".filter-bar");
  if (!bar) return;
  const needle = normalize(bar.querySelector("[data-filter-search]")?.value.trim());
  const selected = [...bar.querySelectorAll("[data-filter-key]")].map((select) => [select.dataset.filterKey, select.value]).filter(([, value]) => value);
  const items = [...scope.querySelectorAll("[data-filter-item]")];
  let visible = 0;
  items.forEach((item) => {
    const match = (!needle || (item.dataset.search || "").includes(needle))
      && selected.every(([key, value]) => (item.dataset[`f${key[0].toUpperCase()}${key.slice(1)}`] || "").split("|").includes(value));
    item.hidden = !match;
    if (match) visible += 1;
  });
  const active = Boolean(needle) || selected.length > 0;
  bar.querySelector("[data-filter-reset]").hidden = !active;
  bar.querySelector(".filter-count").textContent = active ? `${visible} / ${items.length} találat` : "";
  const empty = scope.querySelector(".filter-empty");
  if (empty) empty.hidden = visible > 0;
  scope.querySelectorAll("[data-filter-table]").forEach((table) => { table.hidden = visible === 0; });
}

export function bindFilters() {
  document.querySelectorAll(".filter-scope").forEach((scope) => {
    const bar = scope.querySelector(".filter-bar");
    if (!bar) return;
    bar.addEventListener("input", () => applyFilters(scope));
    bar.addEventListener("change", () => applyFilters(scope));
    bar.querySelector("[data-filter-reset]")?.addEventListener("click", () => {
      bar.querySelector("[data-filter-search]").value = "";
      bar.querySelectorAll("[data-filter-key]").forEach((select) => { select.value = ""; });
      applyFilters(scope);
    });
  });
}

export const filterEmptyMessage = (text = "Nincs a szűrésnek megfelelő találat.") => `<div class="empty-state filter-empty" hidden>${escapeHtml(text)}</div>`;
