/* ── Shared site animations ── */

(function() {

  /* 0. Loading screen */
  var loader = document.querySelector(".loader");
  window.addEventListener("load", function() {
    document.body.classList.add("loaded");
    if (loader) {
      setTimeout(function() {
        loader.classList.add("hidden");
      }, 200);
    }
  });

  /* 1. Navbar solidify on scroll (handled in onScroll, section 5) */
  var navbar = document.querySelector(".navbar");

  /* 2. Scroll-triggered card reveals (IntersectionObserver) */
  var reduceMotion = document.documentElement.classList.contains("reduce-motion");
  var cards = document.querySelectorAll(".card, .game-card, .timeline-item");
  if (cards.length > 0 && "IntersectionObserver" in window && !reduceMotion) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var delay = Array.prototype.indexOf.call(cards, entry.target) * 150;
          setTimeout(function() {
            entry.target.classList.add("visible");
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    cards.forEach(function(card) {
      observer.observe(card);
    });
  } else {
    cards.forEach(function(card) { card.classList.add("visible"); });
  }

  /* 3. Card tilt on hover (3D parallax) */
  document.querySelectorAll(".card").forEach(function(card) {
    card.addEventListener("mousemove", function(e) {
      if (window.siteReduceMotion()) return;
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var centerX = rect.width / 2;
      var centerY = rect.height / 2;

      var rotateX = ((y - centerY) / centerY) * -4;
      var rotateY = ((x - centerX) / centerX) * 4;

      card.style.transform = "perspective(800px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg) translateY(-6px)";
    });

    card.addEventListener("mouseleave", function() {
      card.style.transform = "";
    });
  });

  /* 4. Typewriter effect on all page header h1 elements */
  var pageHeader = document.querySelector(".page-header h1");
  if (pageHeader && !reduceMotion) {
    var fullText = pageHeader.textContent.replace(".", "");
    var dotSpan = pageHeader.querySelector("span");

    // Hide the dot span during typing
    if (dotSpan) dotSpan.style.display = "none";

    // Clear original text
    pageHeader.childNodes.forEach(function(node) {
      if (node.nodeType === 3) node.textContent = "";
    });

    // Create cursor
    var cursor = document.createElement("span");
    cursor.className = "typewriter-cursor";
    cursor.innerHTML = "&nbsp;";
    pageHeader.appendChild(cursor);

    var charIndex = 0;
    var textNode = document.createTextNode("");
    pageHeader.insertBefore(textNode, cursor);

    function typeNext() {
      if (charIndex < fullText.length) {
        textNode.textContent += fullText[charIndex];
        charIndex++;
        setTimeout(typeNext, 50 + Math.random() * 30);
      } else {
        // Done typing, show the dot and remove cursor
        if (dotSpan) {
          dotSpan.style.display = "";
          pageHeader.insertBefore(dotSpan, cursor);
        }
        setTimeout(function() {
          cursor.remove();
        }, 1200);
      }
    }

    setTimeout(typeNext, 300);
  }

  /* 5. Scroll progress bar */
  var progressBar = document.createElement("div");
  progressBar.className = "scroll-progress";
  document.body.appendChild(progressBar);

  // One scroll listener for the navbar and progress bar, run at most once
  // per frame so layout is read once per frame rather than on every event
  var scrollQueued = false;
  function onScroll() {
    scrollQueued = false;
    var scrollTop = window.scrollY;
    if (navbar) navbar.classList.toggle("scrolled", scrollTop > 40);
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      progressBar.style.transform = "scaleX(" + (scrollTop / docHeight) + ")";
    }
  }

  window.addEventListener("scroll", function() {
    if (!scrollQueued) {
      scrollQueued = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });

  /* 6. Settings panel (gear in the navbar; markup comes from layout.js)
     Each setting follows the device until the visitor picks something; only
     explicit picks are saved. The <head> of every page applies the saved
     values before first paint, so this only has to handle changes. */
  var root = document.documentElement;
  var KEYS = {
    theme: "theme-choice",          // "light" | "dark"
    motion: "motion-choice",        // "reduce" | "full"
    particles: "particles-choice",  // "off"
    density: "particles-density"    // "low" | "high"
  };
  var systemLight = window.matchMedia("(prefers-color-scheme: light)");
  var systemReduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function load(key) {
    try { return localStorage.getItem(KEYS[key]); } catch (e) { return null; }
  }

  function save(key, value) {
    try {
      if (value == null) localStorage.removeItem(KEYS[key]);
      else localStorage.setItem(KEYS[key], value);
    } catch (e) {}
  }

  function particles() { return window.siteParticles; }

  function applyAll() {
    var theme = load("theme") || (systemLight.matches ? "light" : "dark");
    if (theme === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");

    var motion = load("motion");
    var reduce = motion ? motion === "reduce" : systemReduce.matches;
    root.classList.toggle("reduce-motion", reduce);

    var particlesOn = load("particles") !== "off";
    root.classList.toggle("no-particles", !particlesOn);

    if (particles()) {
      particles().setReduced(reduce);
      particles().setEnabled(particlesOn);
      particles().setDensity(load("density") || "normal");
    }
    syncPanel();
  }

  window.siteReduceMotion = function() { return root.classList.contains("reduce-motion"); };

  systemLight.addEventListener("change", applyAll);
  systemReduce.addEventListener("change", applyAll);

  var gear = document.querySelector(".settings-toggle");
  var panel = document.getElementById("settingsPanel");

  function syncPanel() {
    if (!panel) return;
    var theme = load("theme") || "system";
    var density = load("density") || "normal";
    panel.querySelectorAll("[data-theme]").forEach(function(b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-theme") === theme);
    });
    panel.querySelectorAll("[data-density]").forEach(function(b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-density") === density);
    });
    var particlesOn = !root.classList.contains("no-particles");
    panel.querySelector('[data-setting="motion"]').setAttribute("aria-checked", root.classList.contains("reduce-motion"));
    panel.querySelector('[data-setting="particles"]').setAttribute("aria-checked", particlesOn);
    panel.querySelectorAll("[data-density]").forEach(function(b) { b.disabled = !particlesOn; });
  }

  function openPanel(open) {
    panel.hidden = !open;
    gear.setAttribute("aria-expanded", open);
    if (open) {
      var first = panel.querySelector('[aria-pressed="true"]') || panel.querySelector("button");
      first.focus();
    }
  }

  if (gear && panel) {
    gear.addEventListener("click", function(e) {
      e.stopPropagation();
      openPanel(panel.hidden);
    });

    document.addEventListener("click", function(e) {
      if (!panel.hidden && !panel.contains(e.target) && !gear.contains(e.target)) openPanel(false);
    });

    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape" && !panel.hidden) {
        openPanel(false);
        gear.focus();
      }
    });

    panel.addEventListener("click", function(e) {
      var btn = e.target.closest("button");
      if (!btn || btn.disabled) return;
      var themeBefore = root.getAttribute("data-theme");

      if (btn.hasAttribute("data-theme")) {
        var pick = btn.getAttribute("data-theme");
        save("theme", pick === "system" ? null : pick);
      } else if (btn.hasAttribute("data-density")) {
        var d = btn.getAttribute("data-density");
        save("density", d === "normal" ? null : d);
      } else if (btn.getAttribute("data-setting") === "motion") {
        var reduceNow = btn.getAttribute("aria-checked") !== "true";
        // Matching the device again means "follow the device"
        save("motion", reduceNow === systemReduce.matches ? null : (reduceNow ? "reduce" : "full"));
      } else if (btn.getAttribute("data-setting") === "particles") {
        save("particles", btn.getAttribute("aria-checked") === "true" ? "off" : null);
      } else if (btn.classList.contains("settings-reset")) {
        Object.keys(KEYS).forEach(function(k) { save(k, null); });
      }
      applyAll();

      // A theme change sends a ripple through the particles from the button
      if (root.getAttribute("data-theme") !== themeBefore && particles()) {
        var r = btn.getBoundingClientRect();
        particles().ripple(r.left + r.width / 2, r.top + r.height / 2);
      }
    });
  }

  applyAll();

  /* 7. Mobile hamburger menu */
  var hamburger = document.querySelector(".hamburger");
  var navLinks = document.querySelector(".navbar-links");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", function(e) {
      e.stopPropagation();
      hamburger.classList.toggle("active");
      navLinks.classList.toggle("open");
    });

    document.addEventListener("click", function(e) {
      if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
        hamburger.classList.remove("active");
        navLinks.classList.remove("open");
      }
    });

    navLinks.querySelectorAll("a").forEach(function(link) {
      link.addEventListener("click", function() {
        hamburger.classList.remove("active");
        navLinks.classList.remove("open");
      });
    });
  }

  /* 8. Page transition animations */
  document.addEventListener("click", function(e) {
    var link = e.target.closest("a");
    if (!link) return;
    var href = link.getAttribute("href");
    if (!href) return;
    // Only intercept internal navigation links
    if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#") ||
        link.hasAttribute("download") || link.getAttribute("target") === "_blank") {
      return;
    }
    if (window.siteReduceMotion()) return;
    e.preventDefault();
    document.body.classList.add("fade-out");
    setTimeout(function() {
      window.location.href = href;
    }, 200);
  });

})();
