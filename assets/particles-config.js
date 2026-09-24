particlesJS("particles-js", {
  particles: {
    number: { value: 110, density: { enable: true, value_area: 900 } },
    color: { value: "#7aa2f7" },
    shape: { type: "circle" },
    opacity: {
      value: 0.65,
      random: true,
      anim: { enable: true, speed: 0.5, opacity_min: 0.25, sync: false }
    },
    size: {
      value: 3,
      random: true,
      anim: { enable: true, speed: 2, size_min: 0.5, sync: false }
    },
    line_linked: {
      enable: true,
      distance: 140,
      color: "#7aa2f7",
      opacity: 0.15,
      width: 1
    },
    move: {
      enable: true,
      speed: 0.8,
      direction: "none",
      random: true,
      straight: false,
      out_mode: "out",
      bounce: false
    }
  },
  interactivity: {
    detect_on: "window",
    events: {
      onhover: { enable: true, mode: "bubble" },
      onclick: { enable: true, mode: "repulse" },
      resize: true
    },
    modes: {
      bubble: { distance: 150, size: 5, duration: 2, opacity: 0.9 },
      repulse: { distance: 200, duration: 0.6 }
    }
  },
  retina_detect: true
});

/* Keep particles off the page's text. Particles bounce off anything matching
   AVOID (plus a margin), links that would cross it aren't drawn, and a particle
   that ends up underneath (the page scrolled over it, or it spawned there) is
   hidden until it drifts back out. */
(function () {
  var dom = window.pJSDom && window.pJSDom[0];
  if (!dom) return;
  var pJS = dom.pJS;

  var AVOID = "h1, h2, h3, h4, p, li, blockquote, pre, table, figure, " +
              ".btn, .contact-btn, .tag, .card, .nav-card, .game-card, " +
              ".timeline-item, .resume-entry, .navbar-brand, .navbar-links a, " +
              ".theme-toggle, footer";
  var MARGIN = 16; // CSS px of clear space around each element
  var REFRESH_MS = 300;

  var zones = [];
  var dirty = true;
  var lastRefresh = 0;

  function refreshZones() {
    var r = pJS.canvas.pxratio;
    var vh = window.innerHeight;
    var els = document.querySelectorAll(AVOID);
    zones = [];
    for (var i = 0; i < els.length; i++) {
      var b = els[i].getBoundingClientRect();
      if (!b.width || !b.height || b.bottom < -MARGIN || b.top > vh + MARGIN) continue;
      zones.push({
        l: (b.left - MARGIN) * r, r: (b.right + MARGIN) * r,
        t: (b.top - MARGIN) * r,  b: (b.bottom + MARGIN) * r
      });
    }
  }

  function zoneAt(x, y) {
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      if (x > z.l && x < z.r && y > z.t && y < z.b) return z;
    }
    return null;
  }

  // Liang–Barsky: does the segment (x1,y1)-(x2,y2) pass through zone z?
  function crosses(z, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, t0 = 0, t1 = 1;
    var p = [-dx, dx, -dy, dy], q = [x1 - z.l, z.r - x1, y1 - z.t, z.b - y1];
    for (var i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return false; continue; }
      var t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else          { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return true;
  }

  var update = pJS.fn.particlesUpdate;
  pJS.fn.particlesUpdate = function () {
    var now = performance.now();
    if (dirty || now - lastRefresh > REFRESH_MS) {
      refreshZones();
      dirty = false;
      lastRefresh = now;
    }
    var step = pJS.particles.move.speed / 2;
    var ps = pJS.particles.array;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      p.avoidHidden = !!zoneAt(p.x, p.y);
      if (p.avoidHidden) continue;
      // About to enter a zone: reflect off the side it would cross
      var z = zoneAt(p.x + p.vx * step, p.y + p.vy * step);
      if (!z) continue;
      var overX = p.x > z.l && p.x < z.r, overY = p.y > z.t && p.y < z.b;
      if (overX || !overY) p.vy = -p.vy;
      if (overY || !overX) p.vx = -p.vx;
    }
    update.apply(this, arguments);
  };

  var draw = pJS.fn.particle.prototype.draw;
  pJS.fn.particle.prototype.draw = function () {
    if (!this.avoidHidden) draw.apply(this, arguments);
  };

  var link = pJS.fn.interact.linkParticles;
  pJS.fn.interact.linkParticles = function (a, b) {
    if (a.avoidHidden || b.avoidHidden) return;
    var dx = a.x - b.x, dy = a.y - b.y, d = pJS.particles.line_linked.distance;
    if (dx * dx + dy * dy > d * d) return;
    for (var i = 0; i < zones.length; i++) {
      if (crosses(zones[i], a.x, a.y, b.x, b.y)) return;
    }
    link.apply(this, arguments);
  };

  function markDirty() { dirty = true; }
  window.addEventListener("scroll", markDirty, { passive: true });
  window.addEventListener("resize", markDirty);
})();
