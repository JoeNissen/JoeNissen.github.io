/* ── Mini Games ── */
(function() {

  // Utility: get computed CSS var colors
  function getAccent() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7aa2f7';
  }
  function getBg() {
    return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0b0e14';
  }
  function getFg() {
    return getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || '#e6e6eb';
  }
  function getMuted() {
    return getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#9aa0b4';
  }

  // Utility: check if element is visible in viewport (for arrow key locking)
  function isInViewport(el) {
    var rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  /* ═══════════════════════════════════════════
     GAME 1: SNAKE
     ═══════════════════════════════════════════ */
  (function() {
    var canvas = document.getElementById('snake-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var size = 15;
    var cols = canvas.width / size;
    var rows = canvas.height / size;
    var snake, dir, nextDir, food, score, gameOver, interval, started;
    var baseSpeed = 100;
    var restartBtn = document.getElementById('snake-restart');

    function drawStartScreen() {
      ctx.fillStyle = getBg();
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = 'rgba(122,162,247,0.05)';
      ctx.lineWidth = 0.5;
      for (var i = 0; i <= cols; i++) {
        ctx.beginPath(); ctx.moveTo(i*size,0); ctx.lineTo(i*size,canvas.height); ctx.stroke();
      }
      for (var j = 0; j <= rows; j++) {
        ctx.beginPath(); ctx.moveTo(0,j*size); ctx.lineTo(canvas.width,j*size); ctx.stroke();
      }

      ctx.fillStyle = getFg();
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Snake', canvas.width/2, canvas.height/2 - 15);
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = getMuted();
      ctx.fillText('Press Start to play', canvas.width/2, canvas.height/2 + 15);
    }

    function init() {
      snake = [{x: Math.floor(cols/2), y: Math.floor(rows/2)}];
      dir = {x: 1, y: 0};
      nextDir = {x: 1, y: 0};
      score = 0;
      gameOver = false;
      started = false;
      document.getElementById('snake-score').textContent = '0';
      if (interval) clearInterval(interval);
      placeFood();
      drawStartScreen();
      restartBtn.textContent = 'Start';
    }

    function start() {
      if (started && !gameOver) return;
      snake = [{x: Math.floor(cols/2), y: Math.floor(rows/2)}];
      dir = {x: 1, y: 0};
      nextDir = {x: 1, y: 0};
      score = 0;
      gameOver = false;
      started = true;
      document.getElementById('snake-score').textContent = '0';
      placeFood();
      if (interval) clearInterval(interval);
      interval = setInterval(tick, baseSpeed);
      restartBtn.textContent = 'Restart';
      draw();
    }

    function placeFood() {
      do {
        food = {x: Math.floor(Math.random()*cols), y: Math.floor(Math.random()*rows)};
      } while (snake.some(function(s) { return s.x === food.x && s.y === food.y; }));
    }

    function tick() {
      if (gameOver) return;
      // Apply queued direction
      dir = nextDir;
      var head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
      if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
        gameOver = true; draw(); clearInterval(interval); restartBtn.textContent = 'Restart'; return;
      }
      if (snake.some(function(s) { return s.x === head.x && s.y === head.y; })) {
        gameOver = true; draw(); clearInterval(interval); restartBtn.textContent = 'Restart'; return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score++;
        document.getElementById('snake-score').textContent = score;
        placeFood();
        // Speed up slightly as score increases
        clearInterval(interval);
        var speed = Math.max(50, baseSpeed - Math.floor(score / 3) * 5);
        interval = setInterval(tick, speed);
      } else {
        snake.pop();
      }
      draw();
    }

    function draw() {
      var accent = getAccent();
      var bg = getBg();
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = 'rgba(122,162,247,0.05)';
      ctx.lineWidth = 0.5;
      for (var i = 0; i <= cols; i++) {
        ctx.beginPath(); ctx.moveTo(i*size,0); ctx.lineTo(i*size,canvas.height); ctx.stroke();
      }
      for (var j = 0; j <= rows; j++) {
        ctx.beginPath(); ctx.moveTo(0,j*size); ctx.lineTo(canvas.width,j*size); ctx.stroke();
      }

      // Snake
      snake.forEach(function(s, idx) {
        ctx.fillStyle = idx === 0 ? accent : 'rgba(122,162,247,0.6)';
        ctx.fillRect(s.x*size+1, s.y*size+1, size-2, size-2);
      });

      // Food
      ctx.fillStyle = '#f7768e';
      ctx.beginPath();
      ctx.arc(food.x*size+size/2, food.y*size+size/2, size/2-2, 0, Math.PI*2);
      ctx.fill();

      if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width/2, canvas.height/2);
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Score: ' + score, canvas.width/2, canvas.height/2 + 25);
      }
    }

    document.addEventListener('keydown', function(e) {
      if (!started || !isInViewport(canvas)) return;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key) === -1) return;
      e.preventDefault();
      if (e.key === 'ArrowUp' && dir.y !== 1) nextDir = {x:0, y:-1};
      if (e.key === 'ArrowDown' && dir.y !== -1) nextDir = {x:0, y:1};
      if (e.key === 'ArrowLeft' && dir.x !== 1) nextDir = {x:-1, y:0};
      if (e.key === 'ArrowRight' && dir.x !== -1) nextDir = {x:1, y:0};
    });

    // Touch swipe for mobile
    var touchStart = null;
    canvas.addEventListener('touchstart', function(e) {
      touchStart = {x: e.touches[0].clientX, y: e.touches[0].clientY};
    }, {passive: true});
    canvas.addEventListener('touchend', function(e) {
      if (!touchStart || !started) return;
      var dx = e.changedTouches[0].clientX - touchStart.x;
      var dy = e.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 20 && dir.x !== -1) nextDir = {x:1, y:0};
        else if (dx < -20 && dir.x !== 1) nextDir = {x:-1, y:0};
      } else {
        if (dy > 20 && dir.y !== -1) nextDir = {x:0, y:1};
        else if (dy < -20 && dir.y !== 1) nextDir = {x:0, y:-1};
      }
      touchStart = null;
    }, {passive: true});

    restartBtn.addEventListener('click', function() {
      if (!started || gameOver) {
        start();
      } else {
        init();
        start();
      }
    });
    init();
  })();


  /* ═══════════════════════════════════════════
     GAME 2: MINESWEEPER
     ═══════════════════════════════════════════ */
  (function() {
    var gridEl = document.getElementById('minesweeper-grid');
    if (!gridEl) return;
    var statusEl = document.getElementById('mine-status');
    var configs = {
      beginner:      {rows: 9,  cols: 9,  mines: 10},
      intermediate:  {rows: 16, cols: 16, mines: 40},
      expert:        {rows: 16, cols: 30, mines: 99},
      custom:        {rows: 20, cols: 30, mines: 145}
    };
    var board, revealed, flagged, mineSet, gameActive, firstClick;
    var cfg;
    var mineCount, flagCount;

    function init() {
      var diff = document.getElementById('mine-difficulty').value;
      cfg = configs[diff];
      board = [];
      revealed = [];
      flagged = [];
      mineSet = new Set();
      gameActive = true;
      firstClick = true;
      flagCount = 0;
      mineCount = cfg.mines;
      statusEl.textContent = 'Mines: ' + mineCount + ' | Flags: 0';

      gridEl.innerHTML = '';
      gridEl.style.gridTemplateColumns = 'repeat(' + cfg.cols + ', 1fr)';

      for (var r = 0; r < cfg.rows; r++) {
        board[r] = [];
        revealed[r] = [];
        flagged[r] = [];
        for (var c = 0; c < cfg.cols; c++) {
          board[r][c] = 0;
          revealed[r][c] = false;
          flagged[r][c] = false;
          var cell = document.createElement('button');
          cell.className = 'mine-cell';
          cell.dataset.r = r;
          cell.dataset.c = c;
          cell.addEventListener('click', onCellClick);
          cell.addEventListener('contextmenu', onCellRightClick);
          gridEl.appendChild(cell);
        }
      }
    }

    function placeMines(safeR, safeC) {
      var placed = 0;
      while (placed < cfg.mines) {
        var r = Math.floor(Math.random() * cfg.rows);
        var c = Math.floor(Math.random() * cfg.cols);
        var key = r + ',' + c;
        if (!mineSet.has(key) && !(Math.abs(r-safeR) <= 1 && Math.abs(c-safeC) <= 1)) {
          mineSet.add(key);
          board[r][c] = -1;
          placed++;
        }
      }
      for (var r = 0; r < cfg.rows; r++) {
        for (var c = 0; c < cfg.cols; c++) {
          if (board[r][c] === -1) continue;
          var count = 0;
          for (var dr = -1; dr <= 1; dr++) {
            for (var dc = -1; dc <= 1; dc++) {
              var nr = r+dr, nc = c+dc;
              if (nr >= 0 && nr < cfg.rows && nc >= 0 && nc < cfg.cols && board[nr][nc] === -1) count++;
            }
          }
          board[r][c] = count;
        }
      }
    }

    function getCell(r, c) {
      return gridEl.children[r * cfg.cols + c];
    }

    function reveal(r, c) {
      if (r < 0 || r >= cfg.rows || c < 0 || c >= cfg.cols) return;
      if (revealed[r][c] || flagged[r][c]) return;
      revealed[r][c] = true;
      var cell = getCell(r, c);
      cell.classList.add('revealed');
      if (board[r][c] === -1) {
        cell.classList.add('mine');
        cell.textContent = '\u2739';
        return;
      }
      if (board[r][c] > 0) {
        cell.textContent = board[r][c];
        cell.dataset.count = board[r][c];
      } else {
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            reveal(r+dr, c+dc);
          }
        }
      }
    }

    function checkWin() {
      var unrevealed = 0;
      for (var r = 0; r < cfg.rows; r++) {
        for (var c = 0; c < cfg.cols; c++) {
          if (!revealed[r][c]) unrevealed++;
        }
      }
      return unrevealed === cfg.mines;
    }

    function onCellClick(e) {
      if (!gameActive) return;
      var r = parseInt(e.target.dataset.r);
      var c = parseInt(e.target.dataset.c);
      if (flagged[r][c]) return;

      if (firstClick) {
        firstClick = false;
        placeMines(r, c);
      }

      if (board[r][c] === -1) {
        gameActive = false;
        mineSet.forEach(function(key) {
          var parts = key.split(',');
          reveal(parseInt(parts[0]), parseInt(parts[1]));
        });
        statusEl.textContent = 'Game Over! Click New Game to retry.';
        return;
      }

      reveal(r, c);
      if (checkWin()) {
        gameActive = false;
        statusEl.textContent = 'You Win!';
      }
    }

    function onCellRightClick(e) {
      e.preventDefault();
      if (!gameActive) return;
      var r = parseInt(e.target.dataset.r);
      var c = parseInt(e.target.dataset.c);
      if (revealed[r][c]) return;
      flagged[r][c] = !flagged[r][c];
      var cell = getCell(r, c);
      cell.classList.toggle('flagged');
      cell.textContent = flagged[r][c] ? '\u2691' : '';
      flagCount += flagged[r][c] ? 1 : -1;
      statusEl.textContent = 'Mines: ' + mineCount + ' | Flags: ' + flagCount;
    }

    // Prevent scrolling when right-clicking on the grid
    gridEl.addEventListener('contextmenu', function(e) { e.preventDefault(); });

    document.getElementById('mine-restart').addEventListener('click', init);
    document.getElementById('mine-difficulty').addEventListener('change', init);
    init();
  })();


  /* ═══════════════════════════════════════════
     GAME 3: 2048
     ═══════════════════════════════════════════ */
  (function() {
    var gridEl = document.getElementById('grid-2048');
    if (!gridEl) return;
    var scoreEl = document.getElementById('game-2048-score');
    var restartBtn = document.getElementById('game-2048-restart');
    var grid, score, moved, gameOver, started;

    function drawStartScreen() {
      gridEl.innerHTML = '';
      for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 4; c++) {
          var tile = document.createElement('div');
          tile.className = 'tile-2048';
          gridEl.appendChild(tile);
        }
      }
      // Overlay message
      var overlay = document.createElement('div');
      overlay.className = 'game-overlay-2048';
      overlay.innerHTML = '<strong>2048</strong><br>Press Start to play';
      gridEl.appendChild(overlay);
      restartBtn.textContent = 'Start';
    }

    function init() {
      grid = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
      score = 0;
      gameOver = false;
      started = false;
      scoreEl.textContent = '0';
      drawStartScreen();
    }

    function startGame() {
      started = true;
      gameOver = false;
      grid = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
      score = 0;
      scoreEl.textContent = '0';
      addTile();
      addTile();
      render();
      restartBtn.textContent = 'Restart';
    }

    function addTile() {
      var empty = [];
      for (var r = 0; r < 4; r++)
        for (var c = 0; c < 4; c++)
          if (grid[r][c] === 0) empty.push({r:r, c:c});
      if (empty.length === 0) return;
      var cell = empty[Math.floor(Math.random() * empty.length)];
      grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
    }

    function render() {
      gridEl.innerHTML = '';
      for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 4; c++) {
          var tile = document.createElement('div');
          tile.className = 'tile-2048';
          var val = grid[r][c];
          if (val > 0) {
            tile.textContent = val;
            tile.dataset.value = val;
          }
          gridEl.appendChild(tile);
        }
      }
      if (gameOver) {
        var overlay = document.createElement('div');
        overlay.className = 'game-overlay-2048';
        overlay.innerHTML = '<strong>Game Over</strong><br>Score: ' + score;
        gridEl.appendChild(overlay);
      }
    }

    function slideRow(row) {
      var filtered = row.filter(function(v) { return v !== 0; });
      var result = [];
      for (var i = 0; i < filtered.length; i++) {
        if (i + 1 < filtered.length && filtered[i] === filtered[i+1]) {
          var merged = filtered[i] * 2;
          result.push(merged);
          score += merged;
          i++;
          moved = true;
        } else {
          result.push(filtered[i]);
        }
      }
      while (result.length < 4) result.push(0);
      for (var j = 0; j < 4; j++) {
        if (result[j] !== row[j]) moved = true;
      }
      return result;
    }

    function canMove() {
      for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 4; c++) {
          if (grid[r][c] === 0) return true;
          if (c < 3 && grid[r][c] === grid[r][c+1]) return true;
          if (r < 3 && grid[r][c] === grid[r+1][c]) return true;
        }
      }
      return false;
    }

    function move(direction) {
      if (!direction || gameOver) return;
      moved = false;
      if (direction === 'left') {
        for (var r = 0; r < 4; r++) grid[r] = slideRow(grid[r]);
      } else if (direction === 'right') {
        for (var r = 0; r < 4; r++) grid[r] = slideRow(grid[r].slice().reverse()).reverse();
      } else if (direction === 'up') {
        for (var c = 0; c < 4; c++) {
          var col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
          var res = slideRow(col);
          for (var r = 0; r < 4; r++) grid[r][c] = res[r];
        }
      } else if (direction === 'down') {
        for (var c = 0; c < 4; c++) {
          var col = [grid[3][c], grid[2][c], grid[1][c], grid[0][c]];
          var res = slideRow(col);
          for (var r = 0; r < 4; r++) grid[3-r][c] = res[r];
        }
      }
      if (moved) {
        addTile();
        scoreEl.textContent = score;
        if (!canMove()) {
          gameOver = true;
        }
      }
      render();
    }

    document.addEventListener('keydown', function(e) {
      if (!started || gameOver || !isInViewport(gridEl)) return;
      var map = {ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down'};
      if (map[e.key]) {
        e.preventDefault();
        move(map[e.key]);
      }
    });

    // Touch swipe
    var ts = null;
    gridEl.addEventListener('touchstart', function(e) {
      if (!started) return;
      ts = {x: e.touches[0].clientX, y: e.touches[0].clientY};
    }, {passive: true});
    gridEl.addEventListener('touchend', function(e) {
      if (!ts || !started) return;
      var dx = e.changedTouches[0].clientX - ts.x;
      var dy = e.changedTouches[0].clientY - ts.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        move(dx > 20 ? 'right' : dx < -20 ? 'left' : '');
      } else {
        move(dy > 20 ? 'down' : dy < -20 ? 'up' : '');
      }
      ts = null;
    }, {passive: true});

    restartBtn.addEventListener('click', function() {
      if (!started || gameOver) {
        startGame();
      } else {
        startGame();
      }
    });
    init();
  })();


  /* ═══════════════════════════════════════════
     GAME 4: TETRIS
     ═══════════════════════════════════════════ */
  (function() {
    var canvas = document.getElementById('tetris-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var scoreEl = document.getElementById('tetris-score');
    var levelEl = document.getElementById('tetris-level');
    var restartBtn = document.getElementById('tetris-restart');
    var COLS = 10, ROWS = 20, BLOCK = 20;
    var board, piece, nextPiece, score, level, lines, gameOver, dropInterval, lastDrop;
    var started, animId;

    var PIECES = [
      {shape: [[1,1,1,1]], color: '#7aa2f7'},         // I
      {shape: [[1,1],[1,1]], color: '#f7c948'},         // O
      {shape: [[0,1,0],[1,1,1]], color: '#bb9af7'},     // T
      {shape: [[1,0,0],[1,1,1]], color: '#ff9e64'},     // L
      {shape: [[0,0,1],[1,1,1]], color: '#7dcfff'},     // J
      {shape: [[0,1,1],[1,1,0]], color: '#9ece6a'},     // S
      {shape: [[1,1,0],[0,1,1]], color: '#f7768e'}      // Z
    ];

    function drawStartScreen() {
      ctx.fillStyle = getBg();
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(122,162,247,0.05)';
      ctx.lineWidth = 0.5;
      for (var c = 0; c <= COLS; c++) {
        ctx.beginPath(); ctx.moveTo(c*BLOCK, 0); ctx.lineTo(c*BLOCK, canvas.height); ctx.stroke();
      }
      for (var r = 0; r <= ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r*BLOCK); ctx.lineTo(canvas.width, r*BLOCK); ctx.stroke();
      }

      ctx.fillStyle = getFg();
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tetris', canvas.width/2, canvas.height/2 - 15);
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = getMuted();
      ctx.fillText('Press Start to play', canvas.width/2, canvas.height/2 + 15);
    }

    function init() {
      if (animId) cancelAnimationFrame(animId);
      started = false;
      gameOver = false;
      score = 0; level = 1; lines = 0;
      scoreEl.textContent = '0';
      levelEl.textContent = '1';
      restartBtn.textContent = 'Start';
      drawStartScreen();
    }

    function startGame() {
      board = [];
      for (var r = 0; r < ROWS; r++) {
        board[r] = [];
        for (var c = 0; c < COLS; c++) board[r][c] = null;
      }
      score = 0; level = 1; lines = 0;
      gameOver = false;
      started = true;
      scoreEl.textContent = '0';
      levelEl.textContent = '1';
      dropInterval = 1000;
      lastDrop = Date.now();
      piece = newPiece();
      nextPiece = newPiece();
      restartBtn.textContent = 'Restart';
      if (animId) cancelAnimationFrame(animId);
      animId = requestAnimationFrame(loop);
    }

    function newPiece() {
      var p = PIECES[Math.floor(Math.random() * PIECES.length)];
      return {
        shape: p.shape.map(function(row) { return row.slice(); }),
        color: p.color,
        x: Math.floor(COLS / 2) - Math.floor(p.shape[0].length / 2),
        y: 0
      };
    }

    function valid(shape, px, py) {
      for (var r = 0; r < shape.length; r++) {
        for (var c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          var nx = px + c, ny = py + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
          if (ny >= 0 && board[ny][nx]) return false;
        }
      }
      return true;
    }

    function lock() {
      for (var r = 0; r < piece.shape.length; r++) {
        for (var c = 0; c < piece.shape[r].length; c++) {
          if (!piece.shape[r][c]) continue;
          var ny = piece.y + r;
          if (ny < 0) { gameOver = true; return; }
          board[ny][piece.x + c] = piece.color;
        }
      }
      var cleared = 0;
      for (var r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(function(cell) { return cell !== null; })) {
          board.splice(r, 1);
          var newRow = [];
          for (var c = 0; c < COLS; c++) newRow.push(null);
          board.unshift(newRow);
          cleared++;
          r++;
        }
      }
      if (cleared > 0) {
        var pts = [0, 100, 300, 500, 800];
        score += (pts[cleared] || 800) * level;
        lines += cleared;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        scoreEl.textContent = score;
        levelEl.textContent = level;
      }
      piece = nextPiece;
      nextPiece = newPiece();
      if (!valid(piece.shape, piece.x, piece.y)) {
        gameOver = true;
      }
    }

    function rotate(shape) {
      var rows = shape.length, cols = shape[0].length;
      var rotated = [];
      for (var c = 0; c < cols; c++) {
        rotated[c] = [];
        for (var r = rows - 1; r >= 0; r--) {
          rotated[c].push(shape[r][c]);
        }
      }
      return rotated;
    }

    function hardDrop() {
      while (valid(piece.shape, piece.x, piece.y + 1)) {
        piece.y++;
      }
      lock();
      lastDrop = Date.now();
    }

    function draw() {
      var bg = getBg();
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(122,162,247,0.05)';
      ctx.lineWidth = 0.5;
      for (var c = 0; c <= COLS; c++) {
        ctx.beginPath(); ctx.moveTo(c*BLOCK, 0); ctx.lineTo(c*BLOCK, canvas.height); ctx.stroke();
      }
      for (var r = 0; r <= ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r*BLOCK); ctx.lineTo(canvas.width, r*BLOCK); ctx.stroke();
      }

      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          if (board[r][c]) {
            ctx.fillStyle = board[r][c];
            ctx.fillRect(c*BLOCK+1, r*BLOCK+1, BLOCK-2, BLOCK-2);
          }
        }
      }

      // Ghost piece (preview where piece will land)
      if (piece && !gameOver) {
        var ghostY = piece.y;
        while (valid(piece.shape, piece.x, ghostY + 1)) ghostY++;
        if (ghostY !== piece.y) {
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = piece.color;
          for (var r = 0; r < piece.shape.length; r++) {
            for (var c = 0; c < piece.shape[r].length; c++) {
              if (piece.shape[r][c]) {
                ctx.fillRect((piece.x+c)*BLOCK+1, (ghostY+r)*BLOCK+1, BLOCK-2, BLOCK-2);
              }
            }
          }
          ctx.globalAlpha = 1;
        }
      }

      // Current piece
      if (piece) {
        ctx.fillStyle = piece.color;
        for (var r = 0; r < piece.shape.length; r++) {
          for (var c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c]) {
              ctx.fillRect((piece.x+c)*BLOCK+1, (piece.y+r)*BLOCK+1, BLOCK-2, BLOCK-2);
            }
          }
        }
      }

      if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width/2, canvas.height/2);
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Score: ' + score, canvas.width/2, canvas.height/2 + 25);
        restartBtn.textContent = 'Restart';
      }
    }

    function loop() {
      if (gameOver) { draw(); return; }
      var now = Date.now();
      if (now - lastDrop > dropInterval) {
        if (valid(piece.shape, piece.x, piece.y + 1)) {
          piece.y++;
        } else {
          lock();
        }
        lastDrop = now;
      }
      draw();
      animId = requestAnimationFrame(loop);
    }

    document.addEventListener('keydown', function(e) {
      if (!started || gameOver || !piece || !isInViewport(canvas)) return;
      if (e.key === 'ArrowLeft') {
        if (valid(piece.shape, piece.x - 1, piece.y)) { piece.x--; e.preventDefault(); }
      } else if (e.key === 'ArrowRight') {
        if (valid(piece.shape, piece.x + 1, piece.y)) { piece.x++; e.preventDefault(); }
      } else if (e.key === 'ArrowDown') {
        if (valid(piece.shape, piece.x, piece.y + 1)) { piece.y++; lastDrop = Date.now(); e.preventDefault(); }
      } else if (e.key === 'ArrowUp') {
        var rot = rotate(piece.shape);
        if (valid(rot, piece.x, piece.y)) { piece.shape = rot; e.preventDefault(); }
      } else if (e.key === ' ') {
        e.preventDefault();
        hardDrop();
      }
    });

    restartBtn.addEventListener('click', function() {
      if (!started || gameOver) {
        startGame();
      } else {
        startGame();
      }
    });
    init();
  })();


  /* ═══════════════════════════════════════════
     GAME 5: CONWAY'S GAME OF LIFE
     ═══════════════════════════════════════════ */
  (function() {
    var canvas = document.getElementById('life-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var genEl = document.getElementById('life-gen');
    var CELL = 6;
    var cols = Math.floor(canvas.width / CELL);
    var rows = Math.floor(canvas.height / CELL);
    var grid, running, gen, intervalId;

    function makeGrid() {
      var g = [];
      for (var r = 0; r < rows; r++) {
        g[r] = [];
        for (var c = 0; c < cols; c++) g[r][c] = 0;
      }
      return g;
    }

    function init() {
      grid = makeGrid();
      running = false;
      gen = 0;
      genEl.textContent = '0';
      if (intervalId) clearInterval(intervalId);
      document.getElementById('life-play').textContent = 'Play';
      draw();
    }

    function randomize() {
      grid = makeGrid();
      for (var r = 0; r < rows; r++)
        for (var c = 0; c < cols; c++)
          grid[r][c] = Math.random() < 0.3 ? 1 : 0;
      gen = 0;
      genEl.textContent = '0';
      draw();
    }

    function step() {
      var next = makeGrid();
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var neighbors = 0;
          for (var dr = -1; dr <= 1; dr++) {
            for (var dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              var nr = (r + dr + rows) % rows;
              var nc = (c + dc + cols) % cols;
              neighbors += grid[nr][nc];
            }
          }
          if (grid[r][c]) {
            next[r][c] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
          } else {
            next[r][c] = neighbors === 3 ? 1 : 0;
          }
        }
      }
      grid = next;
      gen++;
      genEl.textContent = gen;
      draw();
    }

    function draw() {
      var bg = getBg();
      var accent = getAccent();
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle grid
      ctx.strokeStyle = 'rgba(122,162,247,0.04)';
      ctx.lineWidth = 0.5;
      for (var c = 0; c <= cols; c++) {
        ctx.beginPath(); ctx.moveTo(c*CELL, 0); ctx.lineTo(c*CELL, canvas.height); ctx.stroke();
      }
      for (var r = 0; r <= rows; r++) {
        ctx.beginPath(); ctx.moveTo(0, r*CELL); ctx.lineTo(canvas.width, r*CELL); ctx.stroke();
      }

      ctx.fillStyle = accent;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (grid[r][c]) {
            ctx.fillRect(c*CELL, r*CELL, CELL-1, CELL-1);
          }
        }
      }
    }

    // Allow drawing/erasing cells by clicking and dragging
    var isDrawing = false;
    var drawValue = 1;

    canvas.addEventListener('mousedown', function(e) {
      if (running) return;
      var rect = canvas.getBoundingClientRect();
      var c = Math.floor((e.clientX - rect.left) / CELL);
      var r = Math.floor((e.clientY - rect.top) / CELL);
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        drawValue = grid[r][c] ? 0 : 1;
        grid[r][c] = drawValue;
        isDrawing = true;
        draw();
      }
    });

    canvas.addEventListener('mousemove', function(e) {
      if (!isDrawing || running) return;
      var rect = canvas.getBoundingClientRect();
      var c = Math.floor((e.clientX - rect.left) / CELL);
      var r = Math.floor((e.clientY - rect.top) / CELL);
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        grid[r][c] = drawValue;
        draw();
      }
    });

    document.addEventListener('mouseup', function() {
      isDrawing = false;
    });

    document.getElementById('life-play').addEventListener('click', function() {
      running = !running;
      this.textContent = running ? 'Pause' : 'Play';
      if (running) {
        var speed = parseInt(document.getElementById('life-speed').value);
        intervalId = setInterval(step, speed);
      } else {
        clearInterval(intervalId);
      }
    });

    document.getElementById('life-speed').addEventListener('input', function() {
      if (running) {
        clearInterval(intervalId);
        intervalId = setInterval(step, parseInt(this.value));
      }
    });

    document.getElementById('life-clear').addEventListener('click', init);
    document.getElementById('life-random').addEventListener('click', randomize);

    init();
  })();


  /* ═══════════════════════════════════════════
     GAME 6: TYPING SPEED TEST
     ═══════════════════════════════════════════ */
  (function() {
    var displayEl = document.getElementById('typing-display');
    if (!displayEl) return;
    var inputEl = document.getElementById('typing-input');
    var wpmEl = document.getElementById('typing-wpm');
    var accEl = document.getElementById('typing-acc');

    var sentences = [
      "The quick brown fox jumps over the lazy dog.",
      "To be or not to be, that is the question.",
      "All that glitters is not gold.",
      "A journey of a thousand miles begins with a single step.",
      "In the middle of difficulty lies opportunity.",
      "The only way to do great work is to love what you do.",
      "Code is like humor. When you have to explain it, it is bad.",
      "First, solve the problem. Then, write the code.",
      "Experience is the name everyone gives to their mistakes.",
      "Simplicity is the soul of efficiency.",
      "Programs must be written for people to read.",
      "Any fool can write code that a computer can understand.",
      "Talk is cheap. Show me the code.",
      "The best error message is the one that never shows up.",
      "Make it work, make it right, make it fast."
    ];

    var currentText, startTime, finished;

    function init() {
      currentText = sentences[Math.floor(Math.random() * sentences.length)];
      startTime = null;
      finished = false;
      inputEl.value = '';
      inputEl.disabled = false;
      wpmEl.textContent = '0';
      accEl.textContent = '100%';
      renderDisplay('');
      inputEl.focus();
    }

    function renderDisplay(typed) {
      var html = '';
      for (var i = 0; i < currentText.length; i++) {
        if (i < typed.length) {
          if (typed[i] === currentText[i]) {
            html += '<span class="correct">' + escapeHtml(currentText[i]) + '</span>';
          } else {
            html += '<span class="incorrect">' + escapeHtml(currentText[i]) + '</span>';
          }
        } else if (i === typed.length) {
          html += '<span class="cursor-char">' + escapeHtml(currentText[i]) + '</span>';
        } else {
          html += '<span class="untyped">' + escapeHtml(currentText[i]) + '</span>';
        }
      }
      displayEl.innerHTML = html;
    }

    function escapeHtml(ch) {
      if (ch === '<') return '&lt;';
      if (ch === '>') return '&gt;';
      if (ch === '&') return '&amp;';
      if (ch === ' ') return '&nbsp;';
      return ch;
    }

    inputEl.addEventListener('input', function() {
      if (finished) return;
      var typed = inputEl.value;
      if (!startTime && typed.length > 0) startTime = Date.now();

      renderDisplay(typed);

      if (startTime) {
        var elapsed = (Date.now() - startTime) / 60000;
        var words = typed.length / 5;
        var wpm = elapsed > 0 ? Math.round(words / elapsed) : 0;
        wpmEl.textContent = wpm;

        var correct = 0;
        for (var i = 0; i < typed.length; i++) {
          if (typed[i] === currentText[i]) correct++;
        }
        var accuracy = typed.length > 0 ? Math.round((correct / typed.length) * 100) : 100;
        accEl.textContent = accuracy + '%';
      }

      if (typed.length >= currentText.length) {
        finished = true;
        inputEl.disabled = true;
      }
    });

    // Prevent tab from leaving the input when typing
    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
      }
    });

    document.getElementById('typing-restart').addEventListener('click', init);
    init();
  })();

})();
