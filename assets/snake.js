/* ── Snake ──
   State machine: idle → playing ⇄ paused → over | won.
   The snake moves one cell per tick on a 20 × 20 grid. Turns are queued (up
   to three) so quick double-taps aren't lost, and a turn is only accepted if
   it isn't a reversal of the direction before it. Game logic never touches
   the DOM; draw() turns state into pixels. */
(function() {
  'use strict';

  var root = document.getElementById('sn-game');
  if (!root) return;

  var el = {
    wrap: document.getElementById('sn-wrap'),
    board: document.getElementById('sn-board'),
    score: document.getElementById('sn-score'),
    best: document.getElementById('sn-best'),
    speed: document.getElementById('sn-speed'),
    walls: document.getElementById('sn-walls'),
    newGame: document.getElementById('sn-new'),
    pause: document.getElementById('sn-pause'),
    overlay: document.getElementById('sn-overlay'),
    overlayTitle: document.getElementById('sn-overlay-title'),
    overlayMsg: document.getElementById('sn-overlay-msg'),
    overlayBtn: document.getElementById('sn-overlay-btn'),
    pad: document.getElementById('sn-pad'),
    status: document.getElementById('sn-status')
  };

  var SIZE = 20;
  var CELLS = SIZE * SIZE;
  var START_LEN = 3;
  var QUEUE_MAX = 3;
  var SPEEDS = {slow: 150, normal: 110, fast: 75}; // ms per step at the start
  var MIN_FACTOR = 0.6;                             // fastest = 60% of that
  var STORE_PREFIX = 'jn.snake.v1.';
  var DIRS = {up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]};

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  /* ═══════════════════════════════════════════
     Storage (best score per speed + wall mode, settings)
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
    status: 'idle',   // 'idle' | 'playing' | 'paused' | 'over' | 'won'
    speed: SPEEDS[storeGet('speed')] ? storeGet('speed') : 'normal',
    wrap: storeGet('walls') === 'wrap',
    snake: [],        // cell indexes, head first
    occupied: new Uint8Array(CELLS),
    dir: 'right',
    queue: [],
    food: -1,
    score: 0,
    best: 0,
    startBest: 0,
    acc: 0,           // ms accumulated toward the next step
    eatenAt: -1       // time of the last bite, for the head "gulp"
  };

  function bestKey() {
    return 'best.' + game.speed + '.' + (game.wrap ? 'wrap' : 'walls');
  }

  function stepMs() {
    var factor = Math.max(MIN_FACTOR, Math.pow(0.985, game.score));
    return SPEEDS[game.speed] * factor;
  }

  function newGame() {
    var row = SIZE >> 1, col = (SIZE >> 1) - 3;
    game.snake = [];
    game.occupied = new Uint8Array(CELLS);
    for (var i = 0; i < START_LEN; i++) {
      var idx = row * SIZE + col + (START_LEN - 1 - i);
      game.snake.push(idx);
      game.occupied[idx] = 1;
    }
    game.dir = 'right';
    game.queue = [];
    game.score = 0;
    game.best = game.startBest = Number(storeGet(bestKey())) || 0;
    game.acc = 0;
    game.eatenAt = -1;
    placeFood();
  }

  function placeFood() {
    var free = CELLS - game.snake.length;
    if (free <= 0) { game.food = -1; return; }
    // Pick the k-th free cell: uniform, and no retry loop on a full board
    var k = Math.floor(Math.random() * free);
    for (var i = 0; i < CELLS; i++) {
      if (game.occupied[i]) continue;
      if (k-- === 0) { game.food = i; return; }
    }
  }

  function opposite(a, b) {
    return DIRS[a][0] === -DIRS[b][0] && DIRS[a][1] === -DIRS[b][1];
  }

  // Queues a turn, checked against the last queued direction
  function turn(dir) {
    var last = game.queue.length ? game.queue[game.queue.length - 1] : game.dir;
    if (dir === last || opposite(dir, last)) return;
    if (game.queue.length < QUEUE_MAX) game.queue.push(dir);
  }

  // One step; returns 'ok' | 'ate' | 'dead' | 'won'
  function step() {
    if (game.queue.length) game.dir = game.queue.shift();
    var head = game.snake[0];
    var r = (head / SIZE) | 0, c = head % SIZE;
    r += DIRS[game.dir][1];
    c += DIRS[game.dir][0];
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) {
      if (!game.wrap) return 'dead';
      r = (r + SIZE) % SIZE;
      c = (c + SIZE) % SIZE;
    }
    var next = r * SIZE + c;
    var eating = next === game.food;
    var tail = game.snake[game.snake.length - 1];

    // The tail moves out of the way this step unless we're growing, so
    // following your own tail closely is legal
    if (game.occupied[next] && !(next === tail && !eating)) return 'dead';

    if (!eating) {
      game.snake.pop();
      game.occupied[tail] = 0;
    }
    game.snake.unshift(next);
    game.occupied[next] = 1;

    if (!eating) return 'ok';
    game.score++;
    if (game.score > game.best) game.best = game.score;
    if (game.snake.length === CELLS) return 'won';
    placeFood();
    return 'ate';
  }

  /* ═══════════════════════════════════════════
     Loop and flow
     ═══════════════════════════════════════════ */

  var rafId = 0, lastTime = 0, clock = 0;

  function frame(now) {
    rafId = 0;
    if (game.status !== 'playing') return;
    var dt = lastTime ? Math.min(now - lastTime, 100) : 0;
    lastTime = now;
    clock += dt;
    game.acc += dt;
    var interval = stepMs();
    while (game.acc >= interval && game.status === 'playing') {
      game.acc -= interval;
      var result = step();
      if (result === 'ate') game.eatenAt = clock;
      else if (result === 'dead') finish('over');
      else if (result === 'won') finish('won');
      interval = stepMs();
    }
    render();
    if (game.status === 'playing') rafId = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    lastTime = 0;
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    newGame();
    game.status = 'playing';
    hideOverlay();
    focusBoard();
    render();
    startLoop();
  }

  function finish(status) {
    game.status = status;
    if (game.score > game.startBest) storeSet(bestKey(), game.score);
    showOverlay();
  }

  function pause() {
    if (game.status !== 'playing') return;
    game.status = 'paused';
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

  // Changing speed or walls mid-game would make the score meaningless, so
  // settings apply to a fresh (idle) board
  function applySettings() {
    game.speed = SPEEDS[el.speed.value] ? el.speed.value : 'normal';
    game.wrap = el.walls.value === 'wrap';
    storeSet('speed', game.speed);
    storeSet('walls', game.wrap ? 'wrap' : 'walls');
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    newGame();
    game.status = 'idle';
    showOverlay();
    render();
  }

  /* ═══════════════════════════════════════════
     Rendering
     ═══════════════════════════════════════════ */

  var ctx = el.board.getContext('2d');
  var cell = 20;
  var palette = {};

  function readPalette() {
    var cs = getComputedStyle(root);
    function v(name) { return cs.getPropertyValue(name).trim(); }
    palette = {
      bg: v('--sn-bg'), tile: v('--sn-tile'), body: v('--sn-body'), head: v('--sn-head'),
      eye: v('--sn-eye'), food: v('--sn-food'), dead: v('--sn-dead'), wall: v('--sn-wall')
    };
  }

  function layout() {
    var availW = el.wrap.clientWidth;
    var availH = window.innerHeight - (el.pad.offsetHeight ? el.pad.offsetHeight + 230 : 210);
    cell = Math.floor(Math.min(availW, availH, 520) / SIZE);
    cell = Math.max(12, cell);
    var px = cell * SIZE;
    var dpr = window.devicePixelRatio || 1;
    el.board.style.width = px + 'px';
    el.board.style.height = px + 'px';
    el.board.width = Math.round(px * dpr);
    el.board.height = Math.round(px * dpr);
    ctx.setTransform(el.board.width / px, 0, 0, el.board.height / px, 0, 0);
    render();
  }

  function center(i) {
    return [(i % SIZE + 0.5) * cell, (((i / SIZE) | 0) + 0.5) * cell];
  }

  function adjacent(a, b) {
    var ar = (a / SIZE) | 0, br = (b / SIZE) | 0;
    return Math.abs(ar - br) + Math.abs(a % SIZE - b % SIZE) === 1;
  }

  function draw() {
    var px = cell * SIZE;
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, px, px);

    // Checkerboard
    ctx.fillStyle = palette.tile;
    for (var r = 0; r < SIZE; r++) {
      for (var c = (r & 1); c < SIZE; c += 2) ctx.fillRect(c * cell, r * cell, cell, cell);
    }

    // Food, gently pulsing
    if (game.food >= 0 && game.status !== 'idle') {
      var f = center(game.food);
      var pulse = reduceMotion ? 0 : Math.sin(clock / 180) * 0.04;
      ctx.fillStyle = palette.food;
      ctx.beginPath();
      ctx.arc(f[0], f[1], cell * (0.34 + pulse), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(f[0] - cell * 0.11, f[1] - cell * 0.11, cell * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }

    drawSnake();
  }

  // The body is a thick rounded polyline through cell centres, broken where
  // it wraps around an edge
  function drawSnake() {
    var s = game.snake, n = s.length;
    if (!n) return;
    var dead = game.status === 'over';

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = cell * 0.72;
    ctx.strokeStyle = dead ? palette.dead : palette.body;
    ctx.beginPath();
    var p = center(s[0]);
    ctx.moveTo(p[0], p[1]);
    for (var i = 1; i < n; i++) {
      p = center(s[i]);
      if (adjacent(s[i - 1], s[i])) ctx.lineTo(p[0], p[1]);
      else ctx.moveTo(p[0], p[1]);
    }
    // A lone point still needs a dot
    ctx.lineTo(p[0] + 0.01, p[1]);
    ctx.stroke();

    // Head, briefly swelling after a bite
    var h = center(s[0]);
    var gulp = game.eatenAt >= 0 && !reduceMotion ? Math.max(0, 1 - (clock - game.eatenAt) / 160) : 0;
    ctx.fillStyle = dead ? palette.dead : palette.head;
    ctx.beginPath();
    ctx.arc(h[0], h[1], cell * (0.44 + 0.06 * gulp), 0, Math.PI * 2);
    ctx.fill();

    // Eyes look where the snake is heading
    var d = DIRS[game.dir];
    var side = [-d[1], d[0]];
    ctx.fillStyle = palette.eye;
    for (var k = -1; k <= 1; k += 2) {
      var ex = h[0] + d[0] * cell * 0.14 + side[0] * k * cell * 0.19;
      var ey = h[1] + d[1] * cell * 0.14 + side[1] * k * cell * 0.19;
      ctx.beginPath();
      ctx.arc(ex, ey, cell * 0.085, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  var shown = {};
  function setText(node, key, value) {
    if (shown[key] === value) return;
    shown[key] = value;
    node.textContent = value;
  }

  function render() {
    draw();
    setText(el.score, 'score', String(game.score));
    setText(el.best, 'best', String(Math.max(game.best, game.score)));
    el.pause.disabled = game.status !== 'playing' && game.status !== 'paused';
    setText(el.pause, 'pause', game.status === 'paused' ? 'Resume' : 'Pause');
    root.dataset.status = game.status;
    root.dataset.walls = game.wrap ? 'wrap' : 'walls';
  }

  function showOverlay() {
    var title, msg, btn;
    var newBest = game.score > game.startBest && game.score > 0 ? ' New best!' : '';
    if (game.status === 'paused') {
      title = 'Paused'; msg = 'Press P, Space or Esc to resume.'; btn = 'Resume';
    } else if (game.status === 'over') {
      title = 'Game over'; msg = 'Score ' + game.score + '.' + newBest; btn = 'Play again';
    } else if (game.status === 'won') {
      title = 'You filled the board!'; msg = 'Score ' + game.score + '.' + newBest; btn = 'Play again';
    } else {
      title = 'Snake'; msg = coarse ? 'Swipe or use the arrows to steer.' : 'Press Enter to start. Arrows or WASD to steer.'; btn = 'Start';
    }
    el.overlayTitle.textContent = title;
    el.overlayMsg.textContent = msg;
    el.overlayBtn.textContent = btn;
    el.overlay.hidden = false;
    if (game.status === 'over' || game.status === 'won') el.status.textContent = title + ' ' + msg;
  }

  function hideOverlay() {
    el.overlay.hidden = true;
    el.status.textContent = '';
  }

  function focusBoard() {
    try { el.board.focus({preventScroll: true}); } catch (e) { el.board.focus(); }
  }

  /* ═══════════════════════════════════════════
     Input
     ═══════════════════════════════════════════ */

  var KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
    ' ': 'pause', p: 'pause', P: 'pause', Escape: 'pause'
  };

  function isFormField(t) {
    return t && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName));
  }

  // While playing, every game key is claimed so nothing scrolls the page
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || isFormField(e.target)) return;
    var action = KEYS[e.key];

    if (game.status === 'playing') {
      if (!action) return;
      e.preventDefault();
      if (action === 'pause') { if (!e.repeat) pause(); }
      else turn(action);
      return;
    }

    if (game.status === 'paused' && (action === 'pause' || e.key === 'Enter')) {
      e.preventDefault();
      if (!e.repeat) resume();
      return;
    }

    if (e.key === 'Enter' && game.status !== 'paused' &&
        (e.target === document.body || e.target === el.board)) {
      e.preventDefault();
      start();
    }
  });

  el.overlayBtn.addEventListener('click', function() {
    if (game.status === 'paused') resume();
    else start();
  });
  el.newGame.addEventListener('click', start);
  el.pause.addEventListener('click', function() {
    if (game.status === 'playing') pause();
    else resume();
  });

  el.speed.value = game.speed;
  el.walls.value = game.wrap ? 'wrap' : 'walls';
  el.speed.addEventListener('change', applySettings);
  el.walls.addEventListener('change', applySettings);

  // Swipes on the board: each 22px of travel in a direction is a turn, so
  // one continuous gesture can steer several times
  var swipe = null;
  el.board.addEventListener('pointerdown', function(e) {
    if (e.pointerType === 'mouse' || game.status !== 'playing') return;
    e.preventDefault();
    swipe = {id: e.pointerId, x: e.clientX, y: e.clientY};
  });
  el.board.addEventListener('pointermove', function(e) {
    if (!swipe || e.pointerId !== swipe.id) return;
    var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 'right' : 'left');
    else turn(dy > 0 ? 'down' : 'up');
    swipe.x = e.clientX;
    swipe.y = e.clientY;
  });
  function endSwipe(e) {
    if (swipe && e.pointerId === swipe.id) swipe = null;
  }
  el.board.addEventListener('pointerup', endSwipe);
  el.board.addEventListener('pointercancel', endSwipe);

  // D-pad for touch screens
  Array.prototype.forEach.call(el.pad.querySelectorAll('[data-dir]'), function(btn) {
    btn.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      if (game.status === 'idle' || game.status === 'over' || game.status === 'won') start();
      else if (game.status === 'paused') resume();
      turn(btn.dataset.dir);
    });
    btn.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  });

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

  new MutationObserver(function() {
    readPalette();
    render();
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
  newGame();
  layout();
  showOverlay();
})();
