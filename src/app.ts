import { WORDS, getRandomWord } from './words';

interface Hint {
  letter: string;
  result: 'green' | 'yellow' | 'gray';
  distance?: number;
  direction?: 'up' | 'down';
}

interface GameStats {
  gamesPlayed: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
}

let targetWord = '';
let guesses: string[] = [];
let currentGuess = '';
let gameOver = false;
let guessCount = 0;

function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem('cluegrid_stats');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { gamesPlayed: 0, wins: 0, currentStreak: 0, maxStreak: 0 };
}

function saveStats(stats: GameStats) {
  localStorage.setItem('cluegrid_stats', JSON.stringify(stats));
}

function updateStatsUI() {
  const stats = loadStats();
  const el = document.getElementById('stat-bar');
  if (!el) return;
  el.innerHTML = `
    <span>Played <strong>${stats.gamesPlayed}</strong></span>
    <span>Won <strong>${stats.wins}</strong></span>
    <span>Streak <strong>${stats.currentStreak}</strong></span>
  `;
}

function evaluateGuess(guess: string): Hint[] {
  const targetArr = targetWord.split('');
  const guessArr = guess.split('');
  const result: Hint[] = new Array(6).fill(null)!;
  const used = new Array(6).fill(false);

  for (let i = 0; i < 6; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = { letter: guessArr[i], result: 'green' };
      used[i] = true;
    }
  }

  for (let i = 0; i < 6; i++) {
    if (result[i]) continue;
    const idx = targetArr.findIndex((t, j) => !used[j] && t === guessArr[i]);
    if (idx !== -1) {
      used[idx] = true;
      const gCode = guessArr[i].charCodeAt(0);
      const tCode = targetArr[idx].charCodeAt(0);
      const dist = Math.abs(gCode - tCode);
      const dir = gCode < tCode ? 'up' : 'down';
      result[i] = { letter: guessArr[i], result: 'yellow', distance: dist, direction: dir };
    } else {
      result[i] = { letter: guessArr[i], result: 'gray' };
    }
  }

  return result;
}

function buildBoard() {
  const board = document.getElementById('board');
  if (!board) return;
  board.innerHTML = '';

  for (let r = 0; r < 6; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.id = `row-${r}`;

    for (let c = 0; c < 6; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.id = `tile-${r}-${c}`;
      row.appendChild(tile);
    }
    board.appendChild(row);
  }
}

function renderGuess(guess: string, rowIndex: number) {
  const hints = evaluateGuess(guess);
  const row = document.getElementById(`row-${rowIndex}`);
  if (!row) return;

  const tiles = row.querySelectorAll('.tile');
  tiles.forEach((tile, i) => {
    const el = tile as HTMLElement;
    el.textContent = guess[i];
    el.className = 'tile';
    el.style.animation = 'none';
    void el.offsetHeight;

    const h = hints[i];
    if (h.result === 'green') {
      el.classList.add('green');
    } else if (h.result === 'yellow') {
      el.classList.add('yellow');
      let hintText = '';
      if (h.distance !== undefined && h.direction) {
        const arrow = h.direction === 'up' ? '▲' : '▼';
        hintText = `${arrow}${h.distance}`;
      }
      if (hintText) {
        const span = document.createElement('span');
        span.className = 'hint';
        if (h.distance !== undefined) {
          if (h.distance <= 2) span.classList.add('warm');
          else if (h.distance <= 5) span.classList.add('neutral');
          else span.classList.add('cool');
        }
        span.textContent = hintText;
        el.appendChild(span);
      }
    } else {
      el.classList.add('gray');
    }
    el.style.animation = `pop 0.2s ease ${i * 0.06}s both`;
    el.classList.add('pop');
  });
}

function renderCurrentGuess() {
  const row = document.getElementById(`row-${guessCount}`);
  if (!row) return;
  const tiles = row.querySelectorAll('.tile');
  tiles.forEach((tile, i) => {
    const el = tile as HTMLElement;
    el.textContent = currentGuess[i] || '';
    el.className = 'tile';
    el.style.borderColor = currentGuess[i] ? 'var(--accent)' : '';
  });
}

function submitGuess() {
  if (gameOver) return;
  const guess = currentGuess.trim().toUpperCase();
  if (guess.length !== 6) {
    setMessage('Word must be 6 letters');
    return;
  }
  if (!WORDS.includes(guess)) {
    setMessage('Not in word list');
    return;
  }

  renderGuess(guess, guessCount);
  guesses.push(guess);
  currentGuess = '';
  const input = document.getElementById('guess-input') as HTMLInputElement | null;
  if (input) input.value = '';

  const win = guess === targetWord;
  const lose = !win && guessCount >= 5;

  if (win || lose) {
    gameOver = true;
    const stats = loadStats();
    stats.gamesPlayed++;
    if (win) {
      stats.wins++;
      stats.currentStreak++;
      if (stats.currentStreak > stats.maxStreak) stats.maxStreak = stats.currentStreak;
      setMessage('You got it!', 'win');
    } else {
      stats.currentStreak = 0;
      setMessage('Unlucky!', 'lose');
    }
    saveStats(stats);
    updateStatsUI();

    setTimeout(() => showOverlay(win), 800);
  } else {
    guessCount++;
    setMessage('');
    if (input) input.focus();
  }
}

function setMessage(msg: string, type?: 'win' | 'lose') {
  const el = document.getElementById('message');
  if (!el) return;
  el.textContent = msg;
  el.className = type || '';
}

function showOverlay(win: boolean) {
  const overlay = document.getElementById('overlay');
  const inner = document.getElementById('overlay-inner');
  if (!overlay || !inner) return;
  inner.innerHTML = `
    <h2 class="${win ? '' : 'lose-title'}">${win ? 'You Win!' : 'Game Over'}</h2>
    <div class="word-reveal">${targetWord}</div>
    <p>${win ? `Solved in ${guesses.length} / 6` : 'Better luck next time'}</p>
    <button class="btn btn-primary" id="play-again">Play Again</button>
  `;
  overlay.classList.add('active');
  document.getElementById('play-again')?.addEventListener('click', () => {
    overlay.classList.remove('active');
    resetGame();
  });
}

function resetGame() {
  targetWord = getRandomWord();
  guesses = [];
  currentGuess = '';
  gameOver = false;
  guessCount = 0;
  setMessage('');
  const input = document.getElementById('guess-input') as HTMLInputElement | null;
  if (input) { input.value = ''; input.disabled = false; input.focus(); }
  buildBoard();
  updateStatsUI();
}

export function initGame() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <header>
      <div>
        <h1>ClueGrid</h1>
        <div class="subtitle">Euthenia Studio</div>
      </div>
    </header>
    <div class="stat-bar" id="stat-bar"></div>
    <div id="board"></div>
    <div id="input-row">
      <input type="text" id="guess-input" maxlength="6" placeholder="Type a 6-letter word" autocomplete="off" autocapitalize="off" spellcheck="false" />
      <button class="btn btn-primary" id="guess-btn">Guess</button>
    </div>
    <div id="message"></div>
    <div id="overlay"><div id="overlay-inner"></div></div>
  `;

  targetWord = getRandomWord();
  buildBoard();
  updateStatsUI();

  document.getElementById('guess-btn')?.addEventListener('click', submitGuess);
  document.getElementById('guess-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitGuess();
  });

  const input = document.getElementById('guess-input') as HTMLInputElement | null;
  if (input) input.focus();

  document.addEventListener('keydown', handleKeydown);
}

function handleKeydown(e: KeyboardEvent) {
  if (gameOver) return;
  if (e.key === 'Enter') { submitGuess(); return; }
  if (e.key === 'Backspace') {
    currentGuess = currentGuess.slice(0, -1);
    renderCurrentGuess();
    return;
  }
  const char = e.key.toUpperCase();
  if (/^[A-Z]$/.test(char) && currentGuess.length < 6) {
    currentGuess += char;
    renderCurrentGuess();
  }
}
