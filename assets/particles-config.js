/* ── Background particles ──
   particles.js draws the dots; this file configures it and layers on:
   - text avoidance: particles bounce off text, links never cross it
   - click: pushes nearby particles away
   - press and hold (mouse): pulls particles in; letting go bursts them out
   - theme change: a ripple spreads out from the settings button
   - Konami code (up up down down left right left right B A): "JN." in particles
   - settings hooks (window.siteParticles) used by the settings panel */

(function () {
  var root = document.documentElement;

  var CONFIG = {
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
  };
  var BASE_COUNT = CONFIG.particles.number.value;
  var DENSITY = { low: 0.5, normal: 1, high: 1.7 };

  var AVOID = "h1, h2, h3, h4, p, li, blockquote, pre, table, figure, " +
              ".btn, .contact-btn, .tag, .card, .nav-card, .game-card, " +
              ".timeline-item, .resume-entry, .navbar-brand, .navbar-links a, " +
              ".settings-toggle, .settings-panel, footer";
  var MARGIN = 16;        // CSS px of clear space around each element
  var PUSH_RADIUS = 200;  // CSS px around a click that gets pushed
  var PUSH_SPEED = 2.6;   // CSS px per 60 Hz frame for a particle right at the click
  var PUSH_DECAY = 0.985; // per 60 Hz frame; a full kick eases out over ~4s
  var DRIFT_MIN = 0.45;   // pushed particles keep drifting away at least this fast
                          // (particles.js velocity units; unpushed ones are 0-0.7)
  var HOLD_MS = 180;      // press this long before the pull starts (a click stays a click)
  var PULL_RADIUS = 340;  // CSS px around the pointer that gets pulled
  var PULL_ACCEL = 0.09;  // CSS px per frame², strongest near the pointer
  var PULL_MAX = 4;       // CSS px per frame top speed while pulled
  var BURST_SPEED = 6;    // like PUSH_SPEED, for letting go of a hold
  var RIPPLE_SPEED = 1.4; // CSS px per ms the theme ripple ring grows
  var RIPPLE_KICK = 2.2;  // CSS px per frame given to particles the ring passes
  var FORM_MS = 4500;     // how long "JN." holds before scattering
  var FORM_COUNT = 260;   // particles in the letters on a 1280×900 screen
                          // (extras are added for it, then fade out)
  var FRAME_MS = 1000 / 60;
  var REFRESH_MS = 300;

  var pJS = null;
  var enabled = !root.classList.contains("no-particles");
  var reduced = root.classList.contains("reduce-motion");
  var density = "normal";
  try { density = localStorage.getItem("particles-density") || "normal"; } catch (e) {}

  var zones = [];
  var dirty = true;
  var lastRefresh = 0;
  var lastFrame = 0;
  var hold = null;        // { x, y, start, active } while the mouse is held down
  var swallowClick = false;
  var ripples = [];
  var rippleCount = 0;
  var form = null;        // { until, linkDistance } while "JN." is showing

  /* ── Setup ── */

  function start() {
    if (pJS) return;
    window.pJSDom = window.pJSDom || [];
    CONFIG.particles.number.value = Math.round(BASE_COUNT * (DENSITY[density] || 1));
    particlesJS("particles-js", CONFIG);
    pJS = window.pJSDom[window.pJSDom.length - 1].pJS;
    patch();
    applyMotion();
  }

  function running() { return pJS && enabled; }

  // Reduced motion freezes the particles: with movement off, particles.js
  // draws one frame and stops its loop, so they cost nothing while still
  function applyMotion() {
    if (!pJS) return;
    var moving = enabled && !reduced;
    pJS.particles.move.enable = moving;
    cancelAnimationFrame(pJS.fn.drawAnimFrame);
    if (moving) {
      lastFrame = 0;
      pJS.fn.vendors.draw();
    } else if (enabled) {
      redrawStill();
    }
  }

  // While frozen, redraw on scroll/resize so particles stay off the text
  function redrawStill() {
    if (!pJS || !enabled || pJS.particles.move.enable) return;
    dirty = true;
    pJS.fn.particlesDraw();
  }

  /* ── Hooks into particles.js ── */

  function patch() {
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
      if (form && now > form.until) scatter();
      if (hold && !hold.active && now - hold.start > HOLD_MS) {
        hold.active = true;
        root.classList.add("particles-pulling");
        var sel = window.getSelection && window.getSelection();
        if (sel) sel.removeAllRanges();
      }
      var r = pJS.canvas.pxratio;
      var step = pJS.particles.move.speed / 2;
      var ps = pJS.particles.array;
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        if (form) {
          // Glide to this particle's spot in the letters
          var ease = 1 - Math.pow(0.9, frames);
          p.x += (p.formX - p.x) * ease;
          p.y += (p.formY - p.y) * ease;
          p.kickX = p.kickY = 0;
          p.opacity = 0.95;  // hold the letters bright against particles.js's fade
          p.avoidHidden = false;
          continue;
        }
        if (p.extra) p.opacity = Math.max(0, p.opacity - 0.012 * frames);
        if (hold && hold.active) pull(p, r, frames);
        rippleKick(p, now, r);
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
      ripples = ripples.filter(function (rp) { return now - rp.start < rp.life; });
      if (!form) removeFadedExtras();
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
      if (!form) {
        for (var i = 0; i < zones.length; i++) {
          if (crosses(zones[i], a.x, a.y, b.x, b.y)) return;
        }
      }
      link.apply(this, arguments);
    };

    // Draw the ripple rings on top of the particles
    var drawAll = pJS.fn.particlesDraw;
    pJS.fn.particlesDraw = function () {
      drawAll.apply(this, arguments);
      if (!ripples.length) return;
      var ctx = pJS.canvas.ctx, r = pJS.canvas.pxratio, now = performance.now();
      ripples.forEach(function (rp) {
        var t = (now - rp.start) / rp.life;
        ctx.beginPath();
        ctx.arc(rp.x * r, rp.y * r, RIPPLE_SPEED * (now - rp.start) * r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(122, 162, 247, " + (0.35 * (1 - t)) + ")";
        ctx.lineWidth = 2 * r;
        ctx.stroke();
      });
    };
  }

  /* ── Text avoidance ── */

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

  /* ── Push, pull and burst ── */

  // Kick every particle within radius away from (x, y), in CSS px
  function push(x, y, radius, speed) {
    var r = pJS.canvas.pxratio;
    var cx = x * r, cy = y * r, R = radius * r;
    var ps = pJS.particles.array;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i], dx = p.x - cx, dy = p.y - cy, d = Math.sqrt(dx * dx + dy * dy);
      if (d >= R || d === 0) continue;
      var s = speed * r * (1 - d / R);
      p.kickX = (p.kickX || 0) + dx / d * s;
      p.kickY = (p.kickY || 0) + dy / d * s;
      // Turn the particle's own drift away from the click too, so when the
      // kick fades it carries on drifting instead of coming to a stop
      var v = Math.max(Math.sqrt(p.vx * p.vx + p.vy * p.vy), DRIFT_MIN);
      p.vx = dx / d * v;
      p.vy = dy / d * v;
    }
  }

  // Accelerate a particle toward the held pointer; damp it near the middle
  // so the pulled particles gather into a swirling knot instead of overshooting
  function pull(p, r, frames) {
    var dx = hold.x * r - p.x, dy = hold.y * r - p.y, d = Math.sqrt(dx * dx + dy * dy);
    var R = PULL_RADIUS * r;
    if (d >= R || d === 0) return;
    var a = PULL_ACCEL * r * frames * (0.35 + 0.65 * (1 - d / R));
    var kx = (p.kickX || 0) + dx / d * a, ky = (p.kickY || 0) + dy / d * a;
    if (d < 40 * r) { kx *= 0.9; ky *= 0.9; }
    var speed = Math.sqrt(kx * kx + ky * ky), max = PULL_MAX * r;
    if (speed > max) { kx *= max / speed; ky *= max / speed; }
    p.kickX = kx;
    p.kickY = ky;
  }

  function rippleKick(p, now, r) {
    for (var i = 0; i < ripples.length; i++) {
      var rp = ripples[i];
      if (p.rippleId === rp.id) continue;
      var dx = p.x - rp.x * r, dy = p.y - rp.y * r, d = Math.sqrt(dx * dx + dy * dy);
      var ring = RIPPLE_SPEED * (now - rp.start) * r;
      if (d === 0 || d > ring) continue;
      p.rippleId = rp.id;
      p.kickX = (p.kickX || 0) + dx / d * RIPPLE_KICK * r;
      p.kickY = (p.kickY || 0) + dy / d * RIPPLE_KICK * r;
    }
  }

  // Holds only start on empty background: not on controls, games, or text
  // (pressing and dragging on text should still select it)
  function onBackground(target) {
    return !(target.closest && target.closest(
      "a, button, input, select, textarea, label, summary, [contenteditable], " +
      ".navbar, .contact-menu, " + AVOID));
  }

  window.addEventListener("click", function (e) {
    if (swallowClick) { swallowClick = false; return; }
    if (!running() || reduced || form) return;
    push(e.clientX, e.clientY, PUSH_RADIUS, PUSH_SPEED);
  });

  window.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (!running() || reduced || form || !onBackground(e.target)) return;
    hold = { x: e.clientX, y: e.clientY, start: performance.now(), active: false };
  });

  window.addEventListener("pointermove", function (e) {
    if (hold) { hold.x = e.clientX; hold.y = e.clientY; }
  });

  function release(e) {
    if (!hold) return;
    if (hold.active && e.type === "pointerup") {
      push(hold.x, hold.y, PULL_RADIUS, BURST_SPEED);
      swallowClick = true;  // the click that follows this release isn't a push
      setTimeout(function () { swallowClick = false; }, 0);
    }
    hold = null;
    root.classList.remove("particles-pulling");
  }
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("blur", release);

  /* ── Konami code: "JN." in particles ── */

  var KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown",
                "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  var konamiAt = 0;

  window.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    var key = (e.key || "").toLowerCase();
    konamiAt = key === KONAMI[konamiAt] ? konamiAt + 1 : (key === KONAMI[0] ? 1 : 0);
    if (konamiAt === KONAMI.length) {
      konamiAt = 0;
      formLetters();
    }
  });

  // Spots on a grid inside "JN." drawn as large as fits the screen, with the
  // grid spacing chosen so there's one spot per particle
  function letterSpots(count) {
    var w = pJS.canvas.w, h = pJS.canvas.h;
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var ctx = c.getContext("2d");
    var size = Math.min(h * 0.45, w * 0.3);
    ctx.font = "800 " + size + "px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("JN.", w / 2, h / 2);
    var data = ctx.getImageData(0, 0, w, h).data;

    function sample(gap) {
      var spots = [];
      for (var y = Math.floor(gap / 2); y < h; y += gap) {
        for (var x = Math.floor(gap / 2); x < w; x += gap) {
          if (data[(y * w + x) * 4 + 3] > 128) spots.push({ x: x, y: y });
        }
      }
      return spots;
    }

    var lo = 2, hi = Math.ceil(size / 2), spots = sample(hi);
    while (hi - lo > 1) {  // the smallest gap that gives no more spots than particles
      var mid = (lo + hi) >> 1, s = sample(mid);
      if (s.length > count) lo = mid; else { hi = mid; spots = s; }
    }
    return { spots: spots, gap: hi };
  }

  function removeFadedExtras() {
    var ps = pJS.particles.array;
    for (var i = ps.length - 1; i >= 0; i--) {
      if (ps[i].extra && (ps[i].opacity <= 0 || reduced)) ps.splice(i, 1);
    }
  }

  function formLetters() {
    if (!running() || form) return;
    var ps = pJS.particles.array;
    // Top up to enough particles for solid-looking letters on this screen
    var want = Math.round(FORM_COUNT * window.innerWidth * window.innerHeight / (1280 * 900));
    var extra = Math.max(0, want - ps.length);
    if (extra) {
      pJS.fn.modes.pushParticles(extra);
      for (var e = ps.length - extra; e < ps.length; e++) {
        ps[e].extra = true;
        ps[e].vo = 0;  // opacity is ours to fade, not particles.js's to animate
      }
    }
    var layout = letterSpots(ps.length);
    var spots = layout.spots;
    if (!spots.length) return;

    // Pair particles and spots left to right so paths don't all cross
    var order = ps.slice().sort(function (a, b) { return a.x - b.x; });
    spots.sort(function (a, b) { return a.x - b.x; });
    order.forEach(function (p, i) {
      var s = spots[Math.floor(i * spots.length / order.length)];
      p.homeX = p.x; p.homeY = p.y;
      p.formX = s.x; p.formY = s.y;
    });

    form = {
      until: performance.now() + FORM_MS,
      linkDistance: pJS.particles.line_linked.distance,
      linkOpacity: pJS.particles.line_linked.opacity
    };
    // Short, bright links trace the letters like a constellation
    pJS.particles.line_linked.distance = layout.gap * 1.5;
    pJS.particles.line_linked.opacity = 0.6;
    ps.forEach(function (p) {
      p.homeOpacity = p.opacity;
      p.opacity = 0.95;
    });

    if (reduced) {
      // No gliding: jump into the letters, hold, then jump back
      ps.forEach(function (p) { p.x = p.formX; p.y = p.formY; p.avoidHidden = false; });
      pJS.fn.particlesDraw();
      setTimeout(scatter, FORM_MS);
    }
  }

  function scatter() {
    if (!form) return;
    pJS.particles.line_linked.distance = form.linkDistance;
    pJS.particles.line_linked.opacity = form.linkOpacity;
    form = null;
    pJS.particles.array.forEach(function (p) {
      if (!p.extra) p.opacity = p.homeOpacity;
    });
    if (reduced) {
      removeFadedExtras();
      pJS.particles.array.forEach(function (p) { p.x = p.homeX; p.y = p.homeY; });
      redrawStill();
      return;
    }
    var r = pJS.canvas.pxratio;
    push(pJS.canvas.w / r / 2, pJS.canvas.h / r / 2, Math.max(pJS.canvas.w, pJS.canvas.h) / r, BURST_SPEED);
  }

  /* ── Settings hooks ── */

  window.siteParticles = {
    setEnabled: function (on) {
      if (on === enabled && (pJS || !on)) return;
      enabled = on;
      if (on) start();
      if (!on && form) scatter();
      if (pJS) applyMotion();
    },
    setReduced: function (on) {
      if (on === reduced) return;
      reduced = on;
      if (on) { if (form) scatter(); release({ type: "cancel" }); ripples = []; }
      applyMotion();
    },
    setDensity: function (name) {
      if (name === density) return;
      density = name;
      if (!pJS) return;
      pJS.particles.number.value = Math.round(BASE_COUNT * (DENSITY[name] || 1));
      pJS.fn.vendors.densityAutoParticles();
      redrawStill();
    },
    ripple: function (x, y) {
      if (!running() || reduced) return;
      var diag = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight);
      ripples.push({ id: ++rippleCount, x: x, y: y, start: performance.now(), life: diag / RIPPLE_SPEED });
    }
  };

  function markDirty() {
    dirty = true;
    if (pJS && !pJS.particles.move.enable) requestAnimationFrame(redrawStill);
  }
  window.addEventListener("scroll", markDirty, { passive: true });
  window.addEventListener("resize", markDirty);

  if (enabled) start();
})();
