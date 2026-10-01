/* ── Color Lines ──
   The 1992 puzzle game (a.k.a. Lines 98). Move a ball to any cell it can
   reach through empty cells; five or more of one colour in a row, column or
   diagonal clear. A move that clears nothing brings three more balls, shown in
   advance. The game ends when the board fills up.
   Board state is a flat array indexed by r * SIZE + c. Game logic never
   touches the DOM; render() turns state into DOM updates. The game in
   progress is saved, so a reload picks up where it left off. */
(function() {
  'use strict';

  var root = document.getElementById('ln-game');
  if (!root) return;

  var el = {
    board: document.getElementById('ln-board'),
    restart: document.getElementById('ln-restart'),
    undo: document.getElementById('ln-undo'),
    mode: document.getElementById('ln-mode'),
    score: document.getElementById('ln-score'),
    best: document.getElementById('ln-best'),
    gain: document.getElementById('ln-gain'),
    next: document.getElementById('ln-next'),
    status: document.getElementById('ln-status'),
    mover: document.getElementById('ln-mover'),
    overlay: document.getElementById('ln-overlay'),
    overlayMsg: document.getElementById('ln-overlay-msg'),
    overlayMain: document.getElementById('ln-overlay-main'),
    overlayUndo: document.getElementById('ln-overlay-undo')
  };

  var SIZE = 9;
  var CELLS = SIZE * SIZE;
  var COLORS = 7;
  var LINE = 5;       // balls in a row needed to clear
  var START = 5;      // balls on a fresh board
  var SPAWN = 3;      // balls added after a move that clears nothing
  var EMPTY = -1;
  var STEP_MS = 42;   // per cell while a ball glides along its path
  var MAX_TRAVEL_MS = 700;
  var CLEAR_MS = 300; // matches the ln-clear animation
  var STORE_PREFIX = 'jn.lines.v1.';
  var COLOR_NAMES = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta', 'brown'];
  var DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  var MODES = {classic: true, straight: true};

  var reduceMotion = document.documentElement.classList.contains('reduce-motion');

  /* ═══════════════════════════════════════════
     Storage (best score per mode, last mode, game in progress)
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

  var state = {
    mode: storeGet('mode') === 'straight' ? 'straight' : 'classic',
    board: [],
    next: [],
    score: 0,
    best: 0,
    startBest: 0,     // best score when this game began
    moves: 0,         // moves made this game
    selected: -1,
    reachable: null,  // cells the selected ball can move to
    moving: null,     // the travelling ball's Animation, while one is running
    fresh: [],        // just-spawned cells, for the pop-in animation
    clearing: [],     // cells animating out
    busy: false,      // an animation is running; input is ignored
    over: false,
    undo: null,       // {board, next, score, moves} before the last move
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

  // Every empty cell the ball at `from` could move to
  function reachableFrom(board, from, mode) {
    var seen = {}, out = [];
    if (mode === 'straight') {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function(d) {
        var r = row(from) + d[0], c = col(from) + d[1];
        while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r * SIZE + c] === EMPTY) {
          out.push(r * SIZE + c);
          r += d[0];
          c += d[1];
        }
      });
      return out;
    }
    var queue = [from];
    seen[from] = true;
    while (queue.length) {
      var ns = neighbors(queue.shift());
      for (var k = 0; k < ns.length; k++) {
        var n = ns[k];
        if (!seen[n] && board[n] === EMPTY) {
          seen[n] = true;
          out.push(n);
          queue.push(n);
        }
      }
    }
    return out;
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

  function loadBest() {
    state.best = state.startBest = Number(storeGet('best.' + state.mode)) || 0;
  }

  // The board survives a reload; a finished game is forgotten
  function save() {
    storeSet('game', state.over ? null : JSON.stringify({
      mode: state.mode, board: state.board, next: state.next,
      score: state.score, moves: state.moves
    }));
  }

  function restore() {
    try {
      var s = JSON.parse(storeGet('game'));
      var isColor = function(v) { return v === (v | 0) && v >= 0 && v < COLORS; };
      if (!s || !MODES[s.mode] || !Array.isArray(s.board) || s.board.length !== CELLS ||
          !s.board.every(function(v) { return v === EMPTY || isColor(v); }) ||
          !Array.isArray(s.next) || s.next.length !== SPAWN || !s.next.every(isColor) ||
          typeof s.score !== 'number' || s.score < 0 ||
          !emptyCells(s.board).length || !canMove(s.board)) return false;
      state.mode = s.mode;
      state.board = s.board;
      state.next = s.next;
      state.score = s.score;
      state.moves = Number(s.moves) || 1;
      loadBest();
      state.best = Math.max(state.best, state.score);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ═══════════════════════════════════════════
     Turn flow
     ═══════════════════════════════════════════ */

  function resetTurnState() {
    state.game++;
    state.selected = -1;
    state.reachable = null;
    if (state.moving) state.moving.cancel();
    state.moving = null;
    el.mover.hidden = true;
    state.fresh = [];
    state.clearing = [];
    state.busy = false;
    state.over = false;
    state.undo = null;
  }

  function newGame() {
    resetTurnState();
    state.mode = MODES[el.mode.value] ? el.mode.value : 'classic';
    state.board = newBoard();
    state.next = rollNext();
    state.score = 0;
    state.moves = 0;
    loadBest();
    save();
    setStatus('');
    render();
  }

  function select(i) {
    state.selected = i;
    state.reachable = i < 0 ? null : reachableFrom(state.board, i, state.mode);
  }

  function onCell(i) {
    if (state.busy || state.over) return;
    var board = state.board;

    if (board[i] !== EMPTY) {
      select(state.selected === i ? -1 : i);
      setStatus(state.selected >= 0 && !state.reachable.length ? 'That ball is boxed in.' : '');
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

    state.undo = {board: board.slice(), next: state.next.slice(), score: state.score, moves: state.moves};
    var color = board[state.selected];
    select(-1);
    state.fresh = [];
    state.busy = true;
    state.moves++;
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

  // A stand-in ball glides through the centre of each cell on the path,
  // easing in and out over the whole trip, then lands in the target cell
  function travel(path, color, done) {
    state.board[path[0]] = EMPTY;
    if (reduceMotion || !el.mover.animate) return done();

    var stage = el.mover.parentNode.getBoundingClientRect();
    var frames = path.map(function(i) {
      var r = cellEls[i].getBoundingClientRect();
      var x = r.left - stage.left + r.width / 2, y = r.top - stage.top + r.height / 2;
      return {transform: 'translate(' + x + 'px, ' + y + 'px) translate(-50%, -50%)'};
    });
    var size = cellEls[path[0]].getBoundingClientRect().width * 0.74;
    el.mover.style.width = el.mover.style.height = size + 'px';
    el.mover.setAttribute('data-color', color);
    el.mover.hidden = false;
    render(); // the ball has left its old cell

    var game = state.game;
    state.moving = el.mover.animate(frames, {
      duration: Math.min(120 + STEP_MS * (path.length - 1), MAX_TRAVEL_MS),
      easing: 'ease-in-out',
      fill: 'forwards'
    });
    state.moving.onfinish = function() {
      if (game !== state.game) return;
      state.moving = null;
      done(); // draws the ball in its new cell...
      el.mover.hidden = true; // ...in the same frame the stand-in goes
    };
  }

  function clear(cells, done) {
    var gained = points(cells.length);
    state.score += gained;
    if (state.score > state.best) {
      state.best = state.score;
      storeSet('best.' + state.mode, state.best);
    }
    showGain(gained);
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
      setStatus(''); // the overlay says it
    }
    save();
    render();
  }

  function undo() {
    if (!state.undo || state.busy) return false;
    var u = state.undo;
    resetTurnState();
    state.board = u.board;
    state.next = u.next;
    state.score = u.score;
    state.moves = u.moves;
    save();
    setStatus('');
    render();
    return true;
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
    var reach = {};
    if (state.reachable) state.reachable.forEach(function(i) { reach[i] = true; });

    for (var i = 0; i < CELLS; i++) {
      var color = board[i];
      var cell = cellEls[i], ball = cell.firstChild;

      if (color === EMPTY) ball.removeAttribute('data-color');
      else ball.setAttribute('data-color', color);

      cell.classList.toggle('is-selected', state.selected === i);
      // Straight moves reach few cells, so mark those; open-path moves reach
      // most cells, so mark the ones they can't
      var hint = state.reachable && color === EMPTY;
      cell.classList.toggle('is-reachable', !!(hint && state.mode === 'straight' && reach[i]));
      cell.classList.toggle('is-unreachable', !!(hint && state.mode !== 'straight' && !reach[i]));
      cell.classList.toggle('is-new', state.fresh.indexOf(i) !== -1);
      cell.classList.toggle('is-clearing', state.clearing.indexOf(i) !== -1);
      cell.tabIndex = i === focusIdx ? 0 : -1;
      cell.setAttribute('aria-label', 'Row ' + (row(i) + 1) + ', column ' + (col(i) + 1) + ': ' +
        (color === EMPTY ? 'empty' + (reach[i] ? ', reachable' : '') : COLOR_NAMES[color] + ' ball' +
          (state.selected === i ? ', selected' : '')));
    }

    var nextBalls = el.next.querySelectorAll('.ln-ball');
    for (var n = 0; n < nextBalls.length; n++) {
      nextBalls[n].setAttribute('data-color', state.next[n]);
    }
    el.next.setAttribute('aria-label', 'Next balls: ' +
      state.next.map(function(c) { return COLOR_NAMES[c]; }).join(', '));

    el.score.textContent = state.score;
    el.best.textContent = state.best;
    el.undo.disabled = !state.undo || state.busy;
    el.board.dataset.status = state.over ? 'over' : 'playing';
    root.dataset.mode = state.mode;
    renderOverlay();
  }

  function renderOverlay() {
    el.overlay.hidden = !state.over;
    if (!state.over) return;
    el.overlayMsg.textContent = 'Final score ' + state.score + '.' +
      (state.score > state.startBest ? ' New best!' : '');
    el.overlayUndo.hidden = !state.undo;
  }

  function setStatus(msg) {
    el.status.textContent = msg;
  }

  function showGain(n) {
    if (!n || reduceMotion) return;
    var node = document.createElement('span');
    node.className = 'ln-gain-float';
    node.textContent = '+' + n;
    el.gain.appendChild(node);
    node.addEventListener('animationend', function() { node.remove(); });
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

  // Arrow keys move focus around the grid; Enter/Space click natively;
  // Escape drops the selection
  el.board.addEventListener('keydown', function(e) {
    var r = row(focusIdx), c = col(focusIdx);
    if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
    else if (e.key === 'ArrowDown') r = Math.min(SIZE - 1, r + 1);
    else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
    else if (e.key === 'ArrowRight') c = Math.min(SIZE - 1, c + 1);
    else if (e.key === 'Escape' && state.selected >= 0 && !state.busy) {
      select(-1);
      render();
      return;
    } else {
      return;
    }
    e.preventDefault();
    focusIdx = r * SIZE + c;
    render();
    cellEls[focusIdx].focus();
  });

  function isFormField(t) {
    return t && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName));
  }

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isFormField(e.target)) return;
    if (e.key === 'u' || e.key === 'U') {
      if (undo()) e.preventDefault();
    }
  });

  el.restart.addEventListener('click', newGame);
  el.overlayMain.addEventListener('click', function() {
    newGame();
    cellEls[focusIdx].focus({preventScroll: true});
  });
  el.undo.addEventListener('click', undo);
  el.overlayUndo.addEventListener('click', undo);

  // Switching rules mid-game would wipe it out, so a game in progress keeps
  // its rules and the new ones start with the next game
  el.mode.addEventListener('change', function() {
    var mode = MODES[el.mode.value] ? el.mode.value : 'classic';
    storeSet('mode', mode);
    if (state.moves === 0 || state.over) {
      newGame();
    } else if (mode !== state.mode) {
      setStatus('The new movement rule starts with your next game.');
    } else {
      setStatus('');
    }
  });

  buildBoard();
  if (restore()) {
    resetTurnState();
    el.mode.value = state.mode;
    render();
  } else {
    el.mode.value = state.mode;
    newGame();
  }
})();
