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
    var snake, dir, nextDir, food, score, gameOver, won, interval, started;
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
      won = false;
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
      won = false;
      started = true;
      document.getElementById('snake-score').textContent = '0';
      placeFood();
      if (interval) clearInterval(interval);
      interval = setInterval(tick, baseSpeed);
      restartBtn.textContent = 'Restart';
      draw();
    }

    function placeFood() {
      // Build list of empty cells to avoid infinite loop if snake fills board
      var empty = [];
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (!snake.some(function(s) { return s.x === c && s.y === r; })) {
            empty.push({x: c, y: r});
          }
        }
      }
      if (empty.length === 0) {
        // Snake filled the board — player wins
        gameOver = true;
        won = true;
        clearInterval(interval);
        restartBtn.textContent = 'Restart';
        draw();
        return;
      }
      food = empty[Math.floor(Math.random() * empty.length)];
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
        ctx.fillText(won ? 'You Win!' : 'Game Over', canvas.width/2, canvas.height/2);
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Score: ' + score, canvas.width/2, canvas.height/2 + 25);
      }
    }

    document.addEventListener('keydown', function(e) {
      if (!started || gameOver || !isInViewport(canvas)) return;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key) === -1) return;
      e.preventDefault();
      if (e.key === 'ArrowUp' && dir.y !== 1) nextDir = {x:0, y:-1};
      if (e.key === 'ArrowDown' && dir.y !== -1) nextDir = {x:0, y:1};
      if (e.key === 'ArrowLeft' && dir.x !== 1) nextDir = {x:-1, y:0};
      if (e.key === 'ArrowRight' && dir.x !== -1) nextDir = {x:1, y:0};
    });

    // Touch swipe for mobile — prevent page scrolling while swiping on canvas
    var touchStart = null;
    canvas.addEventListener('touchstart', function(e) {
      if (!started || gameOver) return;
      touchStart = {x: e.touches[0].clientX, y: e.touches[0].clientY};
    }, {passive: true});
    canvas.addEventListener('touchmove', function(e) {
      if (!started || gameOver || !touchStart) return;
      e.preventDefault();
    }, {passive: false});
    canvas.addEventListener('touchend', function(e) {
      if (!touchStart || !started || gameOver) return;
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
    var board;       // 2D array: -1 = mine, 0-8 = neighbor count
    var revealed;    // 2D bool
    var flagged;     // 2D bool
    var gameActive;
    var firstClick;
    var cfg;
    var totalMines, flagCount;

    function init() {
      var diff = document.getElementById('mine-difficulty').value;
      cfg = configs[diff];
      var totalCells = cfg.rows * cfg.cols;

      // Clamp mines so there's always room for the safe zone
      totalMines = Math.min(cfg.mines, totalCells - 9);

      board = [];
      revealed = [];
      flagged = [];
      gameActive = true;
      firstClick = true;
      flagCount = 0;
      statusEl.textContent = 'Mines: ' + totalMines + ' | Flags: 0';

      gridEl.innerHTML = '';
      gridEl.style.gridTemplateColumns = 'repeat(' + cfg.cols + ', 28px)';

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
          gridEl.appendChild(cell);
        }
      }

      // Use event delegation on the grid instead of per-cell listeners
    }

    function placeMines(safeR, safeC) {
      // Build list of all valid positions (excluding 3x3 safe zone)
      var candidates = [];
      for (var r = 0; r < cfg.rows; r++) {
        for (var c = 0; c < cfg.cols; c++) {
          if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
          candidates.push({r: r, c: c});
        }
      }

      // Fisher-Yates shuffle then take first N
      for (var i = candidates.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = candidates[i];
        candidates[i] = candidates[j];
        candidates[j] = tmp;
      }

      var toPlace = Math.min(totalMines, candidates.length);
      for (var i = 0; i < toPlace; i++) {
        board[candidates[i].r][candidates[i].c] = -1;
      }

      // Calculate neighbor counts
      for (var r = 0; r < cfg.rows; r++) {
        for (var c = 0; c < cfg.cols; c++) {
          if (board[r][c] === -1) continue;
          var count = 0;
          for (var dr = -1; dr <= 1; dr++) {
            for (var dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              var nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < cfg.rows && nc >= 0 && nc < cfg.cols && board[nr][nc] === -1) {
                count++;
              }
            }
          }
          board[r][c] = count;
        }
      }
    }

    function getCell(r, c) {
      return gridEl.children[r * cfg.cols + c];
    }

    // Iterative reveal to avoid stack overflow on large boards
    function reveal(r, c) {
      var stack = [{r: r, c: c}];

      while (stack.length > 0) {
        var pos = stack.pop();
        var pr = pos.r, pc = pos.c;

        if (pr < 0 || pr >= cfg.rows || pc < 0 || pc >= cfg.cols) continue;
        if (revealed[pr][pc] || flagged[pr][pc]) continue;

        revealed[pr][pc] = true;
        var cell = getCell(pr, pc);
        cell.classList.add('revealed');

        if (board[pr][pc] === -1) {
          cell.classList.add('mine');
          cell.innerHTML = '\u{1F4A3}';
          continue;
        }

        if (board[pr][pc] > 0) {
          cell.textContent = board[pr][pc];
          cell.dataset.count = board[pr][pc];
        } else {
          // Empty cell — push all 8 neighbors
          for (var dr = -1; dr <= 1; dr++) {
            for (var dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              stack.push({r: pr + dr, c: pc + dc});
            }
          }
        }
      }
    }

    function countMines() {
      var count = 0;
      for (var r = 0; r < cfg.rows; r++) {
        for (var c = 0; c < cfg.cols; c++) {
          if (board[r][c] === -1) count++;
        }
      }
      return count;
    }

    function checkWin() {
      var unrevealed = 0;
      for (var r = 0; r < cfg.rows; r++) {
        for (var c = 0; c < cfg.cols; c++) {
          if (!revealed[r][c]) unrevealed++;
        }
      }
      return unrevealed === totalMines;
    }

    function handleClick(e) {
      if (!gameActive) return;
      var target = e.target.closest('.mine-cell');
      if (!target) return;
      var r = parseInt(target.dataset.r);
      var c = parseInt(target.dataset.c);
      if (isNaN(r) || isNaN(c)) return;
      if (flagged[r][c] || revealed[r][c]) return;

      if (firstClick) {
        firstClick = false;
        placeMines(r, c);
      }

      if (board[r][c] === -1) {
        gameActive = false;
        // Reveal the clicked mine and mark it as the trigger
        revealed[r][c] = true;
        var triggerCell = getCell(r, c);
        triggerCell.classList.add('revealed', 'mine', 'mine-trigger');
        triggerCell.innerHTML = '\u{1F4A3}';
        // Reveal all other mines
        for (var mr = 0; mr < cfg.rows; mr++) {
          for (var mc = 0; mc < cfg.cols; mc++) {
            if (board[mr][mc] === -1 && !revealed[mr][mc]) {
              revealed[mr][mc] = true;
              var mineCell = getCell(mr, mc);
              mineCell.classList.remove('flagged');
              mineCell.classList.add('revealed', 'mine');
              mineCell.innerHTML = '\u{1F4A3}';
            }
            // Show incorrectly flagged cells
            if (flagged[mr][mc] && board[mr][mc] !== -1) {
              var wrongCell = getCell(mr, mc);
              wrongCell.classList.add('wrong-flag');
            }
          }
        }
        statusEl.textContent = 'Game Over! Click New Game to retry.';
        return;
      }

      reveal(r, c);
      if (checkWin()) {
        gameActive = false;
        statusEl.textContent = 'You Win!';
      }
    }

    function handleRightClick(e) {
      e.preventDefault();
      if (!gameActive) return;
      var target = e.target.closest('.mine-cell');
      if (!target) return;
      var r = parseInt(target.dataset.r);
      var c = parseInt(target.dataset.c);
      if (isNaN(r) || isNaN(c)) return;
      if (revealed[r][c]) return;

      flagged[r][c] = !flagged[r][c];
      var cell = getCell(r, c);
      cell.classList.toggle('flagged');
      if (flagged[r][c]) {
        cell.innerHTML = '\u{1F6A9}';
        flagCount++;
      } else {
        cell.innerHTML = '';
        flagCount--;
      }
      statusEl.textContent = 'Mines: ' + totalMines + ' | Flags: ' + flagCount;
    }

    // Mobile flag mode toggle
    var flagMode = false;
    var flagToggleBtn = document.getElementById('mine-flag-toggle');
    if (flagToggleBtn) {
      flagToggleBtn.addEventListener('click', function() {
        flagMode = !flagMode;
        flagToggleBtn.textContent = flagMode ? 'Flag' : 'Dig';
        flagToggleBtn.classList.toggle('active', flagMode);
      });
    }

    function handleTap(e) {
      if (!gameActive) return;
      var target = e.target.closest('.mine-cell');
      if (!target) return;
      if (flagMode) {
        // Simulate right-click for flagging
        handleRightClick({preventDefault: function(){}, target: target});
      } else {
        handleClick({target: target});
      }
    }

    // Event delegation — one listener on the grid, not per-cell
    gridEl.addEventListener('click', handleTap);
    gridEl.addEventListener('contextmenu', handleRightClick);

    document.getElementById('mine-restart').addEventListener('click', function() {
      flagMode = false;
      if (flagToggleBtn) {
        flagToggleBtn.textContent = 'Dig';
        flagToggleBtn.classList.remove('active');
      }
      init();
    });
    document.getElementById('mine-difficulty').addEventListener('change', function() {
      flagMode = false;
      if (flagToggleBtn) {
        flagToggleBtn.textContent = 'Dig';
        flagToggleBtn.classList.remove('active');
      }
      init();
    });
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

    // Touch swipe — prevent page scrolling while swiping on grid
    var ts = null;
    gridEl.addEventListener('touchstart', function(e) {
      if (!started || gameOver) return;
      ts = {x: e.touches[0].clientX, y: e.touches[0].clientY};
    }, {passive: true});
    gridEl.addEventListener('touchmove', function(e) {
      if (!started || gameOver || !ts) return;
      e.preventDefault();
    }, {passive: false});
    gridEl.addEventListener('touchend', function(e) {
      if (!ts || !started || gameOver) return;
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

    // Touch controls for mobile — swipe left/right/down, tap to rotate
    var tetTouchStart = null;
    var tetTouchMoved = false;
    canvas.addEventListener('touchstart', function(e) {
      if (!started || gameOver || !piece) return;
      tetTouchStart = {x: e.touches[0].clientX, y: e.touches[0].clientY};
      tetTouchMoved = false;
    }, {passive: true});
    canvas.addEventListener('touchmove', function(e) {
      if (!started || gameOver || !tetTouchStart) return;
      e.preventDefault();
      var dx = e.touches[0].clientX - tetTouchStart.x;
      var dy = e.touches[0].clientY - tetTouchStart.y;
      if (Math.abs(dx) > 30) {
        tetTouchMoved = true;
        if (dx > 0 && valid(piece.shape, piece.x + 1, piece.y)) piece.x++;
        else if (dx < 0 && valid(piece.shape, piece.x - 1, piece.y)) piece.x--;
        tetTouchStart.x = e.touches[0].clientX;
      }
      if (dy > 30) {
        tetTouchMoved = true;
        if (valid(piece.shape, piece.x, piece.y + 1)) { piece.y++; lastDrop = Date.now(); }
        tetTouchStart.y = e.touches[0].clientY;
      }
    }, {passive: false});
    canvas.addEventListener('touchend', function(e) {
      if (!started || gameOver || !piece || !tetTouchStart) return;
      if (!tetTouchMoved) {
        // Tap = rotate
        var rot = rotate(piece.shape);
        if (valid(rot, piece.x, piece.y)) piece.shape = rot;
      }
      tetTouchStart = null;
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

    // Touch support for mobile drawing
    canvas.addEventListener('touchstart', function(e) {
      if (running) return;
      e.preventDefault();
      var touch = e.touches[0];
      var rect = canvas.getBoundingClientRect();
      var c = Math.floor((touch.clientX - rect.left) / CELL);
      var r = Math.floor((touch.clientY - rect.top) / CELL);
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        drawValue = grid[r][c] ? 0 : 1;
        grid[r][c] = drawValue;
        isDrawing = true;
        draw();
      }
    }, {passive: false});

    canvas.addEventListener('touchmove', function(e) {
      if (!isDrawing || running) return;
      e.preventDefault();
      var touch = e.touches[0];
      var rect = canvas.getBoundingClientRect();
      var c = Math.floor((touch.clientX - rect.left) / CELL);
      var r = Math.floor((touch.clientY - rect.top) / CELL);
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        grid[r][c] = drawValue;
        draw();
      }
    }, {passive: false});

    canvas.addEventListener('touchend', function() {
      isDrawing = false;
    }, {passive: true});

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
      "Computer Science master's student focused on artificial intelligence, machine learning, and software systems.",
      "Currently conducting research in quantum computing at Binghamton University.",
      "Can You Rely on Your Model Evaluation? Improving Model Evaluation with Synthetic Test Data.",
      "Fine-tuned instruction-based large language models to teach programming in Lua.",
      "Verified Connection Establishment for End-to-End Entanglement in Quantum Networks.",
      "Advanced Business Analytics Intern at NYCM Insurance.",
      "Automated data extraction from third-party sources using Python and pandas.",
      "Built models to support underwriter decision-making and delivered results through Tableau.",
      "Built a personal knowledge management system for analyzing AI chatbot conversations.",
      "Managed two-week Agile sprints and led code reviews across a three-person research team.",
      "Generated synthetic records from the UCI Adult census dataset comparing GAN-based and VAE-based synthesizers.",
      "Master of Science in Computer Science with a Focus in Artificial Intelligence.",
      "Bachelor of Engineering in Computer Science with a Minor in Information Systems.",
      "First Place at the UtiCode Coding Competition and Second Place at the SUNY Polytechnic Coding Competition.",
      "Desktop implementation of the board game Carcassonne in C++ with SFML libraries."
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


  /* ═══════════════════════════════════════════
     GAME 7: WORDLE
     ═══════════════════════════════════════════ */
  (function() {
    var gridEl = document.getElementById('wordle-grid');
    if (!gridEl) return;
    var kbEl = document.getElementById('wordle-keyboard');
    var msgEl = document.getElementById('wordle-message');
    var restartBtn = document.getElementById('wordle-restart');

    var WORDS = [
      'about','above','abuse','actor','acute','admit','adopt','adult','after','again',
      'agent','agree','ahead','alarm','album','alert','alien','align','alive','alley',
      'allow','alone','along','alter','among','angel','anger','angle','angry','anime',
      'ankle','apart','apple','apply','arena','argue','arise','armor','array','arrow',
      'aside','asset','audit','avoid','award','aware','bacon','badge','badly','basic',
      'basin','basis','batch','beach','beard','beast','begin','being','below','bench',
      'berry','birth','black','blade','blame','blank','blast','blaze','bleed','blend',
      'bless','blind','block','blood','blown','board','bonus','booth','bound','brain',
      'brand','brave','bread','break','breed','brick','bride','brief','bring','broad',
      'broke','brown','brush','buddy','build','bunch','burst','buyer','cabin','cable',
      'candy','cargo','carry','catch','cause','cease','chain','chair','chalk','chaos',
      'charm','chart','chase','cheap','check','cheek','cheer','chess','chest','chief',
      'child','china','chunk','civic','civil','claim','clash','class','clean','clear',
      'clerk','click','cliff','climb','cling','clock','clone','close','cloth','cloud',
      'coach','coast','color','comet','comic','coral','couch','could','count','corps',
      'court','cover','crack','craft','crane','crash','crazy','cream','crime','crisp',
      'cross','crowd','crown','crude','crush','curve','cycle','daily','dance','death',
      'debug','delay','delta','dense','depth','derby','devil','dirty','disco','ditch',
      'dodge','doing','donor','doubt','dough','draft','drain','drama','drank','drape',
      'drawn','dream','dress','dried','drift','drill','drink','drive','droit','drone',
      'drove','dying','eager','early','earth','eight','elect','elite','email','empty',
      'enemy','enjoy','enter','entry','equal','error','essay','event','every','exact',
      'exile','exist','extra','faint','fairy','faith','false','fancy','fatal','fault',
      'feast','fence','fewer','fiber','field','fifth','fifty','fight','final','first',
      'fixed','flame','flash','fleet','flesh','float','flood','floor','flour','fluid',
      'flush','focal','focus','force','forge','forth','forty','forum','found','frame',
      'frank','fraud','fresh','front','frost','froze','fruit','fully','funny','giant',
      'given','glass','globe','gloom','glory','gloss','glove','going','grace','grade',
      'grain','grand','grant','grape','grasp','grass','grave','great','green','greet',
      'grief','grill','grind','groan','gross','group','grove','grown','guard','guess',
      'guide','guilt','gusty','habit','happy','harsh','haste','haven','heart','heavy',
      'hence','hobby','honey','honor','horse','hotel','house','human','humor','hurry',
      'ideal','image','imply','index','indie','inner','input','irony','issue','ivory',
      'jewel','joint','joker','judge','juice','juicy','jumbo','kebab','knife','knock',
      'known','label','labor','large','laser','later','laugh','layer','learn','lease',
      'least','leave','legal','lemon','level','light','limit','linen','liver','lobby',
      'local','logic','login','lofty','loose','lover','lower','loyal','lucky','lunch',
      'lyric','magic','major','maker','manor','maple','march','marry','match','mayor',
      'media','mercy','metal','meter','might','minor','minus','mixed','model','money',
      'month','moral','motor','mount','mouse','mouth','movie','music','naive','nerve',
      'never','night','noble','noise','north','noted','novel','nurse','nylon','occur',
      'ocean','offer','often','olive','onset','opera','orbit','order','other','outer',
      'owing','owner','oxide','ozone','paint','panel','panic','paper','party','pasta',
      'patch','pause','peace','peach','pearl','penny','phase','phone','photo','piano',
      'pilot','pinch','pitch','pixel','pizza','place','plain','plane','plant','plate',
      'plaza','plead','plumb','plume','point','polar','pound','power','press','price',
      'pride','prime','prism','print','prior','prize','probe','prone','proof','proud',
      'prove','psalm','pulse','punch','pupil','purse','queen','query','quest','queue',
      'quick','quiet','quota','quote','radar','radio','raise','rally','range','rapid',
      'ratio','reach','react','ready','realm','rebel','refer','reign','relax','reply',
      'rider','rifle','right','rigid','risky','rival','river','robin','robot','rocky',
      'rouge','rough','round','route','royal','ruler','rural','salad','sauce','scale',
      'scene','scope','score','scout','screw','sense','serve','setup','seven','shade',
      'shake','shall','shame','shape','share','shark','sharp','sheep','sheer','sheet',
      'shelf','shell','shift','shine','shirt','shock','shore','short','shout','shown',
      'sight','sigma','silly','since','sixth','sixty','skate','skill','skull','slave',
      'sleep','slice','slide','slope','smart','smell','smile','smoke','snack','snake',
      'solar','solid','solve','sorry','south','space','spare','spark','speak','speed',
      'spend','spent','spice','spine','spoke','spoon','spray','squad','stack','staff',
      'stage','stain','stake','stale','stall','stamp','stand','stare','start','state',
      'stave','stays','steak','steal','steam','steel','steep','steer','stick','stiff',
      'still','stock','stone','stood','store','storm','story','stove','strip','stuck',
      'study','stuff','style','sugar','suite','super','surge','swamp','swear','sweep',
      'sweet','swept','swing','sword','syrup','table','taste','teach','teeth','theme',
      'there','thick','thing','think','third','those','three','throw','thumb','tiger',
      'tight','timer','tired','title','today','token','total','touch','tough','towel',
      'tower','toxic','trace','track','trade','trail','train','trait','trash','treat',
      'trend','trial','tribe','trick','tried','truck','truly','trump','trunk','trust',
      'truth','tumor','twist','uncle','under','unify','union','unite','unity','until',
      'upper','upset','urban','usage','usual','valid','value','valve','vault','venue',
      'verse','video','vigor','viral','virus','visit','vista','vital','vivid','vocal',
      'voice','voter','wages','watch','water','weave','weigh','weird','wheat','wheel',
      'where','which','while','white','whole','whose','wider','width','witch','woman',
      'women','world','worry','worse','worst','worth','would','wound','wrath','write',
      'wrong','wrote','yacht','young','youth','yeast','yield','zebra'
    ];

    var VALID_GUESSES = WORDS.concat([
      'aahed','aalii','abaca','abaci','aback','abaft','abase','abash','abate','abbey',
      'abbot','abeam','abele','abets','abhor','abide','abler','ables','abmho','abode',
      'abohm','abort','aboil','acerb','aceta','ached','aches','achoo','acids','acidy',
      'acing','acini','ackee','acmes','acmic','acned','acnes','acold','acorn','acred',
      'acres','acrid','acted','actin','acute','adage','adapt','added','adder','addle',
      'adeem','adept','adieu','adios','adman','admen','admix','adobe','adopt','adore',
      'adorn','adown','adoze','adust','aegis','aeons','aerie','affix','afire','afoot',
      'afore','afoul','again','agape','agate','agave','agaze','agent','agger','aggie',
      'aging','agios','agism','agist','aglet','agley','aglow','agone','agons','agora',
      'agree','ahead','ahold','aided','aider','aides','aioli','aired','airer','aisle',
      'aitch','aiver','ajuga','akees','akela','alack','alamo','aland','alane','alans',
      'alarm','alary','album','alder','aldol','alecs','alefs','aleph','alert','algae',
      'algal','algas','algid','algor','alias','alibi','alien','align','aline','alist',
      'alive','allay','alley','allot','allow','alloy','allyl','almas','almeh','almes',
      'aloft','aloha','alone','along','aloof','aloud','alpha','altar','alter','altos',
      'alula','alums','amass','amaze','amber','ambit','amble','ameba','amend','amens',
      'ament','amice','amide','amids','amies','amine','amino','amins','amirs','amiss',
      'amity','ammos','amnia','amnic','amnio','amoks','among','amour','amped','ample',
      'amply','ampul','amuck','amuse','ancon','anger','angle','angry','angst','anime',
      'anion','anise','ankle','annex','annoy','annul','annum','anode','anole','antic',
      'antis','antra','antes','antsy','anvil','aorta','apart','aping','apish','apnea',
      'apple','apply','apron','aptly','aquas','arbor','ardor','areas','arena','argon',
      'argot','argue','argus','arise','armed','armor','aroma','arose','array','arris',
      'arrow','arses','arson','artsy','asana','ascot','aside','asked','asker','asset',
      'atlas','atoll','atoms','atone','atony','attic','audio','audit','auger','aught',
      'augur','aunts','aunty','aural','auras','autos','avail','avers','avert','avian',
      'avids','avoid','await','awake','award','aware','awash','awful','awing','awned',
      'awoke','axels','axial','axils','axing','axiom','axion','axles','axons','azure',
      'babel','badge','badly','bagel','baggy','baker','baldy','baler','balks','balky',
      'balls','balms','balmy','banal','bands','banes','bangs','banjo','banks','barbs',
      'bards','bared','barer','bares','barge','barks','barmy','barns','baron','basal',
      'based','baser','bases','basil','basin','basis','basks','batch','bated','bates',
      'bathe','baths','baton','batty','bawds','bawdy','bawls','beach','beads','beady',
      'beaks','beams','beans','beard','bears','beast','beats','beaus','beaux','bebop',
      'bedew','beech','beefs','beefy','beeps','beers','beery','beets','began','begat',
      'beget','begin','begun','beige','being','belay','belch','belie','belle','bells',
      'belly','below','belts','bench','bends','berry','berth','beryl','beset','besot',
      'bevel','bible','bicep','biddy','bided','bider','bides','bidet','bigly','bigot',
      'bijou','biked','biker','bikes','bilge','bills','billy','bimbo','binds','bingo',
      'biome','biped','birch','birds','birth','bison','bitsy','bitty','blabs','black',
      'blade','blame','bland','blank','blare','blase','blast','blaze','bleak','bleat',
      'bleed','blend','bless','blimp','blind','blini','blink','blips','bliss','blitz',
      'bloat','blobs','block','bloke','blond','blood','bloom','blown','blows','blues',
      'bluff','blunt','blurb','blurs','blurt','blush','board','boars','boast','boats',
      'bobby','boded','bodes','bogey','boggy','bogus','boils','bolts','bombs','bonds',
      'boned','boner','bones','bongo','bonus','booby','books','booms','boost','booth',
      'boots','booty','booze','boozy','borax','bored','borer','bores','borne','boron',
      'bosom','bossy','botch','bough','boule','bound','bouts','bowed','bowel','bower',
      'bowls','boxed','boxer','boxes','brace','bract','brags','braid','brain','brake',
      'brand','brash','brass','brave','bravo','brawl','brawn','brays','bread','break',
      'breed','brews','briar','bribe','brick','bride','brief','brier','brigs','brine',
      'bring','brink','briny','brisk','broad','broil','broke','brood','brook','broth',
      'brown','brunt','brush','brute','bucks','buddy','budge','buffs','buggy','bugle',
      'build','built','bulbs','bulge','bulgy','bulks','bulky','bulls','bully','bumps',
      'bumpy','bunch','bunks','bunny','bunts','buoys','burst','burly','buses','bushy',
      'busks','busts','busty','butch','buyer','bylaw','bytes'
    ]);

    var ROWS = 6, COLS = 5;
    var answer, guesses, currentGuess, gameActive, letterStates;

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function init() {
      answer = pick(WORDS).toUpperCase();
      guesses = [];
      currentGuess = '';
      gameActive = true;
      letterStates = {};
      msgEl.textContent = '';
      buildGrid();
      buildKeyboard();
    }

    function buildGrid() {
      gridEl.innerHTML = '';
      for (var r = 0; r < ROWS; r++) {
        var row = document.createElement('div');
        row.className = 'wordle-row';
        for (var c = 0; c < COLS; c++) {
          var cell = document.createElement('div');
          cell.className = 'wordle-cell';
          cell.id = 'wc-' + r + '-' + c;
          row.appendChild(cell);
        }
        gridEl.appendChild(row);
      }
    }

    function buildKeyboard() {
      kbEl.innerHTML = '';
      var rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
      for (var r = 0; r < rows.length; r++) {
        var rowDiv = document.createElement('div');
        rowDiv.className = 'wordle-kb-row';
        if (r === 2) {
          var enterBtn = document.createElement('button');
          enterBtn.className = 'wordle-key wordle-key-wide';
          enterBtn.textContent = 'ENT';
          enterBtn.dataset.key = 'Enter';
          rowDiv.appendChild(enterBtn);
        }
        for (var c = 0; c < rows[r].length; c++) {
          var btn = document.createElement('button');
          btn.className = 'wordle-key';
          btn.textContent = rows[r][c];
          btn.dataset.key = rows[r][c];
          rowDiv.appendChild(btn);
        }
        if (r === 2) {
          var delBtn = document.createElement('button');
          delBtn.className = 'wordle-key wordle-key-wide';
          delBtn.textContent = 'DEL';
          delBtn.dataset.key = 'Backspace';
          rowDiv.appendChild(delBtn);
        }
        kbEl.appendChild(rowDiv);
      }
    }

    function updateGrid() {
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var cell = document.getElementById('wc-' + r + '-' + c);
          if (r < guesses.length) {
            cell.textContent = guesses[r].word[c];
            cell.className = 'wordle-cell ' + guesses[r].colors[c];
          } else if (r === guesses.length) {
            cell.textContent = c < currentGuess.length ? currentGuess[c] : '';
            cell.className = 'wordle-cell' + (c < currentGuess.length ? ' wordle-filled' : '');
          } else {
            cell.textContent = '';
            cell.className = 'wordle-cell';
          }
        }
      }
    }

    function evaluateGuess(word) {
      var colors = ['absent', 'absent', 'absent', 'absent', 'absent'];
      var ansArr = answer.split('');
      var wordArr = word.split('');
      // First pass: correct position
      for (var i = 0; i < 5; i++) {
        if (wordArr[i] === ansArr[i]) {
          colors[i] = 'correct';
          ansArr[i] = null;
          wordArr[i] = null;
        }
      }
      // Second pass: wrong position
      for (var i = 0; i < 5; i++) {
        if (wordArr[i] === null) continue;
        var idx = ansArr.indexOf(wordArr[i]);
        if (idx !== -1) {
          colors[i] = 'present';
          ansArr[idx] = null;
        }
      }
      return colors;
    }

    function updateKeyboard() {
      var keys = kbEl.querySelectorAll('.wordle-key');
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i].dataset.key;
        if (k.length === 1 && letterStates[k]) {
          keys[i].className = 'wordle-key ' + letterStates[k];
        }
      }
    }

    function submitGuess() {
      if (!gameActive) return;
      if (currentGuess.length !== 5) {
        msgEl.textContent = 'Not enough letters';
        return;
      }
      if (VALID_GUESSES.indexOf(currentGuess.toLowerCase()) === -1) {
        msgEl.textContent = 'Not a valid word';
        return;
      }
      msgEl.textContent = '';
      var colors = evaluateGuess(currentGuess);
      guesses.push({ word: currentGuess, colors: colors });
      // Update letter states for keyboard
      for (var i = 0; i < 5; i++) {
        var letter = currentGuess[i];
        var state = colors[i];
        var prev = letterStates[letter];
        if (state === 'correct') {
          letterStates[letter] = 'correct';
        } else if (state === 'present' && prev !== 'correct') {
          letterStates[letter] = 'present';
        } else if (!prev) {
          letterStates[letter] = 'absent';
        }
      }
      currentGuess = '';
      updateGrid();
      updateKeyboard();
      // Check win/lose
      if (colors.every(function(c) { return c === 'correct'; })) {
        gameActive = false;
        msgEl.textContent = 'You got it!';
      } else if (guesses.length >= ROWS) {
        gameActive = false;
        msgEl.textContent = 'The word was ' + answer;
      }
    }

    function handleKey(key) {
      if (!gameActive) return;
      if (key === 'Enter') {
        submitGuess();
      } else if (key === 'Backspace') {
        currentGuess = currentGuess.slice(0, -1);
        updateGrid();
      } else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
        currentGuess += key;
        updateGrid();
      }
    }

    document.addEventListener('keydown', function(e) {
      if (!gridEl || !isInViewport(gridEl)) return;
      var key = e.key;
      if (key === 'Enter' || key === 'Backspace') {
        e.preventDefault();
        handleKey(key);
      } else if (/^[a-zA-Z]$/.test(key)) {
        handleKey(key.toUpperCase());
      }
    });

    kbEl.addEventListener('click', function(e) {
      var btn = e.target.closest('.wordle-key');
      if (!btn) return;
      var key = btn.dataset.key;
      if (key === 'Enter' || key === 'Backspace') {
        handleKey(key);
      } else {
        handleKey(key);
      }
    });

    restartBtn.addEventListener('click', init);
    init();
  })();


  /* ═══════════════════════════════════════════
     GAME 8: BREAKOUT
     ═══════════════════════════════════════════ */
  (function() {
    var canvas = document.getElementById('breakout-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var scoreEl = document.getElementById('breakout-score');
    var livesEl = document.getElementById('breakout-lives');
    var levelEl = document.getElementById('breakout-level');
    var restartBtn = document.getElementById('breakout-restart');

    var W = canvas.width, H = canvas.height;
    var PADDLE_W = 75, PADDLE_H = 12, BALL_R = 6;
    var BRICK_ROWS = 5, BRICK_COLS = 8, BRICK_W, BRICK_H = 18, BRICK_PAD = 4, BRICK_TOP = 40;
    BRICK_W = (W - (BRICK_COLS + 1) * BRICK_PAD) / BRICK_COLS;

    var BRICK_COLORS = ['#f7768e', '#ff9e64', '#f7c948', '#9ece6a', '#7aa2f7'];

    var paddleX, ballX, ballY, ballDX, ballDY, bricks, score, lives, level;
    var started, gameOver, animId;
    var keys = {};
    var ballSpeed;

    function initBricks() {
      bricks = [];
      var rows = Math.min(BRICK_ROWS + level - 1, 8);
      for (var r = 0; r < rows; r++) {
        bricks[r] = [];
        for (var c = 0; c < BRICK_COLS; c++) {
          bricks[r][c] = { alive: true, x: BRICK_PAD + c * (BRICK_W + BRICK_PAD), y: BRICK_TOP + r * (BRICK_H + BRICK_PAD) };
        }
      }
    }

    function drawStartScreen() {
      ctx.fillStyle = getBg();
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = getFg();
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Breakout', W / 2, H / 2 - 15);
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = getMuted();
      ctx.fillText('Press Start to play', W / 2, H / 2 + 15);
    }

    function init() {
      if (animId) cancelAnimationFrame(animId);
      started = false;
      gameOver = false;
      score = 0; lives = 3; level = 1;
      scoreEl.textContent = '0';
      livesEl.textContent = '3';
      levelEl.textContent = '1';
      restartBtn.textContent = 'Start';
      drawStartScreen();
    }

    function resetBall() {
      paddleX = (W - PADDLE_W) / 2;
      ballX = W / 2;
      ballY = H - 40;
      ballSpeed = 3 + level * 0.5;
      var angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      ballDX = Math.cos(angle) * ballSpeed;
      ballDY = Math.sin(angle) * ballSpeed;
    }

    function startGame() {
      started = true;
      gameOver = false;
      score = 0; lives = 3; level = 1;
      scoreEl.textContent = '0';
      livesEl.textContent = '3';
      levelEl.textContent = '1';
      initBricks();
      resetBall();
      restartBtn.textContent = 'Restart';
      if (animId) cancelAnimationFrame(animId);
      animId = requestAnimationFrame(loop);
    }

    function bricksRemaining() {
      var count = 0;
      for (var r = 0; r < bricks.length; r++)
        for (var c = 0; c < BRICK_COLS; c++)
          if (bricks[r][c].alive) count++;
      return count;
    }

    function nextLevel() {
      level++;
      levelEl.textContent = level;
      initBricks();
      resetBall();
    }

    function loop() {
      if (gameOver) return;
      update();
      draw();
      animId = requestAnimationFrame(loop);
    }

    function update() {
      // Paddle movement
      if (keys['ArrowLeft'] || keys['a']) paddleX -= 6;
      if (keys['ArrowRight'] || keys['d']) paddleX += 6;
      if (paddleX < 0) paddleX = 0;
      if (paddleX > W - PADDLE_W) paddleX = W - PADDLE_W;

      // Ball movement
      ballX += ballDX;
      ballY += ballDY;

      // Wall bounces
      if (ballX - BALL_R < 0) { ballX = BALL_R; ballDX = Math.abs(ballDX); }
      if (ballX + BALL_R > W) { ballX = W - BALL_R; ballDX = -Math.abs(ballDX); }
      if (ballY - BALL_R < 0) { ballY = BALL_R; ballDY = Math.abs(ballDY); }

      // Paddle bounce
      if (ballDY > 0 && ballY + BALL_R >= H - PADDLE_H - 10 && ballY + BALL_R <= H - 10 + 4 &&
          ballX >= paddleX && ballX <= paddleX + PADDLE_W) {
        var hitPos = (ballX - paddleX) / PADDLE_W;
        var angle = -Math.PI / 2 + (hitPos - 0.5) * 1.2;
        ballDX = Math.cos(angle) * ballSpeed;
        ballDY = Math.sin(angle) * ballSpeed;
        if (ballDY > -1) ballDY = -1;
        ballY = H - PADDLE_H - 10 - BALL_R;
      }

      // Ball falls below
      if (ballY - BALL_R > H) {
        lives--;
        livesEl.textContent = lives;
        if (lives <= 0) {
          gameOver = true;
          restartBtn.textContent = 'Start';
          draw();
          return;
        }
        resetBall();
      }

      // Brick collision
      for (var r = 0; r < bricks.length; r++) {
        for (var c = 0; c < BRICK_COLS; c++) {
          var b = bricks[r][c];
          if (!b.alive) continue;
          if (ballX + BALL_R > b.x && ballX - BALL_R < b.x + BRICK_W &&
              ballY + BALL_R > b.y && ballY - BALL_R < b.y + BRICK_H) {
            b.alive = false;
            score += 10 * level;
            scoreEl.textContent = score;
            // Determine bounce direction
            var overlapLeft = (ballX + BALL_R) - b.x;
            var overlapRight = (b.x + BRICK_W) - (ballX - BALL_R);
            var overlapTop = (ballY + BALL_R) - b.y;
            var overlapBottom = (b.y + BRICK_H) - (ballY - BALL_R);
            var minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
            if (minOverlap === overlapTop || minOverlap === overlapBottom) {
              ballDY = -ballDY;
            } else {
              ballDX = -ballDX;
            }
            break;
          }
        }
      }

      if (bricksRemaining() === 0) {
        nextLevel();
      }
    }

    function draw() {
      var bg = getBg();
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Bricks
      for (var r = 0; r < bricks.length; r++) {
        for (var c = 0; c < BRICK_COLS; c++) {
          if (!bricks[r][c].alive) continue;
          ctx.fillStyle = BRICK_COLORS[r % BRICK_COLORS.length];
          ctx.fillRect(bricks[r][c].x, bricks[r][c].y, BRICK_W, BRICK_H);
        }
      }

      // Paddle
      ctx.fillStyle = getAccent();
      ctx.fillRect(paddleX, H - PADDLE_H - 10, PADDLE_W, PADDLE_H);

      // Ball
      ctx.fillStyle = getFg();
      ctx.beginPath();
      ctx.arc(ballX, ballY, BALL_R, 0, Math.PI * 2);
      ctx.fill();

      if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', W / 2, H / 2);
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Score: ' + score + '  Level: ' + level, W / 2, H / 2 + 25);
      }
    }

    document.addEventListener('keydown', function(e) {
      if (!started || gameOver || !isInViewport(canvas)) return;
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].indexOf(e.key) !== -1) {
        e.preventDefault();
        keys[e.key] = true;
      }
    });
    document.addEventListener('keyup', function(e) {
      keys[e.key] = false;
    });

    // Touch controls
    var touchX = null;
    canvas.addEventListener('touchstart', function(e) {
      if (!started || gameOver) return;
      touchX = e.touches[0].clientX;
    }, { passive: true });
    canvas.addEventListener('touchmove', function(e) {
      if (!started || gameOver || touchX === null) return;
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var newX = e.touches[0].clientX;
      var scale = W / rect.width;
      paddleX += (newX - touchX) * scale;
      if (paddleX < 0) paddleX = 0;
      if (paddleX > W - PADDLE_W) paddleX = W - PADDLE_W;
      touchX = newX;
    }, { passive: false });
    canvas.addEventListener('touchend', function() {
      touchX = null;
    }, { passive: true });

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
     GAME 9: CHESS (with Joe Bot Chat)
     ═══════════════════════════════════════════ */
  (function() {
    var boardEl = document.getElementById('chess-board');
    if (!boardEl) return;
    var statusEl = document.getElementById('chess-status');
    var chatLog = document.getElementById('chess-chat-log');
    var restartBtn = document.getElementById('chess-restart');

    // Piece constants
    var EMPTY = 0;
    var WP = 1, WN = 2, WB = 3, WR = 4, WQ = 5, WK = 6;
    var BP = 7, BN = 8, BB = 9, BR = 10, BQ = 11, BK = 12;
    var PIECE_CHARS = { 1:'\u2659',2:'\u2658',3:'\u2657',4:'\u2656',5:'\u2655',6:'\u2654',
                        7:'\u265F',8:'\u265E',9:'\u265D',10:'\u265C',11:'\u265B',12:'\u265A' };

    function isWhite(p) { return p >= 1 && p <= 6; }
    function isBlack(p) { return p >= 7 && p <= 12; }
    function pieceColor(p) { return isWhite(p) ? 'w' : isBlack(p) ? 'b' : null; }
    function pieceType(p) { return p === 0 ? 0 : (p <= 6 ? p : p - 6); }

    // Material values for evaluation
    var PIECE_VAL = [0, 100, 320, 330, 500, 900, 20000, 100, 320, 330, 500, 900, 20000];

    // Board state
    var board, turn, selected, validMoves, gameActive;
    var castleRights, enPassant, moveHistory;
    var whiteKingPos, blackKingPos;

    // Positional tables (simplified)
    var PAWN_TABLE = [
      0, 0, 0, 0, 0, 0, 0, 0,
      50,50,50,50,50,50,50,50,
      10,10,20,30,30,20,10,10,
      5, 5,10,25,25,10, 5, 5,
      0, 0, 0,20,20, 0, 0, 0,
      5,-5,-10, 0, 0,-10,-5, 5,
      5,10,10,-20,-20,10,10, 5,
      0, 0, 0, 0, 0, 0, 0, 0
    ];
    var KNIGHT_TABLE = [
      -50,-40,-30,-30,-30,-30,-40,-50,
      -40,-20,  0,  0,  0,  0,-20,-40,
      -30,  0, 10, 15, 15, 10,  0,-30,
      -30,  5, 15, 20, 20, 15,  5,-30,
      -30,  0, 15, 20, 20, 15,  0,-30,
      -30,  5, 10, 15, 15, 10,  5,-30,
      -40,-20,  0,  5,  5,  0,-20,-40,
      -50,-40,-30,-30,-30,-30,-40,-50
    ];
    var KING_TABLE = [
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -20,-30,-30,-40,-40,-30,-30,-20,
      -10,-20,-20,-20,-20,-20,-20,-10,
       20, 20,  0,  0,  0,  0, 20, 20,
       20, 30, 10,  0,  0, 10, 30, 20
    ];

    function posValue(piece, idx) {
      var type = pieceType(piece);
      var table;
      if (type === 1) table = PAWN_TABLE;
      else if (type === 2) table = KNIGHT_TABLE;
      else if (type === 6) table = KING_TABLE;
      else return 0;
      if (isWhite(piece)) {
        return table[idx];
      } else {
        // Mirror vertically for black
        var r = Math.floor(idx / 8);
        var c = idx % 8;
        return table[(7 - r) * 8 + c];
      }
    }

    function initBoard() {
      board = [
        BR, BN, BB, BQ, BK, BB, BN, BR,
        BP, BP, BP, BP, BP, BP, BP, BP,
        0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,
        WP, WP, WP, WP, WP, WP, WP, WP,
        WR, WN, WB, WQ, WK, WB, WN, WR
      ];
      turn = 'w';
      selected = -1;
      validMoves = [];
      gameActive = true;
      castleRights = { wk: true, wq: true, bk: true, bq: true };
      enPassant = -1;
      moveHistory = [];
      whiteKingPos = 60;
      blackKingPos = 4;
    }

    function rc(idx) { return [Math.floor(idx / 8), idx % 8]; }
    function ri(r, c) { return r * 8 + c; }

    function isOnBoard(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

    function generateMoves(bd, color, castle, ep) {
      var moves = [];
      var isW = color === 'w';
      for (var i = 0; i < 64; i++) {
        var p = bd[i];
        if (p === 0) continue;
        if ((isW && !isWhite(p)) || (!isW && !isBlack(p))) continue;
        var type = pieceType(p);
        var pos = rc(i);
        var r = pos[0], c = pos[1];

        if (type === 1) { // Pawn
          var dir = isW ? -1 : 1;
          var startRow = isW ? 6 : 1;
          // Forward
          if (isOnBoard(r + dir, c) && bd[ri(r + dir, c)] === 0) {
            moves.push({ from: i, to: ri(r + dir, c) });
            if (r === startRow && bd[ri(r + 2 * dir, c)] === 0) {
              moves.push({ from: i, to: ri(r + 2 * dir, c) });
            }
          }
          // Captures
          for (var dc = -1; dc <= 1; dc += 2) {
            if (!isOnBoard(r + dir, c + dc)) continue;
            var target = ri(r + dir, c + dc);
            if (bd[target] !== 0 && pieceColor(bd[target]) !== color) {
              moves.push({ from: i, to: target });
            }
            // En passant
            if (target === ep) {
              moves.push({ from: i, to: target, ep: true });
            }
          }
        } else if (type === 2) { // Knight
          var knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
          for (var m = 0; m < knightMoves.length; m++) {
            var nr = r + knightMoves[m][0], nc = c + knightMoves[m][1];
            if (!isOnBoard(nr, nc)) continue;
            var t = bd[ri(nr, nc)];
            if (t === 0 || pieceColor(t) !== color) {
              moves.push({ from: i, to: ri(nr, nc) });
            }
          }
        } else if (type === 3 || type === 4 || type === 5) { // Bishop, Rook, Queen
          var dirs = [];
          if (type === 3 || type === 5) dirs = dirs.concat([[-1,-1],[-1,1],[1,-1],[1,1]]);
          if (type === 4 || type === 5) dirs = dirs.concat([[-1,0],[1,0],[0,-1],[0,1]]);
          for (var d = 0; d < dirs.length; d++) {
            var dr = dirs[d][0], dc2 = dirs[d][1];
            var cr = r + dr, cc = c + dc2;
            while (isOnBoard(cr, cc)) {
              var t2 = bd[ri(cr, cc)];
              if (t2 === 0) {
                moves.push({ from: i, to: ri(cr, cc) });
              } else {
                if (pieceColor(t2) !== color) {
                  moves.push({ from: i, to: ri(cr, cc) });
                }
                break;
              }
              cr += dr; cc += dc2;
            }
          }
        } else if (type === 6) { // King
          for (var dr2 = -1; dr2 <= 1; dr2++) {
            for (var dc3 = -1; dc3 <= 1; dc3++) {
              if (dr2 === 0 && dc3 === 0) continue;
              var nr2 = r + dr2, nc2 = c + dc3;
              if (!isOnBoard(nr2, nc2)) continue;
              var t3 = bd[ri(nr2, nc2)];
              if (t3 === 0 || pieceColor(t3) !== color) {
                moves.push({ from: i, to: ri(nr2, nc2) });
              }
            }
          }
          // Castling
          if (isW) {
            if (castle.wk && bd[61] === 0 && bd[62] === 0 && bd[63] === WR &&
                !isSquareAttacked(bd, 60, 'b') && !isSquareAttacked(bd, 61, 'b') && !isSquareAttacked(bd, 62, 'b')) {
              moves.push({ from: 60, to: 62, castle: 'wk' });
            }
            if (castle.wq && bd[59] === 0 && bd[58] === 0 && bd[57] === 0 && bd[56] === WR &&
                !isSquareAttacked(bd, 60, 'b') && !isSquareAttacked(bd, 59, 'b') && !isSquareAttacked(bd, 58, 'b')) {
              moves.push({ from: 60, to: 58, castle: 'wq' });
            }
          } else {
            if (castle.bk && bd[5] === 0 && bd[6] === 0 && bd[7] === BR &&
                !isSquareAttacked(bd, 4, 'w') && !isSquareAttacked(bd, 5, 'w') && !isSquareAttacked(bd, 6, 'w')) {
              moves.push({ from: 4, to: 6, castle: 'bk' });
            }
            if (castle.bq && bd[3] === 0 && bd[2] === 0 && bd[1] === 0 && bd[0] === BR &&
                !isSquareAttacked(bd, 4, 'w') && !isSquareAttacked(bd, 3, 'w') && !isSquareAttacked(bd, 2, 'w')) {
              moves.push({ from: 4, to: 2, castle: 'bq' });
            }
          }
        }
      }
      return moves;
    }

    function isSquareAttacked(bd, sq, byColor) {
      // Check if square sq is attacked by any piece of byColor
      var pos = rc(sq);
      var r = pos[0], c = pos[1];
      var isW = byColor === 'w';

      // Pawn attacks
      var pawnDir = isW ? 1 : -1; // attacking from below (white attacks upward squares)
      for (var dc = -1; dc <= 1; dc += 2) {
        var pr = r + pawnDir, pc = c + dc;
        if (isOnBoard(pr, pc)) {
          var pp = bd[ri(pr, pc)];
          if (pp !== 0 && pieceColor(pp) === byColor && pieceType(pp) === 1) return true;
        }
      }

      // Knight attacks
      var km = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (var k = 0; k < km.length; k++) {
        var nr = r + km[k][0], nc = c + km[k][1];
        if (isOnBoard(nr, nc)) {
          var np = bd[ri(nr, nc)];
          if (np !== 0 && pieceColor(np) === byColor && pieceType(np) === 2) return true;
        }
      }

      // Sliding attacks (bishop/rook/queen)
      var diagDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
      var straightDirs = [[-1,0],[1,0],[0,-1],[0,1]];
      for (var d = 0; d < 4; d++) {
        var cr = r + diagDirs[d][0], cc = c + diagDirs[d][1];
        while (isOnBoard(cr, cc)) {
          var sp = bd[ri(cr, cc)];
          if (sp !== 0) {
            if (pieceColor(sp) === byColor) {
              var st = pieceType(sp);
              if (st === 3 || st === 5) return true;
            }
            break;
          }
          cr += diagDirs[d][0]; cc += diagDirs[d][1];
        }
      }
      for (var d2 = 0; d2 < 4; d2++) {
        var cr2 = r + straightDirs[d2][0], cc2 = c + straightDirs[d2][1];
        while (isOnBoard(cr2, cc2)) {
          var sp2 = bd[ri(cr2, cc2)];
          if (sp2 !== 0) {
            if (pieceColor(sp2) === byColor) {
              var st2 = pieceType(sp2);
              if (st2 === 4 || st2 === 5) return true;
            }
            break;
          }
          cr2 += straightDirs[d2][0]; cc2 += straightDirs[d2][1];
        }
      }

      // King attacks
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc2 = -1; dc2 <= 1; dc2++) {
          if (dr === 0 && dc2 === 0) continue;
          var kr = r + dr, kc = c + dc2;
          if (isOnBoard(kr, kc)) {
            var kp = bd[ri(kr, kc)];
            if (kp !== 0 && pieceColor(kp) === byColor && pieceType(kp) === 6) return true;
          }
        }
      }

      return false;
    }

    function findKing(bd, color) {
      var target = color === 'w' ? WK : BK;
      for (var i = 0; i < 64; i++) {
        if (bd[i] === target) return i;
      }
      return -1;
    }

    function makeMove(bd, move, castle, ep) {
      var newBd = bd.slice();
      var newCastle = { wk: castle.wk, wq: castle.wq, bk: castle.bk, bq: castle.bq };
      var newEp = -1;
      var captured = newBd[move.to];
      var piece = newBd[move.from];

      newBd[move.to] = piece;
      newBd[move.from] = 0;

      // En passant capture
      if (move.ep) {
        var epCapture = pieceColor(piece) === 'w' ? move.to + 8 : move.to - 8;
        captured = newBd[epCapture];
        newBd[epCapture] = 0;
      }

      // Pawn double move sets en passant
      if (pieceType(piece) === 1 && Math.abs(move.from - move.to) === 16) {
        newEp = (move.from + move.to) / 2;
      }

      // Pawn promotion (auto-queen)
      if (pieceType(piece) === 1) {
        var destRow = Math.floor(move.to / 8);
        if (destRow === 0 && isWhite(piece)) newBd[move.to] = WQ;
        if (destRow === 7 && isBlack(piece)) newBd[move.to] = BQ;
      }

      // Castling
      if (move.castle) {
        if (move.castle === 'wk') { newBd[63] = 0; newBd[61] = WR; }
        if (move.castle === 'wq') { newBd[56] = 0; newBd[59] = WR; }
        if (move.castle === 'bk') { newBd[7] = 0; newBd[5] = BR; }
        if (move.castle === 'bq') { newBd[0] = 0; newBd[3] = BR; }
      }

      // Update castling rights
      if (piece === WK) { newCastle.wk = false; newCastle.wq = false; }
      if (piece === BK) { newCastle.bk = false; newCastle.bq = false; }
      if (move.from === 63 || move.to === 63) newCastle.wk = false;
      if (move.from === 56 || move.to === 56) newCastle.wq = false;
      if (move.from === 7 || move.to === 7) newCastle.bk = false;
      if (move.from === 0 || move.to === 0) newCastle.bq = false;

      return { board: newBd, castle: newCastle, ep: newEp, captured: captured };
    }

    function getLegalMoves(bd, color, castle, ep) {
      var pseudoMoves = generateMoves(bd, color, castle, ep);
      var legal = [];
      var opponent = color === 'w' ? 'b' : 'w';
      for (var i = 0; i < pseudoMoves.length; i++) {
        var result = makeMove(bd, pseudoMoves[i], castle, ep);
        var kingPos = findKing(result.board, color);
        if (kingPos !== -1 && !isSquareAttacked(result.board, kingPos, opponent)) {
          legal.push(pseudoMoves[i]);
        }
      }
      return legal;
    }

    function isInCheck(bd, color) {
      var kingPos = findKing(bd, color);
      var opponent = color === 'w' ? 'b' : 'w';
      return kingPos !== -1 && isSquareAttacked(bd, kingPos, opponent);
    }

    // Evaluation
    function evaluate(bd) {
      var score = 0;
      for (var i = 0; i < 64; i++) {
        var p = bd[i];
        if (p === 0) continue;
        var val = PIECE_VAL[p] + posValue(p, i);
        if (isWhite(p)) score += val;
        else score -= val;
      }
      return score;
    }

    // Minimax with alpha-beta
    function minimax(bd, depth, alpha, beta, isMaximizing, castle, ep) {
      var color = isMaximizing ? 'w' : 'b';
      var moves = getLegalMoves(bd, color, castle, ep);

      if (moves.length === 0) {
        if (isInCheck(bd, color)) {
          return isMaximizing ? -99999 + (3 - depth) : 99999 - (3 - depth);
        }
        return 0; // Stalemate
      }

      if (depth === 0) return evaluate(bd);

      if (isMaximizing) {
        var maxEval = -Infinity;
        for (var i = 0; i < moves.length; i++) {
          var result = makeMove(bd, moves[i], castle, ep);
          var ev = minimax(result.board, depth - 1, alpha, beta, false, result.castle, result.ep);
          maxEval = Math.max(maxEval, ev);
          alpha = Math.max(alpha, ev);
          if (beta <= alpha) break;
        }
        return maxEval;
      } else {
        var minEval = Infinity;
        for (var i = 0; i < moves.length; i++) {
          var result = makeMove(bd, moves[i], castle, ep);
          var ev = minimax(result.board, depth - 1, alpha, beta, true, result.castle, result.ep);
          minEval = Math.min(minEval, ev);
          beta = Math.min(beta, ev);
          if (beta <= alpha) break;
        }
        return minEval;
      }
    }

    function aiMove() {
      var moves = getLegalMoves(board, 'b', castleRights, enPassant);
      if (moves.length === 0) return null;

      // ~1000 Elo: depth 2, with occasional random moves (blunders)
      var blunderChance = 0.15;
      if (Math.random() < blunderChance) {
        // Random move (blunder)
        var move = moves[Math.floor(Math.random() * moves.length)];
        move.blunder = true;
        return move;
      }

      var bestScore = Infinity;
      var bestMoves = [];
      for (var i = 0; i < moves.length; i++) {
        var result = makeMove(board, moves[i], castleRights, enPassant);
        var score = minimax(result.board, 2, -Infinity, Infinity, true, result.castle, result.ep);
        // Add some randomness to evaluation
        score += (Math.random() - 0.5) * 30;
        if (score < bestScore) {
          bestScore = score;
          bestMoves = [moves[i]];
        } else if (Math.abs(score - bestScore) < 15) {
          bestMoves.push(moves[i]);
        }
      }
      return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    // Chat system
    var chatMessages = {
      greeting: [
        "Hey! I'm Joe Bot. I studied CS at Binghamton and SUNY Poly. Let's see if my algorithms can keep up with your chess skills!",
        "Welcome! When I'm not fine-tuning LLMs or researching quantum computing, I'm playing chess. Your move!",
        "Hey there! I learned strategic thinking from coding competitions, but chess is a whole different battle. Let's go!"
      ],
      capture_by_player: [
        "Nice capture! That reminds me of refactoring \u2014 sometimes you have to remove pieces to improve the position.",
        "Ouch, you took my piece! I should've seen that coming, like a merge conflict.",
        "Good take. My pattern recognition needs work \u2014 maybe I need more training data.",
        "That hurts. Even my NYCM Insurance internship couldn't insure against that loss."
      ],
      capture_by_ai: [
        "Got one! My minimax algorithm actually worked for once.",
        "I'll take that, thanks! Like extracting data from third-party sources \u2014 efficient.",
        "Captured! I learned to seize opportunities during Agile sprints.",
        "Mine now! That felt like winning first place at UtiCode."
      ],
      check_on_player: [
        "Check! My search tree found something good for once.",
        "Check! Like a failing test case \u2014 you need to fix this!",
        "Check! I may be ~1000 Elo, but even I have my moments."
      ],
      check_on_ai: [
        "Whoa, check! I need to debug my king's position.",
        "Check?! I should've run more test cases on that move.",
        "Okay, that's a bug in my strategy. Let me refactor my king's safety."
      ],
      blunder: [
        "That... was not my best move. My neural networks aren't firing today.",
        "I think I just blundered. Even my code reviews can't save me now.",
        "Oops. I blame that on insufficient search depth. Maybe I need more compute.",
        "That was bad. At SUNY Poly coding competitions I made better decisions under pressure.",
        "I might have just made a mistake. In my defense, debugging is hard."
      ],
      player_wins: [
        "GG! You played well. I'll go back to training \u2014 maybe quantum computing can help my chess.",
        "You win! I need to increase my search depth. Back to the algorithms textbook.",
        "Well played! I'll retrain on more chess data. Maybe I'll fine-tune an LLM to teach me."
      ],
      ai_wins: [
        "Checkmate! I guess those coding competitions taught me something about strategy after all.",
        "I won! My minimax algorithm sends its regards. GG!",
        "Checkmate! Even at ~1000 Elo, I can surprise you sometimes."
      ],
      stalemate: [
        "Stalemate! A draw. Like a merge with no conflicts \u2014 anticlimactic but valid.",
        "It's a draw! Neither of us could close it out. Rematch?"
      ],
      generic: [
        "Interesting move. Let me think about this...",
        "Hmm, I didn't expect that. Analyzing...",
        "Good game so far. My evaluation function says it's close.",
        "This reminds me of debugging \u2014 every move reveals new information.",
        "Let me consult my alpha-beta pruning on this one..."
      ]
    };

    function addChat(category) {
      var pool = chatMessages[category];
      if (!pool || pool.length === 0) return;
      var msg = pool[Math.floor(Math.random() * pool.length)];
      var div = document.createElement('div');
      div.className = 'chess-message';
      div.textContent = msg;
      chatLog.appendChild(div);
      chatLog.scrollTop = chatLog.scrollHeight;
    }

    // Rendering
    function renderBoard() {
      boardEl.innerHTML = '';
      for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
          var idx = r * 8 + c;
          var cell = document.createElement('div');
          cell.className = 'chess-cell';
          cell.classList.add((r + c) % 2 === 0 ? 'chess-light' : 'chess-dark');
          if (idx === selected) cell.classList.add('chess-selected');
          // Show valid move indicators
          for (var v = 0; v < validMoves.length; v++) {
            if (validMoves[v].to === idx) {
              cell.classList.add(board[idx] !== 0 ? 'chess-capture-move' : 'chess-valid-move');
              break;
            }
          }
          // Highlight last move
          if (moveHistory.length > 0) {
            var last = moveHistory[moveHistory.length - 1];
            if (idx === last.from || idx === last.to) {
              cell.classList.add('chess-last-move');
            }
          }
          if (board[idx] !== 0) {
            var span = document.createElement('span');
            span.className = 'chess-piece' + (isWhite(board[idx]) ? ' chess-white-piece' : ' chess-black-piece');
            span.textContent = PIECE_CHARS[board[idx]];
            cell.appendChild(span);
          }
          cell.dataset.idx = idx;
          boardEl.appendChild(cell);
        }
      }
    }

    function handleCellClick(idx) {
      if (!gameActive || turn !== 'w') return;

      // If clicking a valid move destination
      for (var i = 0; i < validMoves.length; i++) {
        if (validMoves[i].to === idx) {
          executeMove(validMoves[i]);
          return;
        }
      }

      // If clicking own piece, select it
      if (board[idx] !== 0 && isWhite(board[idx])) {
        selected = idx;
        validMoves = getLegalMoves(board, 'w', castleRights, enPassant).filter(function(m) {
          return m.from === idx;
        });
        renderBoard();
        return;
      }

      // Deselect
      selected = -1;
      validMoves = [];
      renderBoard();
    }

    function executeMove(move) {
      var captured = board[move.to];
      if (move.ep) {
        captured = turn === 'w' ? board[move.to + 8] : board[move.to - 8];
      }
      var result = makeMove(board, move, castleRights, enPassant);
      board = result.board;
      castleRights = result.castle;
      enPassant = result.ep;
      moveHistory.push(move);
      selected = -1;
      validMoves = [];

      // Update king positions
      whiteKingPos = findKing(board, 'w');
      blackKingPos = findKing(board, 'b');

      // Chat: player capture
      if (captured !== 0 && turn === 'w') {
        addChat('capture_by_player');
      }

      // Switch turn
      turn = turn === 'w' ? 'b' : 'w';

      // Check game state
      var opponentMoves = getLegalMoves(board, turn, castleRights, enPassant);
      var inCheck = isInCheck(board, turn);

      if (opponentMoves.length === 0) {
        gameActive = false;
        if (inCheck) {
          statusEl.textContent = (turn === 'w' ? 'Black' : 'White') + ' wins by checkmate!';
          addChat(turn === 'b' ? 'player_wins' : 'ai_wins');
        } else {
          statusEl.textContent = 'Stalemate - Draw!';
          addChat('stalemate');
        }
        renderBoard();
        return;
      }

      if (inCheck) {
        statusEl.textContent = (turn === 'w' ? 'White' : 'Black') + ' is in check!';
        if (turn === 'w') addChat('check_on_player');
        else addChat('check_on_ai');
      } else {
        statusEl.textContent = (turn === 'w' ? 'White' : 'Black') + ' to move';
      }

      renderBoard();

      // AI turn
      if (turn === 'b' && gameActive) {
        statusEl.textContent = 'Joe Bot is thinking...';
        setTimeout(function() {
          if (!gameActive) return;
          var aiM = aiMove();
          if (!aiM) return;

          var aiCaptured = board[aiM.to];
          if (aiM.ep) {
            aiCaptured = board[aiM.to - 8];
          }

          // Chat on blunder
          if (aiM.blunder) {
            addChat('blunder');
          } else if (aiCaptured !== 0) {
            addChat('capture_by_ai');
          } else if (Math.random() < 0.2) {
            addChat('generic');
          }

          var aiResult = makeMove(board, aiM, castleRights, enPassant);
          board = aiResult.board;
          castleRights = aiResult.castle;
          enPassant = aiResult.ep;
          moveHistory.push(aiM);

          whiteKingPos = findKing(board, 'w');
          blackKingPos = findKing(board, 'b');

          turn = 'w';

          var playerMoves = getLegalMoves(board, 'w', castleRights, enPassant);
          var playerInCheck = isInCheck(board, 'w');

          if (playerMoves.length === 0) {
            gameActive = false;
            if (playerInCheck) {
              statusEl.textContent = 'Black wins by checkmate!';
              addChat('ai_wins');
            } else {
              statusEl.textContent = 'Stalemate - Draw!';
              addChat('stalemate');
            }
          } else if (playerInCheck) {
            statusEl.textContent = 'White is in check!';
            addChat('check_on_player');
          } else {
            statusEl.textContent = 'White to move';
          }

          renderBoard();
        }, 300 + Math.random() * 400);
      }
    }

    // Event delegation
    boardEl.addEventListener('click', function(e) {
      var cell = e.target.closest('.chess-cell');
      if (!cell) return;
      handleCellClick(parseInt(cell.dataset.idx));
    });

    function startGame() {
      initBoard();
      chatLog.innerHTML = '';
      renderBoard();
      addChat('greeting');
    }

    restartBtn.addEventListener('click', startGame);
    startGame();
  })();

})();
