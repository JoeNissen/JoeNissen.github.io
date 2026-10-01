/* ── Tetris ──
   Guideline-style rules: 7-bag randomizer, SRS rotation with wall kicks,
   hold, ghost piece, 500 ms lock delay (15 resets per piece), and DAS/ARR
   key repeat so held keys behave the same in every browser.
   State machine: idle → playing ⇄ paused → over.
   The playfield is 10 × 22; the top two rows are hidden spawn space. Game
   logic never touches the DOM; draw functions turn state into pixels. */
(function() {
  'use strict';

  var root = document.getElementById('tt-game');
  if (!root) return;

  var el = {
    layout: document.getElementById('tt-layout'),
    well: document.getElementById('tt-well'),
    board: document.getElementById('tt-board'),
    hold: document.getElementById('tt-hold'),
    next: document.getElementById('tt-next'),
    score: document.getElementById('tt-score'),
    level: document.getElementById('tt-level'),
    lines: document.getElementById('tt-lines'),
    best: document.getElementById('tt-best'),
    overlay: document.getElementById('tt-overlay'),
    overlayTitle: document.getElementById('tt-overlay-title'),
    overlayMsg: document.getElementById('tt-overlay-msg'),
    overlayBtn: document.getElementById('tt-overlay-btn'),
    newGame: document.getElementById('tt-new'),
    pause: document.getElementById('tt-pause'),
    touch: document.getElementById('tt-touch'),
    status: document.getElementById('tt-status')
  };

  var COLS = 10, ROWS = 22, HIDDEN = 2, VISIBLE = ROWS - HIDDEN;
  var DAS_MS = 167;          // hold this long before auto-repeat starts
  var ARR_MS = 33;           // then move one column this often
  var SOFT_MS = 33;          // soft drop speed, ms per row
  var LOCK_MS = 500;
  var MAX_RESETS = 15;       // moves that can restart the lock timer per row reached
  var NEXT_SHOWN = 3;
  var LINE_POINTS = [0, 100, 300, 500, 800];
  var LINE_NAMES = ['', 'Single', 'Double', 'Triple', 'Tetris!'];
  var STORE_PREFIX = 'jn.tetris.v1.';
  var TYPES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

  // Spawn orientations; the other three are rotations of the bounding box
  var SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
  };

  // SRS wall kicks as (x, y) with y pointing up, keyed "from→to" rotation
  var KICKS = {
    '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '10': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '12': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '21': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '23': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '32': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '30': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
  };
  var KICKS_I = {
    '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '10': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '12': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    '21': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '23': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '32': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '30': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
  };

  // CELLS[type][rot] = [[x, y], ...] offsets within the bounding box
  var CELLS = {};
  TYPES.forEach(function(t) {
    var m = SHAPES[t];
    CELLS[t] = [];
    for (var r = 0; r < 4; r++) {
      var list = [];
      for (var y = 0; y < m.length; y++) {
        for (var x = 0; x < m.length; x++) if (m[y][x]) list.push([x, y]);
      }
      CELLS[t].push(list);
      m = rotateCW(m);
    }
  });

  function rotateCW(m) {
    var n = m.length, out = [];
    for (var y = 0; y < n; y++) {
      out.push([]);
      for (var x = 0; x < n; x++) out[y].push(m[n - 1 - x][y]);
    }
    return out;
  }

  var reduceMotion = document.documentElement.classList.contains('reduce-motion');
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  /* ═══════════════════════════════════════════
     Storage (best score)
     ═══════════════════════════════════════════ */

  function storeGet(key) {
    try { return window.localStorage.getItem(STORE_PREFIX + key); } catch (e) { return null; }
  }

  function storeSet(key, value) {
    try { window.localStorage.setItem(STORE_PREFIX + key, value); }
    catch (e) { /* storage unavailable: nothing persists, game still works */ }
  }

  /* ═══════════════════════════════════════════
     Game state and logic (no DOM access)
     ═══════════════════════════════════════════ */

  var game = {
    status: 'idle',     // 'idle' | 'playing' | 'paused' | 'over'
    board: new Uint8Array(COLS * ROWS), // 0 = empty, else TYPES index + 1
    piece: null,        // {type, rot, x, y}
    hold: null,
    holdUsed: false,
    queue: [],
    bag: [],
    score: 0,
    level: 1,
    lines: 0,
    combo: -1,
    b2b: false,
    best: Number(storeGet('best')) || 0,
    startBest: 0,
    gravityAcc: 0,
    lockTimer: 0,
    lockResets: 0,
    lowestY: 0,
    flash: null         // {rows: [visible row indexes], t} line-clear highlight
  };

  // Keys (or touch buttons) currently held, for DAS and soft drop
  var held = {left: false, right: false, down: false};
  var das = {dir: 0, timer: 0, arr: 0};

  function fits(type, rot, x, y) {
    var cells = CELLS[type][rot];
    for (var i = 0; i < cells.length; i++) {
      var bx = x + cells[i][0], by = y + cells[i][1];
      if (bx < 0 || bx >= COLS || by >= ROWS) return false;
      if (by >= 0 && game.board[by * COLS + bx]) return false;
    }
    return true;
  }

  function pieceFits(dx, dy) {
    var p = game.piece;
    return fits(p.type, p.rot, p.x + dx, p.y + dy);
  }

  function grounded() {
    return !pieceFits(0, 1);
  }

  function takeFromBag() {
    if (!game.bag.length) {
      game.bag = TYPES.slice();
      for (var i = game.bag.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = game.bag[i]; game.bag[i] = game.bag[j]; game.bag[j] = tmp;
      }
    }
    return game.bag.pop();
  }

  function nextType() {
    var t = game.queue.shift();
    while (game.queue.length < NEXT_SHOWN) game.queue.push(takeFromBag());
    return t;
  }

  // Spawn with the piece's top row on the first visible row, so it's always
  // on screen. If the stack is in the way, try the hidden rows above; if
  // nothing fits, the game is over (block out).
  function spawn(type) {
    var x = type === 'O' ? 4 : 3;
    var y = type === 'I' ? HIDDEN - 1 : HIDDEN;
    for (var tries = 0; tries <= HIDDEN; tries++, y--) {
      if (fits(type, 0, x, y)) {
        game.piece = {type: type, rot: 0, x: x, y: y};
        game.gravityAcc = 0;
        game.lockTimer = 0;
        game.lockResets = 0;
        game.lowestY = y;
        return true;
      }
    }
    game.piece = {type: type, rot: 0, x: x, y: y + 1};
    endGame();
    return false;
  }

  function newGame() {
    game.board = new Uint8Array(COLS * ROWS);
    game.bag = [];
    game.queue = [];
    while (game.queue.length < NEXT_SHOWN) game.queue.push(takeFromBag());
    game.hold = null;
    game.holdUsed = false;
    game.score = 0;
    game.level = 1;
    game.lines = 0;
    game.combo = -1;
    game.b2b = false;
    game.best = Number(storeGet('best')) || 0;
    game.startBest = game.best;
    game.flash = null;
    game.status = 'playing';
    spawn(nextType());
  }

  // A successful move or rotation while resting on the stack restarts the
  // lock timer, a limited number of times per new row reached
  function afterShift() {
    if (grounded() && game.lockResets < MAX_RESETS) {
      game.lockTimer = 0;
      game.lockResets++;
    }
  }

  function shift(dx) {
    if (!pieceFits(dx, 0)) return false;
    game.piece.x += dx;
    afterShift();
    return true;
  }

  function rotate(dir) {
    var p = game.piece;
    if (p.type === 'O') return false;
    var to = (p.rot + dir + 4) % 4;
    var kicks = (p.type === 'I' ? KICKS_I : KICKS)['' + p.rot + to];
    for (var k = 0; k < kicks.length; k++) {
      var nx = p.x + kicks[k][0], ny = p.y - kicks[k][1];
      if (fits(p.type, to, nx, ny)) {
        p.rot = to;
        p.x = nx;
        p.y = ny;
        noteLowest();
        afterShift();
        return true;
      }
    }
    return false;
  }

  function noteLowest() {
    if (game.piece.y > game.lowestY) {
      game.lowestY = game.piece.y;
      game.lockResets = 0;
    }
  }

  function stepDown() {
    if (!pieceFits(0, 1)) return false;
    game.piece.y++;
    game.lockTimer = 0;
    noteLowest();
    return true;
  }

  function hardDrop() {
    var n = 0;
    while (stepDown()) n++;
    game.score += 2 * n;
    lock();
  }

  function holdPiece() {
    if (game.holdUsed) return false;
    var current = game.piece.type;
    var swap = game.hold;
    game.hold = current;
    game.holdUsed = true;
    spawn(swap || nextType());
    return true;
  }

  function lock() {
    var p = game.piece, cells = CELLS[p.type][p.rot];
    var id = TYPES.indexOf(p.type) + 1;
    var allHidden = true;
    for (var i = 0; i < cells.length; i++) {
      var bx = p.x + cells[i][0], by = p.y + cells[i][1];
      if (by >= 0) game.board[by * COLS + bx] = id;
      if (by >= HIDDEN) allHidden = false;
    }
    game.piece = null;

    // Lock out: the whole piece came to rest above the visible field
    if (allHidden) return endGame();

    var cleared = clearLines();
    score(cleared.length);
    if (cleared.length) {
      game.flash = {rows: cleared, t: 0};
      announce(LINE_NAMES[cleared.length]);
    }
    game.holdUsed = false;
    spawn(nextType());
  }

  // Removes full rows; returns the visible row indexes they occupied
  function clearLines() {
    var board = game.board, full = [];
    for (var r = 0; r < ROWS; r++) {
      var isFull = true;
      for (var c = 0; c < COLS; c++) if (!board[r * COLS + c]) { isFull = false; break; }
      if (isFull) full.push(r);
    }
    if (!full.length) return full;
    var next = new Uint8Array(COLS * ROWS);
    var dst = ROWS - 1;
    for (var src = ROWS - 1; src >= 0; src--) {
      if (full.indexOf(src) !== -1) continue;
      next.set(board.subarray(src * COLS, src * COLS + COLS), dst * COLS);
      dst--;
    }
    game.board = next;
    return full.map(function(r) { return r - HIDDEN; });
  }

  function score(n) {
    if (!n) {
      game.combo = -1;
      return;
    }
    var pts = LINE_POINTS[n] * game.level;
    if (n === 4) {
      if (game.b2b) pts *= 1.5;  // back-to-back Tetris
      game.b2b = true;
    } else {
      game.b2b = false;
    }
    game.combo++;
    if (game.combo > 0) pts += 50 * game.combo * game.level;
    game.score += Math.floor(pts);
    game.lines += n;
    game.level = Math.floor(game.lines / 10) + 1;
  }

  // Guideline gravity: seconds per row = (0.8 - (level - 1) * 0.007)^(level - 1)
  function gravityMs() {
    var lv = Math.min(game.level, 20) - 1;
    return Math.pow(0.8 - lv * 0.007, lv) * 1000;
  }

  function endGame() {
    game.status = 'over';
    clearHeld();
    if (game.score > game.best) {
      game.best = game.score;
      storeSet('best', game.best);
    }
  }

  // Advances the game by dt milliseconds
  function update(dt) {
    if (game.flash) {
      game.flash.t += dt;
      if (game.flash.t > 250) game.flash = null;
    }

    // Horizontal auto-repeat
    if (das.dir) {
      das.timer += dt;
      if (das.timer >= DAS_MS) {
        das.arr += dt;
        while (das.arr >= ARR_MS) {
          das.arr -= ARR_MS;
          if (!shift(das.dir)) { das.arr = 0; break; }
        }
      }
    }

    // Gravity, or soft drop while ↓ is held (1 point per row)
    var interval = gravityMs();
    var soft = held.down && interval > SOFT_MS;
    if (soft) interval = SOFT_MS;
    game.gravityAcc += dt;
    while (game.gravityAcc >= interval) {
      game.gravityAcc -= interval;
      if (!stepDown()) { game.gravityAcc = 0; break; }
      if (soft) game.score++;
    }

    // Lock delay, skipped while soft dropping so ↓ lands and locks
    if (grounded()) {
      game.lockTimer += dt;
      if (game.lockTimer >= LOCK_MS || held.down) lock();
    } else {
      game.lockTimer = 0;
    }
  }

  /* ═══════════════════════════════════════════
     Actions (shared by keyboard and touch)
     ═══════════════════════════════════════════ */

  function press(action) {
    if (game.status !== 'playing') return;
    switch (action) {
      case 'left':
      case 'right':
        var dir = action === 'left' ? -1 : 1;
        held[action] = true;
        das.dir = dir;
        das.timer = 0;
        das.arr = 0;
        shift(dir);
        break;
      case 'down':
        held.down = true;
        // Move a row right away so a tap feels responsive; on the stack
        // already, ↓ locks the piece instead of waiting out the lock delay
        if (stepDown()) game.score++;
        else lock();
        game.gravityAcc = 0;
        break;
      case 'cw': rotate(1); break;
      case 'ccw': rotate(-1); break;
      case 'drop': hardDrop(); break;
      case 'hold': holdPiece(); break;
    }
    if (game.status === 'over') showOverlay();
    render();
  }

  function release(action) {
    if (action === 'down') held.down = false;
    if (action !== 'left' && action !== 'right') return;
    held[action] = false;
    // Fall back to the other direction if it's still held
    var other = action === 'left' ? 'right' : 'left';
    if (held[other]) {
      das.dir = other === 'left' ? -1 : 1;
      das.timer = 0;
      das.arr = 0;
    } else {
      das.dir = 0;
    }
  }

  function clearHeld() {
    held.left = held.right = held.down = false;
    das.dir = 0;
  }

  /* ═══════════════════════════════════════════
     Loop and flow
     ═══════════════════════════════════════════ */

  var rafId = 0, lastTime = 0;

  function frame(now) {
    rafId = 0;
    if (game.status !== 'playing') return;
    // Clamp so a hitch (or a background tab) can't drop the piece many rows
    var dt = lastTime ? Math.min(now - lastTime, 100) : 0;
    lastTime = now;
    update(dt);
    render();
    if (game.status === 'over') showOverlay();
    else rafId = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    lastTime = 0;
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    newGame();
    hideOverlay();
    announce('');
    focusBoard();
    render();
    if (game.status === 'over') showOverlay();
    else startLoop();
  }

  function pause() {
    if (game.status !== 'playing') return;
    game.status = 'paused';
    clearHeld();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    showOverlay();
    render();
  }

  function resume() {
    if (game.status !== 'paused') return;
    game.status = 'playing';
    hideOverlay();
    focusBoard();
    render();
    startLoop();
  }

  function togglePause() {
    if (game.status === 'playing') pause();
    else if (game.status === 'paused') resume();
  }

  /* ═══════════════════════════════════════════
     Rendering
     ═══════════════════════════════════════════ */

  var ctx = el.board.getContext('2d');
  var holdCtx = el.hold.getContext('2d');
  var nextCtx = el.next.getContext('2d');
  var cell = 24;
  var nextShown = NEXT_SHOWN;
  var palette = {};

  function readPalette() {
    var cs = getComputedStyle(root);
    function v(name) { return cs.getPropertyValue(name).trim(); }
    palette = {bg: v('--tt-bg'), grid: v('--tt-grid'), flash: v('--tt-flash'), colors: {}};
    TYPES.forEach(function(t) { palette.colors[t] = v('--tt-' + t); });
  }

  function sizeCanvas(canvas, c, w, h) {
    var dpr = window.devicePixelRatio || 1;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    c.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
  }

  // Fits the whole well on screen: as wide as the card allows, and short
  // enough that the board plus the controls around it fit the viewport
  function layout() {
    var narrow = root.clientWidth < 560;
    root.classList.toggle('is-narrow', narrow);
    var width = el.layout.clientWidth;
    var availW = narrow ? width - 8 : width - 2 * 112 - 2 * 16;
    // Room for the navbar, buttons and help (and on phones the hold/next
    // row and touch buttons) so the whole game fits on screen at once
    var reserve = narrow ? 180 + (el.touch.offsetHeight ? el.touch.offsetHeight + 16 : 0) + 90 : 190;
    var availH = window.innerHeight - reserve;
    cell = Math.floor(Math.min(availW / COLS, availH / VISIBLE));
    cell = Math.max(14, Math.min(32, cell));
    root.style.setProperty('--tt-cell', cell + 'px');

    sizeCanvas(el.board, ctx, cell * COLS, cell * VISIBLE);
    // Phones show one upcoming piece in a compact row above the well
    nextShown = narrow ? 1 : NEXT_SHOWN;
    var mini = narrow ? 12 : Math.max(12, Math.min(18, Math.round(cell * 0.7)));
    sizeCanvas(el.hold, holdCtx, mini * 4.5, mini * 3);
    sizeCanvas(el.next, nextCtx, mini * 4.5, mini * 3 * nextShown);
    render();
  }

  function drawBlock(c, x, y, s, color, alpha) {
    var inset = Math.max(1, Math.round(s * 0.06));
    var bevel = Math.max(2, Math.round(s * 0.16));
    var w = s - inset * 2;
    c.globalAlpha = alpha == null ? 1 : alpha;
    c.fillStyle = color;
    c.fillRect(x + inset, y + inset, w, w);
    c.fillStyle = 'rgba(255,255,255,0.28)';
    c.fillRect(x + inset, y + inset, w, bevel);
    c.fillStyle = 'rgba(255,255,255,0.14)';
    c.fillRect(x + inset, y + inset + bevel, bevel, w - bevel);
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fillRect(x + inset, y + inset + w - bevel, w, bevel);
    c.globalAlpha = 1;
  }

  function drawGhost(c, x, y, s, color) {
    var inset = Math.max(1, Math.round(s * 0.06));
    c.globalAlpha = 0.18;
    c.fillStyle = color;
    c.fillRect(x + inset, y + inset, s - 2 * inset, s - 2 * inset);
    c.globalAlpha = 0.7;
    c.strokeStyle = color;
    c.lineWidth = 1.5;
    c.strokeRect(x + inset + 0.75, y + inset + 0.75, s - 2 * inset - 1.5, s - 2 * inset - 1.5);
    c.globalAlpha = 1;
  }

  function drawBoard() {
    var w = cell * COLS, h = cell * VISIBLE;
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = palette.grid;
    for (var gx = 1; gx < COLS; gx++) ctx.fillRect(gx * cell, 0, 1, h);
    for (var gy = 1; gy < VISIBLE; gy++) ctx.fillRect(0, gy * cell, w, 1);

    if (game.flash && !reduceMotion) {
      ctx.globalAlpha = 0.5 * (1 - game.flash.t / 250);
      ctx.fillStyle = palette.flash;
      game.flash.rows.forEach(function(r) {
        if (r >= 0) ctx.fillRect(0, r * cell, w, cell);
      });
      ctx.globalAlpha = 1;
    }

    for (var r = HIDDEN; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var v = game.board[r * COLS + c];
        if (v) drawBlock(ctx, c * cell, (r - HIDDEN) * cell, cell, palette.colors[TYPES[v - 1]]);
      }
    }

    var p = game.piece;
    if (!p || game.status === 'idle') return;
    var cells = CELLS[p.type][p.rot], color = palette.colors[p.type];

    if (game.status !== 'over') {
      var gy2 = p.y;
      while (fits(p.type, p.rot, p.x, gy2 + 1)) gy2++;
      if (gy2 !== p.y) {
        cells.forEach(function(o) {
          var y = gy2 + o[1] - HIDDEN;
          if (y >= 0) drawGhost(ctx, (p.x + o[0]) * cell, y * cell, cell, color);
        });
      }
    }

    // Fade the piece as the lock timer runs down, so the lock isn't a surprise
    var alpha = 1;
    if (game.status === 'playing' && game.lockTimer > 0 && !reduceMotion) {
      alpha = 1 - 0.35 * (game.lockTimer / LOCK_MS);
    }
    cells.forEach(function(o) {
      var y = p.y + o[1] - HIDDEN;
      if (y >= 0) drawBlock(ctx, (p.x + o[0]) * cell, y * cell, cell, color, alpha);
    });
  }

  // Draws a piece centred in a slot of the hold/next panels
  function drawMini(c, type, slotY, slotW, slotH, s, dim) {
    var cells = CELLS[type][0];
    var minX = 9, maxX = -1, minY = 9, maxY = -1;
    cells.forEach(function(o) {
      minX = Math.min(minX, o[0]); maxX = Math.max(maxX, o[0]);
      minY = Math.min(minY, o[1]); maxY = Math.max(maxY, o[1]);
    });
    var ox = (slotW - (maxX - minX + 1) * s) / 2 - minX * s;
    var oy = slotY + (slotH - (maxY - minY + 1) * s) / 2 - minY * s;
    cells.forEach(function(o) {
      drawBlock(c, ox + o[0] * s, oy + o[1] * s, s, palette.colors[type], dim ? 0.35 : 1);
    });
  }

  function drawSide() {
    var hw = parseFloat(el.hold.style.width), hh = parseFloat(el.hold.style.height);
    var s = hh / 3;
    holdCtx.clearRect(0, 0, hw, hh);
    if (game.hold) drawMini(holdCtx, game.hold, 0, hw, hh, s, game.holdUsed);

    var nw = parseFloat(el.next.style.width), nh = parseFloat(el.next.style.height);
    nextCtx.clearRect(0, 0, nw, nh);
    if (game.status === 'idle') return;
    var slot = nh / nextShown;
    for (var i = 0; i < nextShown; i++) {
      if (game.queue[i]) drawMini(nextCtx, game.queue[i], i * slot, nw, slot, s, false);
    }
  }

  var shown = {};
  function setText(node, key, value) {
    if (shown[key] === value) return;
    shown[key] = value;
    node.textContent = value;
  }

  function render() {
    drawBoard();
    drawSide();
    setText(el.score, 'score', game.score.toLocaleString());
    setText(el.level, 'level', String(game.level));
    setText(el.lines, 'lines', String(game.lines));
    setText(el.best, 'best', Math.max(game.best, game.score).toLocaleString());
    el.pause.disabled = game.status !== 'playing' && game.status !== 'paused';
    setText(el.pause, 'pause', game.status === 'paused' ? 'Resume' : 'Pause');
    root.dataset.status = game.status;
  }

  function showOverlay() {
    var title, msg, btn;
    if (game.status === 'paused') {
      title = 'Paused';
      msg = 'Press P or Esc to resume.';
      btn = 'Resume';
    } else if (game.status === 'over') {
      title = 'Game over';
      msg = 'Score ' + game.score.toLocaleString() + ' · ' + game.lines +
        (game.lines === 1 ? ' line' : ' lines') +
        (game.score > game.startBest && game.score > 0 ? ' · New best!' : '');
      btn = 'Play again';
      announce('Game over. Score ' + game.score + '.');
    } else {
      title = 'Tetris';
      msg = coarse ? 'Tap to rotate, drag to move, flick down to drop.' : 'Press Enter to start.';
      btn = 'Start';
    }
    el.overlayTitle.textContent = title;
    el.overlayMsg.textContent = msg;
    el.overlayBtn.textContent = btn;
    el.overlay.hidden = false;
  }

  function hideOverlay() {
    el.overlay.hidden = true;
  }

  var announceTimer = 0;
  function announce(msg) {
    el.status.textContent = msg;
    clearTimeout(announceTimer);
    if (msg) announceTimer = setTimeout(function() { el.status.textContent = ''; }, 1500);
  }

  function focusBoard() {
    try { el.board.focus({preventScroll: true}); } catch (e) { el.board.focus(); }
  }

  /* ═══════════════════════════════════════════
     Input
     ═══════════════════════════════════════════ */

  var KEYS = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down',
    ArrowUp: 'cw', x: 'cw', X: 'cw', z: 'ccw', Z: 'ccw',
    ' ': 'drop', c: 'hold', C: 'hold', Shift: 'hold',
    p: 'pause', P: 'pause', Escape: 'pause'
  };

  function isFormField(t) {
    return t && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName));
  }

  // While a game is running every game key is claimed, whether or not the
  // move succeeds, so arrows and Space never fall through to scroll the page
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || isFormField(e.target)) return;
    var action = KEYS[e.key];

    if (game.status === 'playing') {
      if (!action) return;
      e.preventDefault();
      if (e.repeat) return; // auto-repeat is ours (DAS/ARR), not the OS's
      if (action === 'pause') pause();
      else press(action);
      return;
    }

    if (game.status === 'paused' && (action === 'pause' || e.key === 'Enter')) {
      e.preventDefault();
      resume();
      return;
    }

    // Enter starts a game, unless it's meant for a focused link or button
    if (e.key === 'Enter' && (game.status === 'idle' || game.status === 'over') &&
        (e.target === document.body || e.target === el.board)) {
      e.preventDefault();
      start();
    }
  });

  document.addEventListener('keyup', function(e) {
    var action = KEYS[e.key];
    if (action) release(action);
  });

  el.overlayBtn.addEventListener('click', function() {
    if (game.status === 'paused') resume();
    else start();
  });

  el.newGame.addEventListener('click', start);
  el.pause.addEventListener('click', togglePause);

  function capture(node, id) {
    try { node.setPointerCapture(id); } catch (e) { /* pointer already gone */ }
  }

  // On-screen buttons: press on pointerdown for instant response; left,
  // right and down repeat while held, like the keys
  var touchButtons = el.touch.querySelectorAll('[data-action]');
  Array.prototype.forEach.call(touchButtons, function(btn) {
    var action = btn.dataset.action;
    btn.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      capture(btn, e.pointerId);
      btn.classList.add('is-pressed');
      press(action);
    });
    function up() {
      btn.classList.remove('is-pressed');
      release(action);
    }
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  });

  // Gestures on the board: tap rotates, drag sideways moves, drag down soft
  // drops, and a quick flick down hard drops
  var gesture = null;
  el.board.addEventListener('pointerdown', function(e) {
    if (e.pointerType === 'mouse') return;
    if (game.status !== 'playing') return;
    e.preventDefault();
    capture(el.board, e.pointerId);
    gesture = {id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(),
               lastY: e.clientY, lastT: performance.now(), moved: false, dropped: 0};
  });

  el.board.addEventListener('pointermove', function(e) {
    if (!gesture || e.pointerId !== gesture.id || game.status !== 'playing') return;
    var step = cell * 0.9;
    var dx = e.clientX - gesture.x;
    while (Math.abs(dx) >= step) {
      var dir = dx > 0 ? 1 : -1;
      shift(dir);
      gesture.x += dir * step;
      dx -= dir * step;
      gesture.moved = true;
    }
    var dy = e.clientY - gesture.y;
    while (dy >= step) {
      if (stepDown()) game.score++;
      gesture.y += step;
      dy -= step;
      gesture.moved = true;
      gesture.dropped++;
    }
    gesture.lastY = e.clientY;
    gesture.lastT = performance.now();
    render();
  });

  function endGesture(e) {
    if (!gesture || e.pointerId !== gesture.id) return;
    var g = gesture;
    gesture = null;
    if (game.status !== 'playing') return;
    var now = performance.now();
    var totalDy = e.clientY - g.y + g.dropped * cell * 0.9;
    var elapsed = now - g.t;
    if (e.type === 'pointerup' && totalDy > cell * 2 && elapsed < 250) {
      hardDrop();
    } else if (e.type === 'pointerup' && !g.moved && elapsed < 300) {
      rotate(1);
    }
    if (game.status === 'over') showOverlay();
    render();
  }
  el.board.addEventListener('pointerup', endGesture);
  el.board.addEventListener('pointercancel', endGesture);

  // Pause whenever the player can't see the game
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) pause();
  });
  window.addEventListener('blur', pause);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function(entries) {
      if (entries[0].intersectionRatio < 0.35) pause();
    }, {threshold: 0.35}).observe(el.board);
  }

  // Theme switches restyle the canvas; resizes refit it
  new MutationObserver(function() {
    readPalette();
    render();
  }).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});

  // Refit when the viewport or the card changes size (including once the
  // page finishes loading and the card reaches its final width)
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
  if ('ResizeObserver' in window) new ResizeObserver(scheduleLayout).observe(root);

  readPalette();
  layout();
  showOverlay();
})();
