/* ── Color Lines ──
   The 1992 puzzle game (a.k.a. Lines 98). Move a ball to any cell it can
   reach through empty cells; five or more of one colour in a row, column or
   diagonal clear. A move that clears nothing brings three more balls, shown in
   advance. The game ends when the board fills up.
   Board state is a flat array indexed by r * SIZE + c. Game logic never
   touches the DOM; render() turns state into DOM updates. */
(function() {
  'use strict';

  var root = document.getElementById('ln-game');
  if (!root) return;

  var el = {
    board: document.getElementById('ln-board'),
    restart: document.getElementById('ln-restart'),
    mode: document.getElementById('ln-mode'),
    score: document.getElementById('ln-score'),
    best: document.getElementById('ln-best'),
    next: document.getElementById('ln-next'),
    status: document.getElementById('ln-status')
  };

  var SIZE = 9;
  var CELLS = SIZE * SIZE;
  var COLORS = 7;
  var LINE = 5;       // balls in a row needed to clear
  var START = 5;      // balls on a fresh board
  var SPAWN = 3;      // balls added after a move that clears nothing
  var EMPTY = -1;
  var STEP_MS = 38;   // per cell while a ball travels
  var CLEAR_MS = 300; // matches the ln-clear animation
  var STORE_PREFIX = 'jn.lines.v1.';
  var COLOR_NAMES = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta', 'brown'];
  var DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ═══════════════════════════════════════════
     Storage (best score per mode, last mode)
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

  var state = {
    mode: storeGet('mode') === 'straight' ? 'straight' : 'classic',
    board: [],
    next: [],
    score: 0,
    best: 0,
    startBest: 0,     // best score when this game began
    selected: -1,
    moving: null,     // {idx, color} while a ball is travelling
    fresh: [],        // just-spawned cells, for the pop-in animation
    clearing: [],     // cells animating out
    busy: false,      // an animation is running; input is ignored
    over: false,
    game: 0           // bumped by newGame so a running animation can tell it's stale
  };

  function row(i) { return Math.floor(i / SIZE); }
  function col(i) { return i % SIZE; }

  function randColor() { return Math.floor(Math.random() * COLORS); }

  function emptyCells(board) {
    var out = [];
    for (var i = 0; i < CELLS; i++) if (board[i] === EMPTY) out.push(i);
    return out;
  }

  function randomEmpty(board) {
    var empties = emptyCells(board);
    return empties.length ? empties[Math.floor(Math.random() * empties.length)] : -1;
  }

  function neighbors(i) {
    var r = row(i), c = col(i), out = [];
    if (r > 0) out.push(i - SIZE);
    if (r < SIZE - 1) out.push(i + SIZE);
    if (c > 0) out.push(i - 1);
    if (c < SIZE - 1) out.push(i + 1);
    return out;
  }

  // Cells from `from` to `to` inclusive, or null if the ball can't get there.
  function findPath(board, from, to, mode) {
    if (board[to] !== EMPTY) return null;
    var path, i;

    if (mode === 'straight') {
      var dr = Math.sign(row(to) - row(from)), dc = Math.sign(col(to) - col(from));
      if (dr !== 0 && dc !== 0) return null;
      path = [from];
      for (i = from; i !== to;) {
        i += dr * SIZE + dc;
        if (board[i] !== EMPTY) return null;
        path.push(i);
      }
      return path;
    }

    // Breadth-first search through empty cells: the shortest route
    var prev = new Array(CELLS);
    prev[from] = from;
    var queue = [from];
    while (queue.length && prev[to] === undefined) {
      var cur = queue.shift();
      var ns = neighbors(cur);
      for (var k = 0; k < ns.length; k++) {
        var n = ns[k];
        if (prev[n] === undefined && board[n] === EMPTY) {
          prev[n] = cur;
          queue.push(n);
        }
      }
    }
    if (prev[to] === undefined) return null;
    path = [to];
    for (i = to; i !== from;) {
      i = prev[i];
      path.unshift(i);
    }
    return path;
  }

  // Every cell in a run of LINE+ matching the ball at idx, in any direction
  function linesThrough(board, idx) {
    var color = board[idx];
    if (color === EMPTY) return [];
    var out = [];
    for (var d = 0; d < DIRS.length; d++) {
      var run = [idx];
      for (var s = -1; s <= 1; s += 2) {
        var r = row(idx) + DIRS[d][0] * s, c = col(idx) + DIRS[d][1] * s;
        while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r * SIZE + c] === color) {
          run.push(r * SIZE + c);
          r += DIRS[d][0] * s;
          c += DIRS[d][1] * s;
        }
      }
      if (run.length >= LINE) out = out.concat(run);
    }
    return unique(out);
  }

  function unique(list) {
    return list.filter(function(v, i) { return list.indexOf(v) === i; });
  }

  // Longer lines and crossing lines are worth disproportionately more:
  // 5 → 10, 6 → 24, 7 → 42, a 5+5 cross (9 balls) → 90
  function points(n) {
    return n * (n - 4) * 2;
  }

  // Any ball with an empty neighbour can move, in either mode
  function canMove(board) {
    for (var i = 0; i < CELLS; i++) {
      if (board[i] === EMPTY) continue;
      var ns = neighbors(i);
      for (var k = 0; k < ns.length; k++) if (board[ns[k]] === EMPTY) return true;
    }
    return false;
  }

  function rollNext() {
    var next = [];
    for (var i = 0; i < SPAWN; i++) next.push(randColor());
    return next;
  }

  function newBoard() {
    var board;
    do {
      board = [];
      for (var i = 0; i < CELLS; i++) board.push(EMPTY);
      for (var n = 0; n < START; n++) board[randomEmpty(board)] = randColor();
    } while (board.some(function(v, i) { return linesThrough(board, i).length; }));
    return board;
  }

  /* ═══════════════════════════════════════════
     Turn flow
     ═══════════════════════════════════════════ */

  function newGame() {
    state.game++;
    state.board = newBoard();
    state.next = rollNext();
    state.score = 0;
    state.best = state.startBest = Number(storeGet('best.' + state.mode)) || 0;
    state.selected = -1;
    state.moving = null;
    state.fresh = [];
    state.clearing = [];
    state.busy = false;
    state.over = false;
    setStatus('');
    render();
  }

  function onCell(i) {
    if (state.busy || state.over) return;
    var board = state.board;

    if (board[i] !== EMPTY) {
      state.selected = state.selected === i ? -1 : i;
      setStatus('');
      render();
      return;
    }
    if (state.selected < 0) return;

    var path = findPath(board, state.selected, i, state.mode);
    if (!path) {
      setStatus(state.mode === 'straight'
        ? 'Balls move in a straight line, and the way must be clear.'
        : 'No open path to that cell.');
      flashBlocked(i);
      return;
    }

    var color = board[state.selected];
    state.selected = -1;
    state.fresh = [];
    state.busy = true;
    setStatus('');
    travel(path, color, function() {
      board[i] = color;
      var cleared = linesThrough(board, i);
      if (!cleared.length) return spawn(endTurn);
      clear(cleared, function() {
        // Never leave the player with an empty board
        if (emptyCells(board).length === CELLS) spawn(endTurn);
        else endTurn();
      });
    });
  }

  function travel(path, color, done) {
    state.board[path[0]] = EMPTY;
    if (reduceMotion) return done();
    var k = 0, game = state.game;
    (function step() {
      if (game !== state.game) return;
      state.moving = {idx: path[k], color: color};
      render();
      if (++k < path.length) return setTimeout(step, STEP_MS);
      setTimeout(function() {
        if (game !== state.game) return;
        state.moving = null;
        done();
      }, STEP_MS);
    })();
  }

  function clear(cells, done) {
    state.score += points(cells.length);
    if (state.score > state.best) {
      state.best = state.score;
      storeSet('best.' + state.mode, state.best);
    }
    function finish() {
      cells.forEach(function(c) { state.board[c] = EMPTY; });
      state.clearing = [];
      done();
    }
    if (reduceMotion) return finish();
    state.clearing = cells;
    render();
    var game = state.game;
    setTimeout(function() {
      if (game === state.game) finish();
    }, CLEAR_MS);
  }

  function spawn(done) {
    var board = state.board, placed = [];
    for (var n = 0; n < state.next.length; n++) {
      var idx = randomEmpty(board);
      if (idx < 0) break;
      board[idx] = state.next[n];
      placed.push(idx);
    }
    state.next = rollNext();
    state.fresh = placed;

    // New balls can complete lines too; those score like any other
    var cleared = [];
    placed.forEach(function(idx) { cleared = cleared.concat(linesThrough(board, idx)); });
    cleared = unique(cleared);
    if (cleared.length) clear(cleared, done);
    else done();
  }

  function endTurn() {
    state.busy = false;
    if (!emptyCells(state.board).length || !canMove(state.board)) {
      state.over = true;
      var best = state.score > state.startBest ? ' New best!' : '';
      setStatus('Game over! No room left. Final score: ' + state.score + '.' + best);
    }
    render();
  }

  /* ═══════════════════════════════════════════
     Rendering
     ═══════════════════════════════════════════ */

  var cellEls = [];
  var focusIdx = 40; // centre cell holds the board's single tab stop

  function buildBoard() {
    el.board.textContent = '';
    for (var i = 0; i < CELLS; i++) {
      var cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'ln-cell';
      cell.dataset.idx = i;
      var ball = document.createElement('span');
      ball.className = 'ln-ball';
      ball.setAttribute('aria-hidden', 'true');
      cell.appendChild(ball);
      el.board.appendChild(cell);
      cellEls.push(cell);
    }
  }

  function render() {
    var board = state.board;
    for (var i = 0; i < CELLS; i++) {
      var color = board[i];
      if (state.moving && state.moving.idx === i) color = state.moving.color;
      var cell = cellEls[i], ball = cell.firstChild;

      if (color === EMPTY) ball.removeAttribute('data-color');
      else ball.setAttribute('data-color', color);

      cell.classList.toggle('is-selected', state.selected === i);
      cell.classList.toggle('is-new', state.fresh.indexOf(i) !== -1);
      cell.classList.toggle('is-clearing', state.clearing.indexOf(i) !== -1);
      cell.tabIndex = i === focusIdx ? 0 : -1;
      cell.setAttribute('aria-label', 'Row ' + (row(i) + 1) + ', column ' + (col(i) + 1) + ': ' +
        (color === EMPTY ? 'empty' : COLOR_NAMES[color] + ' ball' +
          (state.selected === i ? ', selected' : '')));
    }

    var nextBalls = el.next.children;
    for (var n = 0; n < nextBalls.length; n++) {
      nextBalls[n].setAttribute('data-color', state.next[n]);
    }
    el.next.setAttribute('aria-label', 'Next balls: ' +
      state.next.map(function(c) { return COLOR_NAMES[c]; }).join(', '));

    el.score.textContent = state.score;
    el.best.textContent = state.best;
    el.board.dataset.status = state.over ? 'over' : 'playing';
  }

  function setStatus(msg) {
    el.status.textContent = msg;
  }

  function flashBlocked(i) {
    var cell = cellEls[i];
    cell.classList.remove('is-blocked');
    void cell.offsetWidth; // restart the animation
    cell.classList.add('is-blocked');
  }

  /* ═══════════════════════════════════════════
     Input
     ═══════════════════════════════════════════ */

  el.board.addEventListener('click', function(e) {
    var cell = e.target.closest('.ln-cell');
    if (!cell) return;
    focusIdx = Number(cell.dataset.idx);
    onCell(focusIdx);
  });

  el.board.addEventListener('animationend', function(e) {
    if (e.animationName === 'ln-shake') e.target.classList.remove('is-blocked');
  });

  // Arrow keys move focus around the grid; Enter/Space click natively
  el.board.addEventListener('keydown', function(e) {
    var r = row(focusIdx), c = col(focusIdx);
    if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
    else if (e.key === 'ArrowDown') r = Math.min(SIZE - 1, r + 1);
    else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
    else if (e.key === 'ArrowRight') c = Math.min(SIZE - 1, c + 1);
    else return;
    e.preventDefault();
    focusIdx = r * SIZE + c;
    render();
    cellEls[focusIdx].focus();
  });

  el.restart.addEventListener('click', newGame);

  el.mode.value = state.mode;
  el.mode.addEventListener('change', function() {
    state.mode = el.mode.value === 'straight' ? 'straight' : 'classic';
    storeSet('mode', state.mode);
    newGame();
  });

  buildBoard();
  newGame();
})();
