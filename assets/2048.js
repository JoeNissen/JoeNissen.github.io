/* ── 2048 ──
   State machine: playing → won (optional "keep going") → over.
   Tiles are objects with stable ids so the DOM can slide each one to its new
   cell. A move updates game state immediately; the DOM catches up over one
   short slide, after which merged tiles pop in and the new tile appears. A
   new move before that finishes flushes the pending DOM work first. */
(function() {
  'use strict';

  var root = document.getElementById('tz-game');
  if (!root) return;

  var el = {
    board: document.getElementById('tz-board'),
    tiles: document.getElementById('tz-tiles'),
    score: document.getElementById('tz-score'),
    best: document.getElementById('tz-best'),
    gain: document.getElementById('tz-gain'),
    newGame: document.getElementById('tz-new'),
    undo: document.getElementById('tz-undo'),
    overlay: document.getElementById('tz-overlay'),
    overlayTitle: document.getElementById('tz-overlay-title'),
    overlayMsg: document.getElementById('tz-overlay-msg'),
    overlayMain: document.getElementById('tz-overlay-main'),
    overlayAlt: document.getElementById('tz-overlay-alt'),
    status: document.getElementById('tz-status')
  };

  var SIZE = 4;
  var GOAL = 2048;
  var SWIPE_PX = 24;
  var STORE_PREFIX = 'jn.2048.v1.';
  var VECTORS = {left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1]};

  var reduceMotion = document.documentElement.classList.contains('reduce-motion');
  var SLIDE_MS = reduceMotion ? 0 : 100;

  /* ═══════════════════════════════════════════
     Storage (best score, game in progress)
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

  var nextId = 1;

  var game = {
    status: 'playing',  // 'playing' | 'won' | 'over'
    grid: null,         // grid[y][x] = tile | null; tile = {id, value, x, y, mergedFrom, isNew}
    score: 0,
    best: Number(storeGet('best')) || 0,
    keepGoing: false,   // dismissed the win screen
    undo: null          // {values, score, keepGoing} before the last move
  };

  function emptyGrid() {
    var g = [];
    for (var y = 0; y < SIZE; y++) g.push([null, null, null, null]);
    return g;
  }

  function makeTile(value, x, y) {
    return {id: nextId++, value: value, x: x, y: y, mergedFrom: null, isNew: false};
  }

  function values(grid) {
    return grid.map(function(row) {
      return row.map(function(t) { return t ? t.value : 0; });
    });
  }

  function fromValues(vals) {
    var g = emptyGrid();
    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) if (vals[y][x]) g[y][x] = makeTile(vals[y][x], x, y);
    }
    return g;
  }

  function addRandomTile(grid) {
    var empty = [];
    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) if (!grid[y][x]) empty.push([x, y]);
    }
    if (!empty.length) return null;
    var cell = empty[Math.floor(Math.random() * empty.length)];
    var t = makeTile(Math.random() < 0.9 ? 2 : 4, cell[0], cell[1]);
    t.isNew = true;
    grid[cell[1]][cell[0]] = t;
    return t;
  }

  function inBounds(x, y) {
    return x >= 0 && x < SIZE && y >= 0 && y < SIZE;
  }

  // Slides every tile as far as it goes toward `dir`; each tile merges at
  // most once per move, and the pair nearest the wall merges first
  // (so 2 2 2 → 4 2, and 2 2 2 2 → 4 4)
  function slide(grid, dir) {
    var v = VECTORS[dir];
    var g = grid.map(function(row) { return row.slice(); });
    var xs = [0, 1, 2, 3], ys = [0, 1, 2, 3];
    if (v[0] === 1) xs.reverse();
    if (v[1] === 1) ys.reverse();
    var moved = false, gained = 0, maxValue = 0;

    g.forEach(function(row) {
      row.forEach(function(t) { if (t) { t.mergedFrom = null; t.isNew = false; } });
    });

    ys.forEach(function(y) {
      xs.forEach(function(x) {
        var t = g[y][x];
        if (!t) return;
        var px = x, py = y;
        while (inBounds(px + v[0], py + v[1]) && !g[py + v[1]][px + v[0]]) {
          px += v[0];
          py += v[1];
        }
        var nx = px + v[0], ny = py + v[1];
        var next = inBounds(nx, ny) ? g[ny][nx] : null;

        if (next && next.value === t.value && !next.mergedFrom) {
          var merged = makeTile(t.value * 2, nx, ny);
          merged.mergedFrom = [next, t];
          g[y][x] = null;
          g[ny][nx] = merged;
          t.x = nx;
          t.y = ny;
          gained += merged.value;
          maxValue = Math.max(maxValue, merged.value);
          moved = true;
        } else if (px !== x || py !== y) {
          g[y][x] = null;
          g[py][px] = t;
          t.x = px;
          t.y = py;
          moved = true;
        }
      });
    });

    return {grid: g, moved: moved, gained: gained, maxValue: maxValue};
  }

  function canMove(grid) {
    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        var t = grid[y][x];
        if (!t) return true;
        if (x < SIZE - 1 && grid[y][x + 1] && grid[y][x + 1].value === t.value) return true;
        if (y < SIZE - 1 && grid[y + 1][x] && grid[y + 1][x].value === t.value) return true;
      }
    }
    return false;
  }

  function newGame() {
    game.grid = emptyGrid();
    addRandomTile(game.grid);
    addRandomTile(game.grid);
    game.score = 0;
    game.status = 'playing';
    game.keepGoing = false;
    game.undo = null;
    save();
  }

  // Returns the points gained, or -1 if nothing moved
  function move(dir) {
    if (game.status === 'over' || (game.status === 'won' && !game.keepGoing)) return -1;
    var before = {values: values(game.grid), score: game.score, keepGoing: game.keepGoing};
    var res = slide(game.grid, dir);
    if (!res.moved) return -1;
    game.undo = before;
    game.grid = res.grid;
    game.score += res.gained;
    if (game.score > game.best) {
      game.best = game.score;
      storeSet('best', game.best);
    }
    addRandomTile(game.grid);
    if (res.maxValue >= GOAL && !game.keepGoing) game.status = 'won';
    else if (!canMove(game.grid)) game.status = 'over';
    else game.status = 'playing';
    save();
    return res.gained;
  }

  function undo() {
    if (!game.undo) return false;
    game.grid = fromValues(game.undo.values);
    game.score = game.undo.score;
    game.keepGoing = game.undo.keepGoing;
    game.status = 'playing';
    game.undo = null;
    save();
    return true;
  }

  // The board survives a reload, so a stray refresh doesn't cost a game
  function save() {
    storeSet('game', game.status === 'over' ? null : JSON.stringify({
      values: values(game.grid), score: game.score, keepGoing: game.keepGoing
    }));
  }

  function restore() {
    var raw = storeGet('game');
    if (!raw) return false;
    try {
      var s = JSON.parse(raw);
      var ok = Array.isArray(s.values) && s.values.length === SIZE && s.values.every(function(row) {
        return Array.isArray(row) && row.length === SIZE && row.every(function(v) {
          return v === 0 || (v >= 2 && (v & (v - 1)) === 0);
        });
      });
      if (!ok || typeof s.score !== 'number' || s.score < 0) return false;
      game.grid = fromValues(s.values);
      game.score = s.score;
      game.keepGoing = !!s.keepGoing;
      game.status = canMove(game.grid) ? 'playing' : 'over';
      game.undo = null;
      game.best = Math.max(game.best, game.score);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ═══════════════════════════════════════════
     Rendering
     ═══════════════════════════════════════════ */

  var tileEls = {};       // id → element currently on the board
  var pending = null;     // DOM work waiting for the slide to finish
  var pendingTimer = 0;

  function createTileEl(t, cls) {
    var node = document.createElement('div');
    node.className = 'tz-tile' + (cls ? ' ' + cls : '');
    var inner = document.createElement('div');
    inner.className = 'tz-inner';
    inner.textContent = t.value;
    node.appendChild(inner);
    setTileView(node, t);
    el.tiles.appendChild(node);
    tileEls[t.id] = node;
    return node;
  }

  function setTileView(node, t) {
    node.style.setProperty('--x', t.x);
    node.style.setProperty('--y', t.y);
    node.dataset.value = t.value > GOAL ? 'super' : t.value;
    node.dataset.digits = String(t.value).length;
  }

  function flush() {
    if (!pending) return;
    clearTimeout(pendingTimer);
    var work = pending;
    pending = null;
    work();
  }

  // Draws the current grid. With `animate`, tiles slide from where they are,
  // and merged/new tiles appear once the slide is done.
  function renderBoard(animate) {
    flush();
    var live = {};
    var later = [];

    game.grid.forEach(function(row) {
      row.forEach(function(t) {
        if (!t) return;
        if (t.mergedFrom && animate) {
          t.mergedFrom.forEach(function(src) {
            live[src.id] = true;
            if (tileEls[src.id]) setTileView(tileEls[src.id], src);
          });
          later.push(function() {
            t.mergedFrom.forEach(function(src) { removeTileEl(src.id); });
            createTileEl(t, 'is-merged');
          });
        } else if (t.isNew && animate) {
          later.push(function() { createTileEl(t, 'is-new'); });
        } else if (tileEls[t.id]) {
          setTileView(tileEls[t.id], t);
        } else {
          createTileEl(t);
        }
        live[t.id] = true;
      });
    });

    Object.keys(tileEls).forEach(function(id) {
      if (!live[id]) removeTileEl(id);
    });

    if (later.length) {
      pending = function() { later.forEach(function(fn) { fn(); }); };
      if (SLIDE_MS) pendingTimer = setTimeout(flush, SLIDE_MS);
      else flush();
    }
  }

  function removeTileEl(id) {
    var node = tileEls[id];
    if (node && node.parentNode) node.parentNode.removeChild(node);
    delete tileEls[id];
  }

  function clearBoard() {
    flush();
    Object.keys(tileEls).forEach(removeTileEl);
  }

  function renderHud() {
    el.score.textContent = game.score;
    el.best.textContent = game.best;
    el.undo.disabled = !game.undo;
    root.dataset.status = game.status;
    el.board.setAttribute('aria-label', describe());
  }

  function describe() {
    var rows = values(game.grid).map(function(row, i) {
      return 'Row ' + (i + 1) + ': ' + row.map(function(v) { return v || 'empty'; }).join(', ');
    });
    return '2048 board. ' + rows.join('. ') + '.';
  }

  function showGain(n) {
    if (!n || reduceMotion) return;
    var node = document.createElement('span');
    node.className = 'tz-gain-float';
    node.textContent = '+' + n;
    el.gain.appendChild(node);
    node.addEventListener('animationend', function() { node.remove(); });
  }

  function renderOverlay() {
    var show = game.status === 'over' || (game.status === 'won' && !game.keepGoing);
    el.overlay.hidden = !show;
    if (!show) return;
    if (game.status === 'won') {
      el.overlayTitle.textContent = 'You reached 2048!';
      el.overlayMsg.textContent = 'Score ' + game.score + '. Keep going for a bigger tile?';
      el.overlayMain.textContent = 'Keep going';
      el.overlayAlt.hidden = false;
    } else {
      el.overlayTitle.textContent = 'Game over';
      el.overlayMsg.textContent = 'No moves left. Score ' + game.score + '.';
      el.overlayMain.textContent = 'Try again';
      el.overlayAlt.hidden = true;
    }
    el.status.textContent = el.overlayTitle.textContent + ' ' + el.overlayMsg.textContent;
    try { el.overlayMain.focus({preventScroll: true}); } catch (e) { /* old browsers */ }
  }

  function render(animate) {
    renderBoard(animate);
    renderHud();
    // Let the last slide land before covering the board
    if (animate && SLIDE_MS && (game.status !== 'playing')) {
      setTimeout(renderOverlay, SLIDE_MS + 150);
    } else {
      renderOverlay();
    }
  }

  /* ═══════════════════════════════════════════
     Input
     ═══════════════════════════════════════════ */

  function doMove(dir) {
    flush();
    var gained = move(dir);
    if (gained < 0) return;
    el.status.textContent = '';
    render(true);
    showGain(gained);
  }

  function restart() {
    clearBoard();
    newGame();
    el.status.textContent = '';
    render(false);
  }

  var KEYS = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    a: 'left', A: 'left', d: 'right', D: 'right', w: 'up', W: 'up', s: 'down', S: 'down'
  };

  function isFormField(t) {
    return t && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName));
  }

  // The board owns the arrow keys whenever most of it is on screen
  function boardInView() {
    var r = el.board.getBoundingClientRect();
    var visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    return visible >= r.height / 2;
  }

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || isFormField(e.target)) return;
    if ((e.key === 'u' || e.key === 'U') && !e.repeat) {
      if (undo()) { clearBoard(); render(false); }
      return;
    }
    var dir = KEYS[e.key];
    if (!dir || !boardInView()) return;
    e.preventDefault();
    doMove(dir);
  });

  var swipe = null;
  el.board.addEventListener('pointerdown', function(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    swipe = {id: e.pointerId, x: e.clientX, y: e.clientY};
  });
  el.board.addEventListener('pointermove', function(e) {
    if (!swipe || e.pointerId !== swipe.id) return;
    var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    swipe = null; // one move per gesture
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left');
    else doMove(dy > 0 ? 'down' : 'up');
  });
  function endSwipe() { swipe = null; }
  el.board.addEventListener('pointerup', endSwipe);
  el.board.addEventListener('pointercancel', endSwipe);

  el.newGame.addEventListener('click', restart);
  el.undo.addEventListener('click', function() {
    if (undo()) { clearBoard(); render(false); }
  });
  el.overlayMain.addEventListener('click', function() {
    if (game.status === 'won') {
      game.keepGoing = true;
      game.status = canMove(game.grid) ? 'playing' : 'over';
      save();
      render(false);
    } else {
      restart();
    }
  });
  el.overlayAlt.addEventListener('click', restart);

  if (!restore()) newGame();
  render(false);
})();
