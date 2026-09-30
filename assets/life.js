/* ── Conway's Game of Life ──
   A COLS × ROWS grid in two Uint8Arrays (current and next, swapped each
   generation). Edges either wrap (a torus) or are dead. The simulation
   notices when the pattern dies out, freezes, or settles into a
   period-2 oscillation. Game logic never touches the DOM; draw() turns
   state into pixels. */
(function() {
  'use strict';

  var root = document.getElementById('lf-game');
  if (!root) return;

  var el = {
    wrap: document.getElementById('lf-wrap'),
    board: document.getElementById('lf-board'),
    play: document.getElementById('lf-play'),
    step: document.getElementById('lf-step'),
    clear: document.getElementById('lf-clear'),
    random: document.getElementById('lf-random'),
    pattern: document.getElementById('lf-pattern'),
    speed: document.getElementById('lf-speed'),
    speedOut: document.getElementById('lf-speed-out'),
    edges: document.getElementById('lf-edges'),
    gen: document.getElementById('lf-gen'),
    pop: document.getElementById('lf-pop'),
    status: document.getElementById('lf-status')
  };

  var COLS = 64, ROWS = 40, N = COLS * ROWS;
  var RANDOM_FILL = 0.28;
  var STORE_PREFIX = 'jn.life.v1.';

  // Patterns as rows of '.' (dead) and 'O' (alive)
  var PATTERNS = {
    glider: ['.O.', '..O', 'OOO'],
    lwss: ['.O..O', 'O....', 'O...O', 'OOOO.'],
    pulsar: [
      '..OOO...OOO..', '.............', 'O....O.O....O', 'O....O.O....O',
      'O....O.O....O', '..OOO...OOO..', '.............', '..OOO...OOO..',
      'O....O.O....O', 'O....O.O....O', 'O....O.O....O', '.............',
      '..OOO...OOO..'
    ],
    pentadecathlon: ['..O....O..', 'OO.OOOO.OO', '..O....O..'],
    gun: [
      '........................O...........',
      '......................O.O...........',
      '............OO......OO............OO',
      '...........O...O....OO............OO',
      'OO........O.....O...OO..............',
      'OO........O...O.OO....O.O...........',
      '..........O.....O.......O...........',
      '...........O...O....................',
      '............OO......................'
    ],
    rpentomino: ['.OO', 'OO.', '.O.'],
    acorn: ['.O.....', '...O...', 'OO..OOO'],
    diehard: ['......O.', 'OO......', '.O...OOO']
  };

  /* ═══════════════════════════════════════════
     Storage (settings only)
     ═══════════════════════════════════════════ */

  function storeGet(key) {
    try { return window.localStorage.getItem(STORE_PREFIX + key); } catch (e) { return null; }
  }

  function storeSet(key, value) {
    try { window.localStorage.setItem(STORE_PREFIX + key, value); }
    catch (e) { /* storage unavailable: nothing persists, game still works */ }
  }

  /* ═══════════════════════════════════════════
     Simulation (no DOM access)
     ═══════════════════════════════════════════ */

  var sim = {
    cells: new Uint8Array(N),
    next: new Uint8Array(N),
    prev: new Uint8Array(N),   // two generations back, for period-2 detection
    age: new Uint16Array(N),   // generations each live cell has survived
    wrap: storeGet('edges') !== 'dead',
    gen: 0,
    pop: 0,
    running: false,
    speed: clampSpeed(Number(storeGet('speed')) || 10), // generations per second
    settled: ''                // '' | 'empty' | 'still' | 'period2'
  };

  function clampSpeed(v) {
    return Math.max(1, Math.min(30, Math.round(v)));
  }

  function countPop() {
    var n = 0;
    for (var i = 0; i < N; i++) n += sim.cells[i];
    sim.pop = n;
  }

  function resetHistory() {
    sim.gen = 0;
    sim.settled = '';
    sim.prev.fill(2); // matches nothing
    for (var i = 0; i < N; i++) sim.age[i] = sim.cells[i] ? 1 : 0;
    countPop();
  }

  function clearCells() {
    sim.cells.fill(0);
    resetHistory();
  }

  function randomize() {
    for (var i = 0; i < N; i++) sim.cells[i] = Math.random() < RANDOM_FILL ? 1 : 0;
    resetHistory();
  }

  function loadPattern(name) {
    var rows = PATTERNS[name];
    if (!rows) return;
    sim.cells.fill(0);
    var h = rows.length, w = rows[0].length;
    var top = ((ROWS - h) / 2) | 0, left = ((COLS - w) / 2) | 0;
    // The gun is wide; keep its gliders' path clear by starting it top-left
    if (name === 'gun') { top = 2; left = 2; }
    for (var r = 0; r < h; r++) {
      for (var c = 0; c < w; c++) {
        if (rows[r][c] === 'O') sim.cells[(top + r) * COLS + left + c] = 1;
      }
    }
    resetHistory();
  }

  function setCell(i, v) {
    if (sim.cells[i] === v) return false;
    sim.cells[i] = v;
    sim.age[i] = v;
    sim.pop += v ? 1 : -1;
    // A hand edit means any "settled" verdict no longer holds
    sim.settled = '';
    sim.prev.fill(2);
    return true;
  }

  function equal(a, b) {
    for (var i = 0; i < N; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function step() {
    var cur = sim.cells, nxt = sim.next, wrap = sim.wrap;
    for (var r = 0; r < ROWS; r++) {
      var up = r - 1, down = r + 1;
      if (wrap) { up = (up + ROWS) % ROWS; down = down % ROWS; }
      for (var c = 0; c < COLS; c++) {
        var left = c - 1, right = c + 1;
        if (wrap) { left = (left + COLS) % COLS; right = right % COLS; }
        var n = 0;
        if (up >= 0) {
          if (left >= 0) n += cur[up * COLS + left];
          n += cur[up * COLS + c];
          if (right < COLS) n += cur[up * COLS + right];
        }
        if (left >= 0) n += cur[r * COLS + left];
        if (right < COLS) n += cur[r * COLS + right];
        if (down < ROWS) {
          if (left >= 0) n += cur[down * COLS + left];
          n += cur[down * COLS + c];
          if (right < COLS) n += cur[down * COLS + right];
        }
        var i = r * COLS + c;
        nxt[i] = n === 3 || (n === 2 && cur[i]) ? 1 : 0;
      }
    }

    var still = equal(nxt, cur);
    var period2 = !still && equal(nxt, sim.prev);

    // Rotate buffers: prev ← cur, cur ← next
    var oldPrev = sim.prev;
    sim.prev = cur;
    sim.cells = nxt;
    sim.next = oldPrev;

    for (var k = 0; k < N; k++) {
      sim.age[k] = sim.cells[k] ? Math.min(sim.age[k] + 1, 65535) : 0;
    }
    sim.gen++;
    countPop();
    sim.settled = sim.pop === 0 ? 'empty' : still ? 'still' : period2 ? 'period2' : '';
  }

  /* ═══════════════════════════════════════════
     Loop
     ═══════════════════════════════════════════ */

  var rafId = 0, lastTime = 0, acc = 0;

  function frame(now) {
    rafId = 0;
    if (!sim.running) return;
    var dt = lastTime ? Math.min(now - lastTime, 250) : 0;
    lastTime = now;
    acc += dt;
    var interval = 1000 / sim.speed;
    var stepped = false;
    while (acc >= interval && sim.running) {
      acc -= interval;
      step();
      stepped = true;
      // Nothing more will happen: stop instead of spinning
      if (sim.settled === 'empty' || sim.settled === 'still') setRunning(false);
    }
    if (stepped) render();
    if (sim.running) rafId = requestAnimationFrame(frame);
  }

  function setRunning(on) {
    if (on && sim.pop === 0) {
      setStatus('Draw some cells or pick a pattern first.');
      return;
    }
    sim.running = on;
    if (on) {
      lastTime = 0;
      acc = 1000 / sim.speed; // take the first step right away
      if (!rafId) rafId = requestAnimationFrame(frame);
    } else if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    render();
  }

  /* ═══════════════════════════════════════════
     Rendering
     ═══════════════════════════════════════════ */

  var ctx = el.board.getContext('2d');
  var cell = 8;
  var palette = {};
  var hover = -1;

  function readPalette() {
    var cs = getComputedStyle(root);
    function v(name) { return cs.getPropertyValue(name).trim(); }
    palette = {bg: v('--lf-bg'), grid: v('--lf-grid'), live: v('--lf-live'),
               young: v('--lf-young'), hover: v('--lf-hover')};
  }

  function layout() {
    var availW = el.wrap.clientWidth;
    cell = Math.max(4, Math.floor(availW / COLS));
    var w = cell * COLS, h = cell * ROWS;
    var dpr = window.devicePixelRatio || 1;
    el.board.style.width = w + 'px';
    el.board.style.height = h + 'px';
    el.board.width = Math.round(w * dpr);
    el.board.height = Math.round(h * dpr);
    ctx.setTransform(el.board.width / w, 0, 0, el.board.height / h, 0, 0);
    draw();
  }

  function draw() {
    var w = cell * COLS, h = cell * ROWS;
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, w, h);

    if (cell >= 6) {
      ctx.fillStyle = palette.grid;
      for (var gx = 1; gx < COLS; gx++) ctx.fillRect(gx * cell, 0, 1, h);
      for (var gy = 1; gy < ROWS; gy++) ctx.fillRect(0, gy * cell, w, 1);
    }

    var pad = cell >= 6 ? 1 : 0;
    var size = cell - pad * 2;
    // Cells born this generation are brighter, so motion is easy to follow
    for (var pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? palette.young : palette.live;
      for (var i = 0; i < N; i++) {
        if (!sim.cells[i]) continue;
        var young = sim.age[i] <= 1;
        if (young !== !!pass) continue;
        ctx.fillRect((i % COLS) * cell + pad, ((i / COLS) | 0) * cell + pad, size, size);
      }
    }

    if (hover >= 0 && !drawing) {
      ctx.strokeStyle = palette.hover;
      ctx.lineWidth = 1.5;
      ctx.strokeRect((hover % COLS) * cell + 0.75, ((hover / COLS) | 0) * cell + 0.75, cell - 1.5, cell - 1.5);
    }
  }

  var shown = {};
  function setText(node, key, value) {
    if (shown[key] === value) return;
    shown[key] = value;
    node.textContent = value;
  }

  var SETTLED_MSG = {
    empty: 'Everything died out.',
    still: 'Settled into a still life.',
    period2: 'Settled into a blinking (period 2) pattern.'
  };

  function render() {
    draw();
    setText(el.gen, 'gen', String(sim.gen));
    setText(el.pop, 'pop', String(sim.pop));
    setText(el.play, 'play', sim.running ? 'Pause' : 'Play');
    el.play.setAttribute('aria-pressed', sim.running ? 'true' : 'false');
    root.dataset.running = sim.running ? 'true' : 'false';
    if (sim.settled) setStatus(SETTLED_MSG[sim.settled] + ' Generation ' + sim.gen + '.');
  }

  function setStatus(msg) {
    setText(el.status, 'status', msg);
  }

  /* ═══════════════════════════════════════════
     Drawing on the board
     ═══════════════════════════════════════════ */

  var drawing = null; // {id, value, last}

  function cellAt(e) {
    var rect = el.board.getBoundingClientRect();
    var c = Math.floor((e.clientX - rect.left) / (rect.width / COLS));
    var r = Math.floor((e.clientY - rect.top) / (rect.height / ROWS));
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
    return r * COLS + c;
  }

  // Fills every cell on the line from a to b, so fast strokes leave no gaps
  function paintLine(a, b, value) {
    var x0 = a % COLS, y0 = (a / COLS) | 0, x1 = b % COLS, y1 = (b / COLS) | 0;
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (;;) {
      setCell(y0 * COLS + x0, value);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  el.board.addEventListener('pointerdown', function(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    var i = cellAt(e);
    if (i < 0) return;
    e.preventDefault();
    try { el.board.setPointerCapture(e.pointerId); } catch (err) { /* pointer gone */ }
    el.board.focus({preventScroll: true});
    // The first cell decides whether this stroke draws or erases
    drawing = {id: e.pointerId, value: sim.cells[i] ? 0 : 1, last: i};
    setCell(i, drawing.value);
    setStatus('');
    render();
  });

  el.board.addEventListener('pointermove', function(e) {
    var i = cellAt(e);
    if (drawing && e.pointerId === drawing.id) {
      if (i >= 0 && i !== drawing.last) {
        paintLine(drawing.last, i, drawing.value);
        drawing.last = i;
        render();
      }
      return;
    }
    if (e.pointerType === 'mouse' && i !== hover) {
      hover = i;
      draw();
    }
  });

  function endDraw(e) {
    if (drawing && e.pointerId === drawing.id) drawing = null;
  }
  el.board.addEventListener('pointerup', endDraw);
  el.board.addEventListener('pointercancel', endDraw);
  el.board.addEventListener('pointerleave', function() {
    if (hover >= 0) { hover = -1; draw(); }
  });

  /* ═══════════════════════════════════════════
     Controls
     ═══════════════════════════════════════════ */

  function doStep() {
    setRunning(false);
    step();
    if (!sim.settled) setStatus('');
    render();
  }

  el.play.addEventListener('click', function() { setRunning(!sim.running); });
  el.step.addEventListener('click', doStep);
  el.clear.addEventListener('click', function() {
    setRunning(false);
    clearCells();
    el.pattern.value = '';
    setStatus('');
    render();
  });
  el.random.addEventListener('click', function() {
    randomize();
    el.pattern.value = '';
    setStatus('');
    render();
  });
  el.pattern.addEventListener('change', function() {
    if (!el.pattern.value) return;
    setRunning(false);
    loadPattern(el.pattern.value);
    setStatus('');
    render();
  });

  function showSpeed() {
    el.speed.value = sim.speed;
    el.speedOut.textContent = sim.speed + '/s';
  }
  el.speed.addEventListener('input', function() {
    sim.speed = clampSpeed(Number(el.speed.value));
    storeSet('speed', sim.speed);
    showSpeed();
  });

  el.edges.checked = sim.wrap;
  el.edges.addEventListener('change', function() {
    sim.wrap = el.edges.checked;
    storeSet('edges', sim.wrap ? 'wrap' : 'dead');
    sim.settled = '';
    sim.prev.fill(2);
    setStatus('');
  });

  // Shortcuts work while the board (or nothing in particular) has focus.
  // Space only when the board is focused, so it still scrolls the page
  // otherwise.
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    var onBoard = e.target === el.board;
    if (!onBoard && e.target !== document.body) return;
    var k = e.key.toLowerCase();
    if (k === ' ' && onBoard) setRunning(!sim.running);
    else if (k === 'enter' && onBoard) setRunning(!sim.running);
    else if (k === 's' || (k === 'arrowright' && onBoard)) doStep();
    else if (k === 'c') el.clear.click();
    else if (k === 'r') el.random.click();
    else return;
    e.preventDefault();
  });

  // Don't burn CPU in a background tab
  document.addEventListener('visibilitychange', function() {
    if (document.hidden && sim.running) setRunning(false);
  });

  new MutationObserver(function() {
    readPalette();
    draw();
  }).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});

  var resizeRaf = 0;
  function scheduleLayout() {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(function() {
      resizeRaf = 0;
      layout();
    });
  }
  window.addEventListener('resize', scheduleLayout);
  window.addEventListener('load', scheduleLayout);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleLayout).observe(el.wrap);

  readPalette();
  showSpeed();
  loadPattern('gun');
  el.pattern.value = 'gun';
  layout();
  render();
})();
