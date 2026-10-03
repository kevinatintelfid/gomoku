(function () {
  "use strict";

  const G = window.Gomoku;
  const AI = window.GomokuAI;
  const { SIZE, EMPTY, BLACK, WHITE } = G;
  const STORAGE_KEY = "gomoku.game.v1";
  const SCORE_KEY = "gomoku.scores.v1";
  const STARS = [[3, 3], [3, 11], [11, 3], [11, 11], [7, 7]];

  const els = {
    board: document.getElementById("board"),
    stones: document.getElementById("stones"),
    grid: document.querySelector(".grid"),
    stars: document.querySelector(".stars"),
    turnDisc: document.getElementById("turn-disc"),
    turnText: document.getElementById("turn-text"),
    moveCount: document.getElementById("move-count"),
    announcement: document.getElementById("announcement"),
    cover: document.getElementById("board-cover"),
    coverIcon: document.getElementById("cover-icon"),
    coverTitle: document.getElementById("cover-title"),
    coverSub: document.getElementById("cover-sub"),
    coverNew: document.getElementById("cover-new"),
    modeAi: document.getElementById("mode-ai"),
    modePvp: document.getElementById("mode-pvp"),
    aiOptions: document.getElementById("ai-options"),
    difficulty: document.getElementById("difficulty"),
    playBlack: document.getElementById("play-black"),
    playWhite: document.getElementById("play-white"),
    newGame: document.getElementById("new-game"),
    undo: document.getElementById("undo"),
    restart: document.getElementById("restart"),
    scoreBlack: document.getElementById("score-black"),
    scoreWhite: document.getElementById("score-white"),
    saveStatus: document.getElementById("save-status")
  };

  // Pending choices for the next new game (committed when "New game" is pressed).
  let pending = { mode: "ai", level: "medium", human: BLACK };
  let state = null;
  let points = [];
  let aiThinking = false;
  let aiTimer = null;
  let countedWinner = false;
  let scores = loadScores();

  function loadScores() {
    try {
      const data = JSON.parse(localStorage.getItem(SCORE_KEY));
      if (data && Number.isFinite(data.black) && Number.isFinite(data.white)) return data;
    } catch { /* ignore */ }
    return { black: 0, white: 0 };
  }

  function saveScores() {
    try { localStorage.setItem(SCORE_KEY, JSON.stringify(scores)); } catch { /* ignore */ }
    els.scoreBlack.textContent = scores.black;
    els.scoreWhite.textContent = scores.white;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      flashSaved();
    } catch { /* ignore */ }
  }

  let saveFlash = null;
  function flashSaved() {
    els.saveStatus.textContent = "Saved";
    clearTimeout(saveFlash);
    saveFlash = setTimeout(() => { els.saveStatus.textContent = "Saved on this device"; }, 1200);
  }

  function buildBoard() {
    for (const [row, col] of STARS) {
      const star = document.createElement("span");
      star.className = "star";
      star.style.left = (col / (SIZE - 1)) * 100 + "%";
      star.style.top = (row / (SIZE - 1)) * 100 + "%";
      els.stars.appendChild(star);
    }
    const frag = document.createDocumentFragment();
    for (let i = 0; i < SIZE * SIZE; i++) {
      const row = Math.floor(i / SIZE), col = i % SIZE;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "point";
      button.style.left = (col / (SIZE - 1)) * 100 + "%";
      button.style.top = (row / (SIZE - 1)) * 100 + "%";
      button.dataset.index = String(i);
      button.setAttribute("role", "gridcell");
      button.addEventListener("click", () => onPoint(i));
      points.push(button);
      frag.appendChild(button);
    }
    els.stones.appendChild(frag);
  }

  function playerName(player) { return player === BLACK ? "Black" : "White"; }

  function aiControls(player) {
    return state.mode === "ai" && player !== state.human;
  }

  function render() {
    const winnerLine = state.line ? new Set(state.line) : null;
    const lastMove = state.moves.length ? state.moves[state.moves.length - 1] : -1;
    for (let i = 0; i < points.length; i++) {
      const button = points[i];
      const value = state.board[i];
      if (value === EMPTY) {
        button.removeAttribute("data-stone");
        button.setAttribute("aria-label", "Empty, row " + (Math.floor(i / SIZE) + 1) + " column " + (i % SIZE + 1));
      } else {
        button.dataset.stone = String(value);
        button.setAttribute("aria-label", playerName(value) + " stone, row " + (Math.floor(i / SIZE) + 1) + " column " + (i % SIZE + 1));
      }
      button.classList.toggle("last", i === lastMove && !winnerLine);
      button.classList.toggle("win", Boolean(winnerLine && winnerLine.has(i)));
      const locked = Boolean(state.winner) || value !== EMPTY || (state.mode === "ai" && aiControls(state.turn));
      button.disabled = locked;
    }

    els.board.dataset.turn = String(state.turn);
    els.turnDisc.className = "disc" + (state.turn === WHITE ? " white" : "");
    els.moveCount.textContent = state.moves.length + (state.moves.length === 1 ? " move" : " moves");
    els.undo.disabled = state.moves.length === 0 || aiThinking;
    els.restart.disabled = state.moves.length === 0;

    els.board.classList.toggle("thinking", aiThinking);

    if (state.winner === -1) {
      els.turnText.textContent = "Draw";
      showCover("draw");
    } else if (state.winner) {
      els.turnText.textContent = playerName(state.winner) + " wins";
      showCover("win");
    } else {
      let label = playerName(state.turn) + " to move";
      if (state.mode === "ai") {
        label = aiControls(state.turn) ? "Computer (" + playerName(state.turn) + ")" : "Your move (" + playerName(state.turn) + ")";
      }
      els.turnText.textContent = label;
      hideCover();
    }
  }

  function showCover(kind) {
    const won = kind === "win";
    els.coverIcon.className = "cover-icon" + (won ? "" : " draw");
    els.coverIcon.innerHTML = won ? '<i data-lucide="trophy"></i>' : '<i data-lucide="handshake"></i>';
    if (won) {
      const winner = state.winner;
      let title = playerName(winner) + " wins";
      if (state.mode === "ai") title = winner === state.human ? "You win!" : "Computer wins";
      els.coverTitle.textContent = title;
      els.coverSub.textContent = "Five in a row.";
    } else {
      els.coverTitle.textContent = "Draw";
      els.coverSub.textContent = "The board is full.";
    }
    els.cover.hidden = false;
    if (window.lucide) window.lucide.createIcons();
  }

  function hideCover() { els.cover.hidden = true; }

  function announce(text) { els.announcement.textContent = text; }

  function afterMove() {
    save();
    render();
    if (state.winner && !countedWinner) {
      countedWinner = true;
      if (state.winner === BLACK) scores.black++;
      else if (state.winner === WHITE) scores.white++;
      saveScores();
      if (state.winner !== -1) {
        announce(state.mode === "ai"
          ? (state.winner === state.human ? "You got five in a row!" : "The computer reached five in a row.")
          : playerName(state.winner) + " connected five.");
      } else {
        announce("A draw — the board filled up.");
      }
      return;
    }
    if (!state.winner) {
      announce("");
      maybeAiMove();
    }
  }

  function onPoint(index) {
    if (aiThinking || state.winner) return;
    if (state.mode === "ai" && aiControls(state.turn)) return;
    if (!G.place(state, index)) return;
    afterMove();
  }

  function maybeAiMove() {
    if (state.mode !== "ai" || state.winner || !aiControls(state.turn)) return;
    aiThinking = true;
    render();
    const me = state.turn;
    const level = state.level;
    const boardCopy = state.board.slice();
    clearTimeout(aiTimer);
    aiTimer = setTimeout(() => {
      let move = AI.chooseMove(boardCopy, me, level);
      if (!Number.isInteger(move) || state.board[move] !== EMPTY) {
        move = state.board.findIndex(v => v === EMPTY);
      }
      aiThinking = false;
      if (move >= 0 && !state.winner) G.place(state, move);
      afterMove();
    }, 260);
  }

  function syncPendingButtons() {
    const ai = pending.mode === "ai";
    els.modeAi.setAttribute("aria-pressed", String(ai));
    els.modePvp.setAttribute("aria-pressed", String(!ai));
    els.aiOptions.hidden = !ai;
    els.difficulty.value = pending.level;
    els.playBlack.setAttribute("aria-pressed", String(pending.human === BLACK));
    els.playWhite.setAttribute("aria-pressed", String(pending.human === WHITE));
  }

  function startGame() {
    clearTimeout(aiTimer);
    aiThinking = false;
    countedWinner = false;
    state = G.create(pending.mode, { level: pending.level, human: pending.human });
    announce("");
    save();
    render();
    maybeAiMove();
  }

  function restart() {
    if (!state) return;
    clearTimeout(aiTimer);
    aiThinking = false;
    countedWinner = false;
    state = G.create(state.mode, { level: state.level, human: state.human });
    announce("");
    save();
    render();
    maybeAiMove();
  }

  function undoMove() {
    if (aiThinking || !state.moves.length) return;
    countedWinner = false;
    G.undo(state);
    // In computer mode, also undo the computer's reply so it stays the human's turn.
    if (state.mode === "ai" && state.moves.length && aiControls(state.turn)) {
      G.undo(state);
    }
    announce("");
    save();
    render();
  }

  // Controls wiring.
  els.modeAi.addEventListener("click", () => { pending.mode = "ai"; syncPendingButtons(); });
  els.modePvp.addEventListener("click", () => { pending.mode = "pvp"; syncPendingButtons(); });
  els.difficulty.addEventListener("change", () => { pending.level = els.difficulty.value; });
  els.playBlack.addEventListener("click", () => { pending.human = BLACK; syncPendingButtons(); });
  els.playWhite.addEventListener("click", () => { pending.human = WHITE; syncPendingButtons(); });
  els.newGame.addEventListener("click", startGame);
  els.coverNew.addEventListener("click", startGame);
  els.undo.addEventListener("click", undoMove);
  els.restart.addEventListener("click", restart);

  function init() {
    buildBoard();
    saveScores();
    const restored = G.restore(localStorage.getItem(STORAGE_KEY) || "");
    if (restored) {
      state = restored;
      countedWinner = Boolean(state.winner);
      pending = { mode: state.mode, level: state.level, human: state.human };
    } else {
      state = G.create(pending.mode, { level: pending.level, human: pending.human });
    }
    syncPendingButtons();
    render();
    if (window.lucide) window.lucide.createIcons();
    maybeAiMove();
  }

  init();
}());
