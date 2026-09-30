/* ── Typing Speed Test ──
   State machine: ready → typing → done.
   Keystrokes go to a transparent <input> laid over the text, which works with
   physical keyboards, phone keyboards and IMEs alike; its value is the typed
   text. WPM counts only correctly typed characters (5 characters = 1 word).
   Accuracy counts every character typed, so a fixed mistake still costs
   accuracy. */
(function() {
  'use strict';

  var root = document.getElementById('ty-game');
  if (!root) return;

  var el = {
    area: document.getElementById('ty-area'),
    text: document.getElementById('ty-text'),
    input: document.getElementById('ty-input'),
    sr: document.getElementById('ty-sr'),
    length: document.getElementById('ty-length'),
    restart: document.getElementById('ty-restart'),
    wpm: document.getElementById('ty-wpm'),
    acc: document.getElementById('ty-acc'),
    time: document.getElementById('ty-time'),
    result: document.getElementById('ty-result'),
    resWpm: document.getElementById('ty-res-wpm'),
    resAcc: document.getElementById('ty-res-acc'),
    resRaw: document.getElementById('ty-res-raw'),
    resTime: document.getElementById('ty-res-time'),
    resNote: document.getElementById('ty-res-note'),
    best: document.getElementById('ty-best'),
    next: document.getElementById('ty-next')
  };

  var SENTENCES = [
    "Computer Science master's student focused on artificial intelligence, machine learning, and software systems.",
    'Currently conducting research in quantum computing at Binghamton University.',
    'Can You Rely on Your Model Evaluation? Improving Model Evaluation with Synthetic Test Data.',
    'Fine-tuned instruction-based large language models to teach programming in Lua.',
    'Verified Connection Establishment for End-to-End Entanglement in Quantum Networks.',
    'Advanced Business Analytics Intern at NYCM Insurance.',
    'Automated data extraction from third-party sources using Python and pandas.',
    'Built models to support underwriter decision-making and delivered results through Tableau.',
    'Built a personal knowledge management system for analyzing AI chatbot conversations.',
    'Managed two-week Agile sprints and led code reviews across a three-person research team.',
    'Generated synthetic records from the UCI Adult census dataset comparing GAN-based and VAE-based synthesizers.',
    'Master of Science in Computer Science with a Focus in Artificial Intelligence.',
    'Bachelor of Engineering in Computer Science with a Minor in Information Systems.',
    'First Place at the UtiCode Coding Competition and Second Place at the SUNY Polytechnic Coding Competition.',
    'Desktop implementation of the board game Carcassonne in C++ with SFML libraries.'
  ];
  var LENGTHS = {short: 1, medium: 2, long: 3}; // sentences per test
  var STORE_PREFIX = 'jn.typing.v1.';

  /* ═══════════════════════════════════════════
     Storage (best WPM per length, chosen length)
     ═══════════════════════════════════════════ */

  function storeGet(key) {
    try { return window.localStorage.getItem(STORE_PREFIX + key); } catch (e) { return null; }
  }

  function storeSet(key, value) {
    try { window.localStorage.setItem(STORE_PREFIX + key, value); }
    catch (e) { /* storage unavailable: nothing persists, game still works */ }
  }

  /* ═══════════════════════════════════════════
     Test state and scoring (no DOM access)
     ═══════════════════════════════════════════ */

  var test = {
    status: 'ready',      // 'ready' | 'typing' | 'done'
    length: LENGTHS[storeGet('length')] ? storeGet('length') : 'short',
    text: '',
    typed: '',
    keys: 0,              // characters typed, including ones later deleted
    correctKeys: 0,       // of those, how many were right when typed
    startedAt: 0,
    endedAt: 0,
    recent: []            // sentence indexes used lately, to avoid repeats
  };

  function pickText() {
    var n = LENGTHS[test.length];
    var pool = [];
    for (var i = 0; i < SENTENCES.length; i++) {
      if (test.recent.indexOf(i) === -1) pool.push(i);
    }
    var chosen = [];
    while (chosen.length < n) {
      var k = Math.floor(Math.random() * pool.length);
      chosen.push(pool.splice(k, 1)[0]);
    }
    // Remember enough to never repeat back to back
    test.recent = chosen.concat(test.recent).slice(0, Math.min(6, SENTENCES.length - n));
    return chosen.map(function(i) { return SENTENCES[i]; }).join(' ');
  }

  function reset() {
    test.status = 'ready';
    test.text = pickText();
    test.typed = '';
    test.keys = 0;
    test.correctKeys = 0;
    test.startedAt = 0;
    test.endedAt = 0;
  }

  // Applies the input's new value; returns true when the test just finished
  function applyTyped(value, now) {
    if (test.status === 'done') return false;
    value = value.slice(0, test.text.length);
    var old = test.typed;

    // Count newly added characters. Input is always at the end (the caret is
    // pinned there), but compare from the common prefix to be safe.
    var p = 0;
    while (p < old.length && p < value.length && old[p] === value[p]) p++;
    for (var i = p; i < value.length; i++) {
      test.keys++;
      if (value[i] === test.text[i]) test.correctKeys++;
    }

    if (test.status === 'ready' && value.length > 0) {
      test.status = 'typing';
      test.startedAt = now;
    }
    test.typed = value;

    if (value.length === test.text.length) {
      test.status = 'done';
      test.endedAt = now;
      return true;
    }
    return false;
  }

  function correctChars() {
    var n = 0;
    for (var i = 0; i < test.typed.length; i++) if (test.typed[i] === test.text[i]) n++;
    return n;
  }

  function elapsedMs(now) {
    if (!test.startedAt) return 0;
    return (test.endedAt || now) - test.startedAt;
  }

  function stats(now) {
    var ms = elapsedMs(now);
    // Under a second the rate is mostly noise; hold at 0 until then
    var minutes = ms >= 1000 ? ms / 60000 : 0;
    return {
      wpm: minutes ? Math.round(correctChars() / 5 / minutes) : 0,
      raw: minutes ? Math.round(test.typed.length / 5 / minutes) : 0,
      acc: test.keys ? Math.round(test.correctKeys / test.keys * 100) : 100,
      seconds: ms / 1000
    };
  }

  /* ═══════════════════════════════════════════
     Rendering
     ═══════════════════════════════════════════ */

  var charEls = [];

  // Words are wrapped in nowrap spans so lines only break at spaces
  function buildText() {
    el.text.textContent = '';
    charEls = [];
    var word = null;
    for (var i = 0; i < test.text.length; i++) {
      var ch = test.text[i];
      if (!word && ch !== ' ') {
        word = document.createElement('span');
        word.className = 'ty-word';
        el.text.appendChild(word);
      }
      var span = document.createElement('span');
      span.className = 'ty-ch';
      span.textContent = ch;
      if (ch === ' ') {
        // Spaces sit between word spans, where the line can break
        span.classList.add('ty-space');
        el.text.appendChild(span);
        word = null;
      } else {
        word.appendChild(span);
      }
      charEls.push(span);
    }
    el.sr.textContent = test.text;
    el.input.value = '';
    el.input.maxLength = test.text.length;
  }

  function renderChars() {
    var typed = test.typed;
    for (var i = 0; i < charEls.length; i++) {
      var cls = 'ty-ch';
      if (test.text[i] === ' ') cls += ' ty-space';
      if (i < typed.length) cls += typed[i] === test.text[i] ? ' ty-ok' : ' ty-bad';
      else if (i === typed.length && test.status !== 'done') cls += ' ty-cur';
      if (charEls[i].className !== cls) charEls[i].className = cls;
    }
  }

  function formatTime(s) {
    return s.toFixed(1) + 's';
  }

  function renderStats() {
    var s = stats(Date.now());
    el.wpm.textContent = s.wpm;
    el.acc.textContent = s.acc + '%';
    el.time.textContent = formatTime(s.seconds);
  }

  function renderBest() {
    var best = Number(storeGet('best.' + test.length)) || 0;
    el.best.textContent = best ? 'Best: ' + best + ' WPM' : '';
  }

  function render() {
    renderChars();
    renderStats();
    root.dataset.status = test.status;
  }

  /* ═══════════════════════════════════════════
     Flow
     ═══════════════════════════════════════════ */

  var ticker = 0;

  function startTicker() {
    if (!ticker) ticker = setInterval(renderStats, 100);
  }

  function stopTicker() {
    clearInterval(ticker);
    ticker = 0;
  }

  function newTest(focus) {
    stopTicker();
    reset();
    buildText();
    el.result.hidden = true;
    el.input.disabled = false;
    render();
    renderBest();
    if (focus) focusInput();
  }

  function finish() {
    stopTicker();
    el.input.disabled = true;
    var s = stats(Date.now());
    var key = 'best.' + test.length;
    var best = Number(storeGet(key)) || 0;
    var note = '';
    if (s.wpm > best) {
      storeSet(key, s.wpm);
      note = best ? 'New best! Previous: ' + best + ' WPM.' : 'First result for this length saved.';
    } else if (best) {
      note = 'Best for this length: ' + best + ' WPM.';
    }
    el.resWpm.textContent = s.wpm;
    el.resAcc.textContent = s.acc + '%';
    el.resRaw.textContent = s.raw;
    el.resTime.textContent = formatTime(s.seconds);
    el.resNote.textContent = note;
    el.result.hidden = false;
    renderBest();
    try { el.next.focus({preventScroll: true}); } catch (e) { el.next.focus(); }
  }

  function focusInput() {
    if (el.input.disabled) return;
    try { el.input.focus({preventScroll: true}); } catch (e) { el.input.focus(); }
    pinCaret();
  }

  function pinCaret() {
    var n = el.input.value.length;
    try { el.input.setSelectionRange(n, n); } catch (e) { /* not focusable yet */ }
  }

  /* ═══════════════════════════════════════════
     Input
     ═══════════════════════════════════════════ */

  el.input.addEventListener('input', function() {
    var done = applyTyped(el.input.value, Date.now());
    if (el.input.value !== test.typed) el.input.value = test.typed;
    if (test.status === 'typing') startTicker();
    render();
    if (done) finish();
  });

  // Keep the caret at the end: editing mid-text would scramble the scoring
  el.input.addEventListener('keydown', function(e) {
    if (/^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End|PageUp|PageDown)$/.test(e.key)) {
      e.preventDefault();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      newTest(true);
    }
  });
  el.input.addEventListener('select', pinCaret);
  el.input.addEventListener('mouseup', pinCaret);
  el.input.addEventListener('paste', function(e) { e.preventDefault(); });
  el.input.addEventListener('drop', function(e) { e.preventDefault(); });

  el.input.addEventListener('focus', function() { root.classList.add('is-focused'); });
  el.input.addEventListener('blur', function() { root.classList.remove('is-focused'); });

  el.area.addEventListener('mousedown', function(e) {
    if (e.target !== el.input) e.preventDefault();
    focusInput();
  });

  // Typing anywhere on the page (with nothing else focused) starts the test
  document.addEventListener('keydown', function(e) {
    if (e.target !== document.body || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1 && test.status !== 'done') {
      if (e.key === ' ') e.preventDefault(); // don't scroll; a leading space would be wrong anyway
      focusInput();
    } else if (e.key === 'Enter' && test.status === 'done') {
      e.preventDefault();
      newTest(true);
    }
  });

  el.restart.addEventListener('click', function() { newTest(true); });
  el.next.addEventListener('click', function() { newTest(true); });

  el.length.value = test.length;
  el.length.addEventListener('change', function() {
    test.length = LENGTHS[el.length.value] ? el.length.value : 'short';
    storeSet('length', test.length);
    test.recent = [];
    newTest(true);
  });

  newTest(false);
})();
