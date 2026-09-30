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
      opacity: 0.25,
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
      onclick: { enable: false },
      resize: true
    },
    modes: {
      bubble: { distance: 150, size: 5, duration: 2, opacity: 0.9 }
    }
  },
  retina_detect: true
});

/* Keep particles off the page's text. Particles bounce off anything matching
   AVOID (plus a margin), links that would cross it aren't drawn, and a particle
   that ends up underneath (the page scrolled over it, or it spawned there) is
   hidden until it drifts back out. Clicking pushes nearby particles away with a
   kick that eases out into a steady drift away from the click; it replaces
   particles.js's own click repulse, which
   overwrites velocities every frame (undoing bounces) and flings particles
   near the click off the screen. */
(function () {
  var dom = window.pJSDom && window.pJSDom[0];
  if (!dom) return;
  var pJS = dom.pJS;

  var AVOID = "h1, h2, h3, h4, p, li, blockquote, pre, table, figure, " +
              ".btn, .contact-btn, .tag, .card, .nav-card, .game-card, " +
              ".timeline-item, .resume-entry, .navbar-brand, .navbar-links a, " +
              ".theme-toggle, footer";
  var MARGIN = 16; // CSS px of clear space around each element
  var PUSH_RADIUS = 200; // CSS px around a click that gets pushed
  var PUSH_SPEED = 3;     // CSS px per 60 Hz frame for a particle right at the click
  var PUSH_DECAY = 0.985; // per 60 Hz frame; a full kick eases out over ~4s
  var DRIFT_MIN = 0.7;    // pushed particles keep drifting away at least this fast
                          // (particles.js velocity units; unpushed ones are 0-0.7)
  var FRAME_MS = 1000 / 60;
  var REFRESH_MS = 300;

  var zones = [];
  var dirty = true;
  var lastRefresh = 0;
  var lastFrame = 0;

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
    // Kicks move and fade by elapsed time, so they glide the same on 60 Hz
    // and 120 Hz screens (capped so a background tab doesn't lurch)
    var frames = lastFrame ? Math.min(now - lastFrame, 50) / FRAME_MS : 1;
    var decay = Math.pow(PUSH_DECAY, frames);
    lastFrame = now;
    if (dirty || now - lastRefresh > REFRESH_MS) {
      refreshZones();
      dirty = false;
      lastRefresh = now;
    }
    var step = pJS.particles.move.speed / 2;
    var ps = pJS.particles.array;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      var kx = p.kickX || 0, ky = p.kickY || 0;
      p.avoidHidden = !!zoneAt(p.x, p.y);
      if (!p.avoidHidden) {
        // About to enter a zone: reflect off the side it would cross. If that
        // still lands in a zone (an inside corner where two meet), go back
        // the way it came, which is clear because that's where it just was.
        var z = zoneAt(p.x + p.vx * step + kx, p.y + p.vy * step + ky);
        if (z) {
          var overX = p.x > z.l && p.x < z.r, overY = p.y > z.t && p.y < z.b;
          var flipY = overX || !overY, flipX = overY || !overX;
          if (flipY) { p.vy = -p.vy; ky = -ky; }
          if (flipX) { p.vx = -p.vx; kx = -kx; }
          if (zoneAt(p.x + p.vx * step + kx, p.y + p.vy * step + ky)) {
            if (!flipY) { p.vy = -p.vy; ky = -ky; }
            if (!flipX) { p.vx = -p.vx; kx = -kx; }
          }
        }
      }
      if (kx || ky) {
        p.x += kx * frames;
        p.y += ky * frames;
        kx *= decay;
        ky *= decay;
        if (Math.abs(kx) + Math.abs(ky) < 0.01) kx = ky = 0;
        p.kickX = kx;
        p.kickY = ky;
      }
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

  window.addEventListener("click", function (e) {
    var r = pJS.canvas.pxratio;
    var cx = e.clientX * r, cy = e.clientY * r, R = PUSH_RADIUS * r;
    var ps = pJS.particles.array;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i], dx = p.x - cx, dy = p.y - cy, d = Math.sqrt(dx * dx + dy * dy);
      if (d >= R || d === 0) continue;
      var speed = PUSH_SPEED * r * (1 - d / R);
      p.kickX = (p.kickX || 0) + dx / d * speed;
      p.kickY = (p.kickY || 0) + dy / d * speed;
      // Turn the particle's own drift away from the click too, so when the
      // kick fades it carries on drifting instead of coming to a stop
      var v = Math.max(Math.sqrt(p.vx * p.vx + p.vy * p.vy), DRIFT_MIN);
      p.vx = dx / d * v;
      p.vy = dy / d * v;
    }
  });

  function markDirty() { dirty = true; }
  window.addEventListener("scroll", markDirty, { passive: true });
  window.addEventListener("resize", markDirty);
})();
