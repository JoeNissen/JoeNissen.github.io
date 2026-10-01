/* ── Shared navbar and footer ──
   Every page has an empty <nav class="navbar"> and <footer>; this fills them
   in, so the menu and footer are edited here once instead of on every page.
   Load it before animations.js, which wires up the hamburger and theme toggle. */

(function() {

  // Links are relative to this script's own location: "" for top-level
  // pages, "../" for games/, "/" for the 404 page (served at any path)
  var src = document.currentScript.getAttribute("src");
  var base = src.slice(0, src.indexOf("assets/"));

  var PAGES = [
    ["", "Home"],
    ["resume", "Resume"],
    ["about", "About"],
    ["projects", "Projects"],
    ["research", "Research"],
    ["games", "Games"]
  ];

  // Only top-level pages highlight their link (games/* and the 404 don't)
  var current = null;
  if (base === "") {
    current = location.pathname.split("/").pop().replace(/\.html$/, "");
    if (current === "index") current = "";
  }

  function href(page) {
    return page ? base + page : (base || "./");
  }

  /* 1. Navbar */
  var nav = document.querySelector("nav.navbar");
  if (nav) {
    var links = PAGES.map(function(p) {
      var active = p[0] === current ? ' class="active" aria-current="page"' : "";
      return '    <li><a href="' + href(p[0]) + '"' + active + ">" + p[1] + "</a></li>";
    }).join("\n");

    nav.innerHTML =
      '\n  <a class="navbar-brand" href="' + href("") + '">JN<span>.</span></a>' +
      '\n  <button class="hamburger" aria-label="Toggle menu"><span></span><span></span><span></span></button>' +
      '\n  <ul class="navbar-links">\n' + links + "\n  </ul>" +
      '\n  <button class="settings-toggle" aria-label="Settings" aria-expanded="false" aria-controls="settingsPanel">' +
      '\n    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
      "\n  </button>" +
      settingsPanel() + "\n";
  }

  /* Settings panel (behaviour lives in animations.js, section 6) */
  function segmented(label, name, options) {
    return '\n    <div class="settings-row">' +
      '\n      <span class="settings-label" id="set-' + name + '-label">' + label + "</span>" +
      '\n      <div class="settings-segmented" role="group" aria-labelledby="set-' + name + '-label">' +
      options.map(function(o) {
        return '<button type="button" data-' + name + '="' + o[0] + '" aria-pressed="false">' + o[1] + "</button>";
      }).join("") +
      "</div>\n    </div>";
  }

  function toggle(label, note, name) {
    return '\n    <div class="settings-row">' +
      '\n      <span class="settings-label" id="set-' + name + '-label">' + label +
      '<small>' + note + "</small></span>" +
      '\n      <button type="button" class="settings-switch" role="switch" aria-checked="false" data-setting="' + name +
      '" aria-labelledby="set-' + name + '-label"></button>' +
      "\n    </div>";
  }

  function settingsPanel() {
    return '\n  <div class="settings-panel" id="settingsPanel" role="dialog" aria-label="Settings" hidden>' +
      '\n    <p class="settings-title">Settings</p>' +
      segmented("Theme", "theme", [["system", "System"], ["light", "Light"], ["dark", "Dark"]]) +
      toggle("Reduce motion", "Calmer animations and still particles", "motion") +
      toggle("Background particles", "The drifting dots behind the page", "particles") +
      segmented("Density", "density", [["low", "Low"], ["normal", "Normal"], ["high", "High"]]) +
      '\n    <p class="settings-hint">Tip: press and hold on the background to pull the particles in, then let go.</p>' +
      '\n    <button type="button" class="settings-reset">Reset to defaults</button>' +
      "\n  </div>";
  }

  /* 2. Footer, with "Last updated" taken from the page's Last-Modified
     header, which GitHub Pages sets to the time of the latest deploy */
  var footer = document.querySelector("footer");
  if (footer) {
    var updated = new Date(document.lastModified);
    var text = "&copy; " + new Date().getFullYear() + " Joe Nissen";
    if (!isNaN(updated)) {
      text += " &middot; Last updated " +
        updated.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    footer.innerHTML = "\n  " + text + "\n";
  }

})();
