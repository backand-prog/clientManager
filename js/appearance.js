(function () {
  var KEY = "backplan-appearance";
  var DEFAULTS = { theme: "system", contrast: false, textSize: "normal", reduceMotion: false };
  var root = document.documentElement;
  var dark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function load() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch (error) { return Object.assign({}, DEFAULTS); }
  }

  function save(settings) {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (error) { /* storage may be unavailable */ }
  }

  var settings = load();

  function apply() {
    var theme = settings.theme === "system" ? (dark && dark.matches ? "dark" : "light") : settings.theme;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-contrast", settings.contrast ? "high" : "normal");
    root.setAttribute("data-text-size", settings.textSize);
    root.setAttribute("data-motion", settings.reduceMotion ? "reduce" : "normal");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#081d2d" : "#102a43");
  }

  apply();
  if (dark && dark.addEventListener) dark.addEventListener("change", function () { if (settings.theme === "system") apply(); });

  function radio(name, value, label) {
    var id = "a11y-" + name + "-" + value;
    return '<label class="a11y-option" for="' + id + '"><input type="radio" id="' + id + '" name="' + name + '" value="' + value + '"' + (String(settings[name]) === value ? " checked" : "") + "> " + label + "</label>";
  }

  function check(name, label, hint) {
    var id = "a11y-" + name;
    return '<label class="a11y-option" for="' + id + '"><input type="checkbox" id="' + id + '" name="' + name + '"' + (settings[name] ? " checked" : "") + "> " + label + (hint ? "<small>" + hint + "</small>" : "") + "</label>";
  }

  function panelHtml() {
    return '<h2 id="a11y-title">Megjelenés és kisegítő lehetőségek</h2>'
      + '<fieldset><legend>Téma</legend>' + radio("theme", "system", "Rendszer szerint") + radio("theme", "light", "Világos") + radio("theme", "dark", "Sötét") + "</fieldset>"
      + '<fieldset><legend>Szövegméret</legend>' + radio("textSize", "normal", "Normál") + radio("textSize", "large", "Nagyobb") + radio("textSize", "xlarge", "Legnagyobb") + "</fieldset>"
      + check("contrast", "Nagy kontraszt", "Erősebb színek és vastagabb keretek, jobb olvashatóság.")
      + check("reduceMotion", "Mozgáscsökkentés", "Animációk és átmenetek kikapcsolása.")
      + '<button type="button" class="a11y-reset" data-a11y-reset>Alapértelmezés visszaállítása</button>';
  }

  function build() {
    if (document.getElementById("a11y-fab")) return;
    var fab = document.createElement("button");
    fab.id = "a11y-fab";
    fab.type = "button";
    fab.className = "a11y-fab";
    fab.setAttribute("aria-label", "Megjelenés és kisegítő beállítások");
    fab.setAttribute("aria-expanded", "false");
    fab.setAttribute("aria-controls", "a11y-panel");
    fab.innerHTML = '<span aria-hidden="true">Aa</span>';

    var panel = document.createElement("div");
    panel.id = "a11y-panel";
    panel.className = "a11y-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-labelledby", "a11y-title");
    panel.hidden = true;
    panel.innerHTML = panelHtml();

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    function setOpen(open) {
      panel.hidden = !open;
      fab.setAttribute("aria-expanded", String(open));
      if (open) { var first = panel.querySelector("input:checked") || panel.querySelector("input"); if (first) first.focus(); }
      else fab.focus();
    }

    fab.addEventListener("click", function () { setOpen(panel.hidden); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && !panel.hidden) setOpen(false); });
    document.addEventListener("click", function (event) {
      if (!panel.hidden && !panel.contains(event.target) && !fab.contains(event.target)) { panel.hidden = true; fab.setAttribute("aria-expanded", "false"); }
    });

    panel.addEventListener("change", function (event) {
      var input = event.target;
      if (input.type === "checkbox") settings[input.name] = input.checked;
      else settings[input.name] = input.value;
      save(settings);
      apply();
    });

    panel.addEventListener("click", function (event) {
      if (!event.target.closest("[data-a11y-reset]")) return;
      settings = Object.assign({}, DEFAULTS);
      save(settings);
      apply();
      panel.innerHTML = panelHtml();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
