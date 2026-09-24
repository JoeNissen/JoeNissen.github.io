/* ── Minesweeper ──
   State machine: idle → playing → won | lost.
   Board state lives in flat typed arrays indexed by r * cols + c. Game logic
   never touches the DOM; render functions turn state into DOM updates and only
   write cells whose view actually changed. */
(function() {
  'use strict';

  var root = document.getElementById('ms-game');
  if (!root) return;

  var el = {
    board: document.getElementById('ms-board'),
    difficulty: document.getElementById('ms-difficulty'),
    customForm: document.getElementById('ms-custom'),
    customFields: document.getElementById('ms-custom-fields'),
    rows: document.getElementById('ms-rows'),
    cols: document.getElementById('ms-cols'),
    mines: document.getElementById('ms-mines'),
    customError: document.getElementById('ms-custom-error'),
    mode: document.getElementById('ms-mode'),
    minesLeft: document.getElementById('ms-mines-left'),
    reset: document.getElementById('ms-reset'),
    time: document.getElementById('ms-time'),
    best: document.getElementById('ms-best'),
    bestClear: document.getElementById('ms-best-clear'),
    status: document.getElementById('ms-status')
  };

  var PRESETS = {
    beginner:     {rows: 9,  cols: 9,  mines: 10},
    intermediate: {rows: 16, cols: 16, mines: 40},
    expert:       {rows: 16, cols: 30, mines: 99}
  };
  var DEFAULT_CUSTOM = {rows: 20, cols: 30, mines: 145};
  var LIMITS = {rows: [5, 30], cols: [5, 50]};
  var LONG_PRESS_MS = 400;
  var TOUCH_SLOP_PX = 10;
  var STORE_PREFIX = 'jn.minesweeper.v1.';

  // Cell visibility states
  var HIDDEN = 0, REVEALED = 1, FLAGGED = 2;

  /* ═══════════════════════════════════════════
     Storage (best times, last difficulty)
     ═══════════════════════════════════════════ */

  function storeGet(key) {
    try { return window.localStorage.getItem(STORE_PREFIX + key); } catch (e) { return null; }
  }

  function storeSet(key, value) {
    try {
      if (value === null) window.localStorage.removeItem(STORE_PREFIX + key);
      else window.localStorage.setItem(STORE_PREFIX + key, value);
    } catch (e) { /* storage unavailable: nothing persists, game still works */ }
  }

  /* ═══════════════════════════════════════════
     Game state and logic (no DOM access)
     ═══════════════════════════════════════════ */

  var game = {
    status: 'idle',   // 'idle' | 'playing' | 'won' | 'lost'
    rows: 0,
    cols: 0,
    mines: 0,
    isMine: null,     // Uint8Array: 1 = mine
    counts: null,     // Uint8Array: adjacent mine count
    cells: null,      // Uint8Array: HIDDEN | REVEALED | FLAGGED
    revealedCount: 0,
    flagCount: 0,
    exploded: [],     // mines revealed by the losing move
    startedAt: 0,
    endedAt: 0
  };

  function newGame(cfg) {
    var n = cfg.rows * cfg.cols;
    game.status = 'idle';
    game.rows = cfg.rows;
    game.cols = cfg.cols;
    // Clamp mines so there's always room for the 3x3 first-click safe zone
    game.mines = Math.min(cfg.mines, n - 9);
    game.isMine = new Uint8Array(n);
    game.counts = new Uint8Array(n);
    game.cells = new Uint8Array(n);
    game.revealedCount = 0;
    game.flagCount = 0;
    game.exploded = [];
    game.startedAt = 0;
    game.endedAt = 0;
  }

  function isLive() {
    return game.status === 'idle' || game.status === 'playing';
  }

  // Calls fn(index) for each in-bounds neighbor of i
  function forEachNeighbor(i, fn) {
    var cols = game.cols, rows = game.rows;
    var r = (i / cols) | 0, c = i - r * cols;
    for (var dr = -1; dr <= 1; dr++) {
      var nr = r + dr;
      if (nr < 0 || nr >= rows) continue;
      for (var dc = -1; dc <= 1; dc++) {
        var nc = c + dc;
        if ((dr === 0 && dc === 0) || nc < 0 || nc >= cols) continue;
        fn(nr * cols + nc);
      }
    }
  }

  function hiddenNeighbors(i) {
    var out = [];
    forEachNeighbor(i, function(nb) {
      if (game.cells[nb] === HIDDEN) out.push(nb);
    });
    return out;
  }

  function flagsAround(i) {
    var n = 0;
    forEachNeighbor(i, function(nb) {
      if (game.cells[nb] === FLAGGED) n++;
    });
    return n;
  }

  // Mines are placed on the first reveal, never inside the 3x3 block around it,
  // so the first click always opens a zero-count cell and can't detonate.
  function placeMines(safe) {
    var cols = game.cols;
    var sr = (safe / cols) | 0, sc = safe - sr * cols;
    var n = game.cells.length;
    var candidates = [];
    for (var i = 0; i < n; i++) {
      var r = (i / cols) | 0, c = i - r * cols;
      if (Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1) continue;
      candidates.push(i);
    }

    // Partial Fisher-Yates: shuffle only the first `mines` slots
    var toPlace = Math.min(game.mines, candidates.length);
    for (var k = 0; k < toPlace; k++) {
      var j = k + Math.floor(Math.random() * (candidates.length - k));
      var tmp = candidates[k];
      candidates[k] = candidates[j];
      candidates[j] = tmp;
      game.isMine[candidates[k]] = 1;
    }

    for (var m = 0; m < n; m++) {
      if (!game.isMine[m]) continue;
      forEachNeighbor(m, function(nb) { game.counts[nb]++; });
    }
  }

  // Iterative flood fill with an explicit stack, from a safe cell.
  function floodReveal(start, changed) {
    var stack = [start];
    while (stack.length) {
      var i = stack.pop();
      if (game.cells[i] !== HIDDEN || game.isMine[i]) continue;
      game.cells[i] = REVEALED;
      game.revealedCount++;
      changed.push(i);
      if (game.counts[i] !== 0) continue;
      forEachNeighbor(i, function(nb) {
        if (game.cells[nb] === HIDDEN) stack.push(nb);
      });
    }
  }

  // Open a set of hidden cells, then settle won/lost. Returns changed indices.
  function openCells(list, changed) {
    for (var k = 0; k < list.length; k++) {
      var i = list[k];
      if (game.cells[i] !== HIDDEN) continue;
      if (game.isMine[i]) {
        game.cells[i] = REVEALED;
        game.exploded.push(i);
        changed.push(i);
      } else {
        floodReveal(i, changed);
      }
    }

    if (game.exploded.length) {
      game.status = 'lost';
    } else if (game.revealedCount === game.cells.length - game.mines) {
      game.status = 'won';
      // Every cell still hidden is a mine: flag them all.
      for (var j = 0; j < game.cells.length; j++) {
        if (game.cells[j] === HIDDEN) {
          game.cells[j] = FLAGGED;
          changed.push(j);
        }
      }
      game.flagCount = game.mines;
    }
    return changed;
  }

  function reveal(i) {
    if (!isLive() || game.cells[i] !== HIDDEN) return [];
    if (game.status === 'idle') {
      placeMines(i);
      game.status = 'playing';
    }
    return openCells([i], []);
  }

  // Revealed number with exactly that many adjacent flags: open the rest of
  // its neighbors. Wrong flags mean a mine gets opened — no safety net.
  function chord(i) {
    if (game.status !== 'playing' || game.cells[i] !== REVEALED) return [];
    var n = game.counts[i];
    if (n === 0 || flagsAround(i) !== n) return [];
    return openCells(hiddenNeighbors(i), []);
  }

  function toggleFlag(i) {
    if (!isLive() || game.cells[i] === REVEALED) return false;
    if (game.cells[i] === FLAGGED) {
      game.cells[i] = HIDDEN;
      game.flagCount--;
    } else {
      game.cells[i] = FLAGGED;
      game.flagCount++;
    }
    return true;
  }

  function elapsedMs() {
    if (!game.startedAt) return 0;
    return (game.endedAt || Date.now()) - game.startedAt;
  }

  /* ═══════════════════════════════════════════
     Rendering (state → DOM)
     ═══════════════════════════════════════════ */

  var cellEls = [];   // DOM node per cell index
  var views = [];     // last rendered view key per cell, so unchanged cells are skipped
  var pressed = [];   // indices currently drawn depressed (press preview)
  var focusIdx = 0;   // roving tabindex position
  var shown = {left: '', time: '', face: ''};

  var FACES = {
    idle: '\u{1F642}',     // 🙂
    playing: '\u{1F642}',
    press: '\u{1F62E}',    // 😮
    won: '\u{1F60E}',      // 😎
    lost: '\u{1F635}'      // 😵
  };

  var VIEW_LABELS = {
    hidden: 'Hidden',
    flag: 'Flagged',
    mine: 'Mine',
    boom: 'Mine, detonated',
    wrong: 'Incorrect flag, no mine'
  };

  function buildBoard() {
    var n = game.cells.length;
    var frag = document.createDocumentFragment();
    cellEls = new Array(n);
    views = new Array(n);
    pressed = [];

    for (var r = 0; r < game.rows; r++) {
      var row = document.createElement('div');
      row.className = 'ms-row';
      row.setAttribute('role', 'row');
      for (var c = 0; c < game.cols; c++) {
        var i = r * game.cols + c;
        var cell = document.createElement('div');
        cell.className = 'ms-cell';
        cell.setAttribute('role', 'gridcell');
        cell.tabIndex = -1;
        cell.dataset.i = i;
        cellEls[i] = cell;
        row.appendChild(cell);
      }
      frag.appendChild(row);
    }

    focusIdx = Math.min(focusIdx, n - 1);
    cellEls[focusIdx].tabIndex = 0;

    el.board.style.setProperty('--cols', game.cols);
    el.board.setAttribute('aria-label',
      'Minesweeper board, ' + game.rows + ' rows by ' + game.cols + ' columns, ' + game.mines + ' mines');
    el.board.textContent = '';
    el.board.appendChild(frag);
  }

  function viewOf(i) {
    var state = game.cells[i];
    var mine = game.isMine[i] === 1;
    var lost = game.status === 'lost';
    if (state === REVEALED) return mine ? 'boom' : 'open' + game.counts[i];
    if (state === FLAGGED) return lost && !mine ? 'wrong' : 'flag';
    if (lost && mine) return 'mine';
    return 'hidden';
  }

  function renderCell(i) {
    var view = viewOf(i);
    if (views[i] === view) return;
    views[i] = view;

    var cell = cellEls[i];
    var label;
    if (view.lastIndexOf('open', 0) === 0) {
      var count = +view.slice(4);
      cell.dataset.state = 'open';
      if (count) {
        cell.dataset.count = count;
        cell.textContent = count;
        label = count + (count === 1 ? ' adjacent mine' : ' adjacent mines');
      } else {
        delete cell.dataset.count;
        cell.textContent = '';
        label = 'Empty';
      }
    } else {
      cell.dataset.state = view;
      delete cell.dataset.count;
      cell.textContent = '';
      label = VIEW_LABELS[view];
    }
    cell.setAttribute('aria-label', label);
  }

  function renderCells(list) {
    for (var k = 0; k < list.length; k++) renderCell(list[k]);
  }

  function renderAll() {
    for (var i = 0; i < cellEls.length; i++) renderCell(i);
    el.board.dataset.status = game.status;
  }

  function setPressed(list) {
    for (var a = 0; a < pressed.length; a++) {
      if (list.indexOf(pressed[a]) === -1) cellEls[pressed[a]].removeAttribute('data-pressed');
    }
    for (var b = 0; b < list.length; b++) {
      if (pressed.indexOf(list[b]) === -1) cellEls[list[b]].setAttribute('data-pressed', '');
    }
    pressed = list;
  }

  function pad3(n) {
    return n < 0 ? '-' + ('0' + Math.min(-n, 99)).slice(-2) : ('00' + Math.min(n, 999)).slice(-3);
  }

  function formatTime(ms) {
    var tenths = Math.round(ms / 100);
    var s = tenths / 10;
    if (s < 60) return s.toFixed(1) + ' s';
    var m = Math.floor(tenths / 600);
    var rest = (tenths - m * 600) / 10;
    return m + ':' + (rest < 10 ? '0' : '') + rest.toFixed(1);
  }

  function renderCounter() {
    var t = pad3(game.mines - game.flagCount);
    if (t !== shown.left) el.minesLeft.textContent = shown.left = t;
  }

  function renderTime() {
    var t = pad3(Math.floor(elapsedMs() / 1000));
    if (t !== shown.time) el.time.textContent = shown.time = t;
  }

  function renderFace() {
    var p = press;
    var face = p && p.over && !p.done && isLive() && (p.left || p.touch || p.chord) ? 'press' : game.status;
    if (face !== shown.face) {
      el.reset.textContent = FACES[face];
      el.reset.dataset.face = shown.face = face;
    }
  }

  function renderMode() {
    el.mode.textContent = flagMode ? 'Flag' : 'Dig';
    el.mode.setAttribute('aria-pressed', flagMode ? 'true' : 'false');
  }

  function renderBest() {
    var best = loadBest();
    el.best.textContent = 'Best ' + (best ? formatTime(best) : '—');
    el.bestClear.hidden = !best;
  }

  /* ═══════════════════════════════════════════
     Timer: display is derived from Date.now() deltas
     ═══════════════════════════════════════════ */

  var tickId = 0;

  function startTicking() {
    stopTicking();
    tickId = window.setInterval(renderTime, 250);
  }

  function stopTicking() {
    if (tickId) {
      window.clearInterval(tickId);
      tickId = 0;
    }
  }

  /* ═══════════════════════════════════════════
     Difficulty, custom board, best times
     ═══════════════════════════════════════════ */

  var customCfg = parseCustom(storeGet('custom')) || DEFAULT_CUSTOM;

  function parseCustom(s) {
    var m = /^(\d+)x(\d+)x(\d+)$/.exec(s || '');
    if (!m) return null;
    return checkCustom(m[1], m[2], m[3]).cfg;
  }

  // Validates raw field values. Returns {cfg} or {field, message}.
  function checkCustom(rowsRaw, colsRaw, minesRaw) {
    function int(v) { return /^\s*\d+\s*$/.test(String(v)) ? parseInt(v, 10) : NaN; }
    var rows = int(rowsRaw), cols = int(colsRaw), mines = int(minesRaw);
    if (!(rows >= LIMITS.rows[0] && rows <= LIMITS.rows[1])) {
      return {field: 'rows', message: 'Rows must be a whole number from ' + LIMITS.rows[0] + ' to ' + LIMITS.rows[1] + '.'};
    }
    if (!(cols >= LIMITS.cols[0] && cols <= LIMITS.cols[1])) {
      return {field: 'cols', message: 'Columns must be a whole number from ' + LIMITS.cols[0] + ' to ' + LIMITS.cols[1] + '.'};
    }
    var maxMines = rows * cols - 9;
    if (!(mines >= 1 && mines <= maxMines)) {
      return {field: 'mines', message: 'Mines must be from 1 to ' + maxMines + ' on a ' + rows + '×' + cols + ' board.'};
    }
    return {cfg: {rows: rows, cols: cols, mines: mines}};
  }

  function validateCustomFields() {
    var result = checkCustom(el.rows.value, el.cols.value, el.mines.value);
    ['rows', 'cols', 'mines'].forEach(function(f) {
      el[f].setAttribute('aria-invalid', result.field === f ? 'true' : 'false');
    });
    el.customError.textContent = result.message || '';
    return result;
  }

  function fillCustomFields(cfg) {
    el.rows.value = cfg.rows;
    el.cols.value = cfg.cols;
    el.mines.value = cfg.mines;
  }

  // Preset: fields show the preset's size read-only. Custom: fields are editable.
  function syncCustomFields() {
    var custom = el.difficulty.value === 'custom';
    el.customFields.disabled = !custom;
    fillCustomFields(custom ? customCfg : PRESETS[el.difficulty.value]);
    validateCustomFields();
  }

  function currentConfig() {
    return el.difficulty.value === 'custom' ? customCfg : PRESETS[el.difficulty.value];
  }

  function bestKey() {
    var d = el.difficulty.value;
    if (d !== 'custom') return 'best.' + d;
    return 'best.custom.' + customCfg.rows + 'x' + customCfg.cols + 'x' + customCfg.mines;
  }

  function loadBest() {
    var v = parseInt(storeGet(bestKey()), 10);
    return v > 0 ? v : 0;
  }

  /* ═══════════════════════════════════════════
     Controller: input → state transition → render
     ═══════════════════════════════════════════ */

  var flagMode = false;
  var press = null;

  function start() {
    endPress();
    stopTicking();
    disarmClear();
    var hadFocus = el.board.contains(document.activeElement);

    newGame(currentConfig());
    flagMode = false;
    buildBoard();
    renderAll();
    renderCounter();
    renderTime();
    renderFace();
    renderMode();
    renderBest();
    el.status.textContent = '';

    if (hadFocus) cellEls[focusIdx].focus();
  }

  function commit(changed, before) {
    if (before === 'idle' && game.status !== 'idle') {
      game.startedAt = Date.now();
      startTicking();
    }
    if (game.status !== before && !isLive()) {
      game.endedAt = Date.now();
      stopTicking();
      renderAll();
      announceEnd();
    } else {
      renderCells(changed);
    }
    el.board.dataset.status = game.status;
    renderCounter();
    renderTime();
    renderFace();
  }

  function announceEnd() {
    var ms = elapsedMs();
    if (game.status === 'lost') {
      el.status.textContent = 'Boom — you hit a mine after ' + formatTime(ms) + '. Press R or the face to play again.';
      return;
    }
    var best = loadBest();
    var isBest = !best || ms < best;
    if (isBest) {
      storeSet(bestKey(), String(ms));
      renderBest();
    }
    el.status.textContent = 'Cleared in ' + formatTime(ms) + '.' + (isBest ? ' New best!' : '');
  }

  function doReveal(i) {
    var before = game.status;
    commit(reveal(i), before);
  }

  function doChord(i) {
    var before = game.status;
    commit(chord(i), before);
  }

  function doFlag(i) {
    if (!toggleFlag(i)) return;
    renderCell(i);
    renderCounter();
  }

  // Tap / left-click / assistive-tech activation
  function primary(i) {
    if (game.cells[i] === REVEALED) doChord(i);
    else if (flagMode) doFlag(i);
    else doReveal(i);
  }

  // Long-press: the opposite of the current Dig/Flag mode
  function secondary(i) {
    if (game.cells[i] === REVEALED) return;
    if (flagMode) doReveal(i);
    else doFlag(i);
  }

  /* ── Pointer input: mouse, touch, pen ── */

  function cellIndexOf(node) {
    var cell = node && node.closest ? node.closest('.ms-cell') : null;
    if (!cell) return -1;
    var i = +cell.dataset.i;
    return cellEls[i] === cell ? i : -1;
  }

  function cellIndexAt(x, y) {
    return cellIndexOf(document.elementFromPoint(x, y));
  }

  // Which cells should look depressed for the current press
  function renderPress() {
    var list = [];
    var p = press;
    if (p && p.over && !p.done && isLive()) {
      var i = p.i;
      var state = game.cells[i];
      if (p.chord) {
        list = hiddenNeighbors(i);
        if (state === HIDDEN) list.push(i);
      } else if (p.left || p.touch) {
        if (state === REVEALED) list = hiddenNeighbors(i);
        else if (state === HIDDEN && !flagMode) list = [i];
      }
    }
    setPressed(list);
    renderFace();
  }

  function endPress() {
    if (press && press.timer) window.clearTimeout(press.timer);
    press = null;
    if (cellEls.length) renderPress();
  }

  function onPointerDown(e) {
    if (!isLive()) return;
    var i = cellIndexOf(e.target);
    if (i < 0) return;

    if (e.pointerType === 'mouse') {
      // Extra buttons pressed during a press arrive as pointermove, not pointerdown
      if (press) return;
      press = {id: e.pointerId, i: i, over: true, done: false, left: false, chord: false, both: false};
      if (e.button === 0) {
        press.left = true;
      } else if (e.button === 1) {
        press.chord = true;
      } else if (e.button === 2) {
        doFlag(i);
      } else {
        press = null;
        return;
      }
      try { el.board.setPointerCapture(e.pointerId); } catch (err) { /* capture is best-effort */ }
    } else {
      // A second finger means a pinch or scroll gesture, not a tap
      if (press) { endPress(); return; }
      press = {id: e.pointerId, i: i, over: true, done: false, touch: true,
               x: e.clientX, y: e.clientY, timer: 0};
      press.timer = window.setTimeout(onLongPress, LONG_PRESS_MS);
    }
    renderPress();
  }

  function onPointerMove(e) {
    var p = press;
    if (!p || e.pointerId !== p.id) return;

    var cur = cellIndexAt(e.clientX, e.clientY);

    if (p.touch) {
      if (Math.abs(e.clientX - p.x) > TOUCH_SLOP_PX || Math.abs(e.clientY - p.y) > TOUCH_SLOP_PX) {
        endPress();
        return;
      }
      p.over = cur === p.i;
    } else {
      // As in classic Minesweeper, a held mouse button drags the press along
      // with the cursor: the cell under the pointer is the one that acts on
      // release, not the one the button went down on.
      if (cur >= 0) p.i = cur;
      p.over = cur >= 0;

      // Left+right held together (or middle) is a chord. Releasing either
      // button of a two-button chord fires it, as in classic Minesweeper.
      if ((e.buttons & 3) === 3) {
        p.chord = true;
        p.both = true;
      } else if (p.both) {
        p.both = false;
        if (!p.done && p.over) doChord(p.i);
        p.done = true;
      }
    }

    renderPress();
  }

  function onPointerUp(e) {
    var p = press;
    if (!p || e.pointerId !== p.id) return;
    // The mouse can move between the last pointermove and the release, so
    // resolve the target cell from the release point.
    var cur = cellIndexAt(e.clientX, e.clientY);
    var i = p.touch ? p.i : cur;
    var over = p.touch ? cur === p.i : cur >= 0;
    endPress();
    if (p.done || !over || !isLive()) return;
    if (p.chord) doChord(i);
    else if (p.left || p.touch) primary(i);
  }

  function onLongPress() {
    var p = press;
    if (!p) return;
    p.timer = 0;
    if (!p.over || p.done) return;
    p.done = true;
    secondary(p.i);
    renderPress();
    // Haptic tick only once the page has user activation; before that the
    // browser blocks vibrate() and logs an intervention to the console.
    var ua = navigator.userActivation;
    if (navigator.vibrate && ua && ua.hasBeenActive) {
      try { navigator.vibrate(15); } catch (err) { /* optional */ }
    }
  }

  el.board.addEventListener('pointerdown', onPointerDown);
  el.board.addEventListener('pointermove', onPointerMove);
  el.board.addEventListener('pointerup', onPointerUp);
  el.board.addEventListener('pointercancel', endPress);
  window.addEventListener('blur', endPress);

  // Board only: right-click and touch long-press must not open the menu
  el.board.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  // Middle-click chords instead of starting autoscroll
  el.board.addEventListener('mousedown', function(e) { if (e.button === 1) e.preventDefault(); });

  // Pointer clicks are handled above; only synthesized clicks (detail 0, e.g.
  // a screen reader activating a cell) arrive here.
  el.board.addEventListener('click', function(e) {
    if (e.detail !== 0 || !isLive()) return;
    var i = cellIndexOf(e.target);
    if (i >= 0) primary(i);
  });

  /* ── Keyboard: roving tabindex over the grid ── */

  function setFocusIdx(i) {
    if (cellEls[focusIdx]) cellEls[focusIdx].tabIndex = -1;
    focusIdx = i;
    cellEls[i].tabIndex = 0;
  }

  el.board.addEventListener('focusin', function(e) {
    var i = cellIndexOf(e.target);
    if (i >= 0 && i !== focusIdx) setFocusIdx(i);
  });

  el.board.addEventListener('keydown', function(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var i = focusIdx;
    var r = (i / game.cols) | 0, c = i - r * game.cols;

    switch (e.key) {
      case 'ArrowUp': r--; break;
      case 'ArrowDown': r++; break;
      case 'ArrowLeft': c--; break;
      case 'ArrowRight': c++; break;
      case 'Home': c = 0; break;
      case 'End': c = game.cols - 1; break;
      case 'PageUp': r = 0; break;
      case 'PageDown': r = game.rows - 1; break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        if (game.cells[i] === REVEALED) doChord(i);
        else doReveal(i);
        return;
      case 'f':
      case 'F':
        e.preventDefault();
        doFlag(i);
        return;
      default:
        return;
    }

    e.preventDefault();
    r = Math.max(0, Math.min(game.rows - 1, r));
    c = Math.max(0, Math.min(game.cols - 1, c));
    setFocusIdx(r * game.cols + c);
    cellEls[focusIdx].focus();
  });

  // R restarts from anywhere on the page, except while typing in a field
  document.addEventListener('keydown', function(e) {
    if ((e.key !== 'r' && e.key !== 'R') || e.repeat) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName))) return;
    e.preventDefault();
    start();
  });

  /* ── Controls ── */

  el.reset.addEventListener('click', start);

  el.mode.addEventListener('click', function() {
    flagMode = !flagMode;
    renderMode();
  });

  el.difficulty.addEventListener('change', function() {
    storeSet('difficulty', el.difficulty.value);
    syncCustomFields();
    start();
  });

  el.customForm.addEventListener('input', validateCustomFields);

  el.customForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var result = validateCustomFields();
    if (!result.cfg) {
      el[result.field].focus();
      return;
    }
    customCfg = result.cfg;
    storeSet('custom', customCfg.rows + 'x' + customCfg.cols + 'x' + customCfg.mines);
    start();
  });

  // Clearing a best time takes two clicks; the second must come within 4s.
  var clearArmed = 0;

  function disarmClear() {
    if (clearArmed) window.clearTimeout(clearArmed);
    clearArmed = 0;
    el.bestClear.textContent = 'Clear';
  }

  el.bestClear.addEventListener('click', function() {
    if (!clearArmed) {
      el.bestClear.textContent = 'Confirm clear';
      clearArmed = window.setTimeout(disarmClear, 4000);
      return;
    }
    disarmClear();
    storeSet(bestKey(), null);
    renderBest();
    el.reset.focus();
  });

  /* ── Boot ── */

  var savedDifficulty = storeGet('difficulty');
  if (savedDifficulty && (PRESETS[savedDifficulty] || savedDifficulty === 'custom')) {
    el.difficulty.value = savedDifficulty;
  }
  syncCustomFields();
  start();
})();
