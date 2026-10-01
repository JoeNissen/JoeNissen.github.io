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
  var cards = document.querySelectorAll(".card, .game-card, .timeline-item");
  if (cards.length > 0 && "IntersectionObserver" in window) {
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
  if (pageHeader) {
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

  /* 6. Dark/light mode toggle */
  // Follow the system setting until the visitor picks a theme with the
  // toggle; only an explicit pick is saved. (The key was "theme" when every
  // page load saved it, so old values aren't real choices and are ignored.)
  var THEME_KEY = "theme-choice";
  var systemLight = window.matchMedia("(prefers-color-scheme: light)");

  function getSavedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function applyTheme(theme) {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  applyTheme(getSavedTheme() || (systemLight.matches ? "light" : "dark"));

  systemLight.addEventListener("change", function(e) {
    if (!getSavedTheme()) applyTheme(e.matches ? "light" : "dark");
  });

  document.querySelectorAll(".theme-toggle").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var current = document.documentElement.getAttribute("data-theme");
      var next = current === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  });

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
    e.preventDefault();
    document.body.classList.add("fade-out");
    setTimeout(function() {
      window.location.href = href;
    }, 200);
  });

})();
