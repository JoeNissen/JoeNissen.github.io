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
      '\n  <button class="theme-toggle" aria-label="Toggle theme">' +
      '\n    <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
      '\n    <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' +
      "\n  </button>\n";
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
