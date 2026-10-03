(function () {
  "use strict";

  const SIZE = 15;
  const EMPTY = 0, BLACK = 1, WHITE = 2;
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const LEVELS = ["easy", "medium", "hard"];

  const idx = (row, col) => row * SIZE + col;
  const inBounds = (row, col) => row >= 0 && row < SIZE && col >= 0 && col < SIZE;

  function create(mode, options) {
    options = options || {};
    const isAi = mode === "ai";
    const human = isAi && options.human === WHITE ? WHITE : BLACK;
    return {
      version: 1,
      size: SIZE,
      mode: isAi ? "ai" : "pvp",
      level: LEVELS.includes(options.level) ? options.level : "medium",
      human,
      board: new Array(SIZE * SIZE).fill(EMPTY),
      turn: BLACK,
      moves: [],
      winner: EMPTY,
      line: null
    };
  }

  function winningLine(board, index, player) {
    const row = Math.floor(index / SIZE), col = index % SIZE;
    for (const [dr, dc] of DIRS) {
      const line = [index];
      for (let step = 1; step < 5; step++) {
        const r = row + dr * step, c = col + dc * step;
        if (inBounds(r, c) && board[idx(r, c)] === player) line.push(idx(r, c)); else break;
      }
      for (let step = 1; step < 5; step++) {
        const r = row - dr * step, c = col - dc * step;
        if (inBounds(r, c) && board[idx(r, c)] === player) line.unshift(idx(r, c)); else break;
      }
      if (line.length >= 5) return line;
    }
    return null;
  }

  function place(state, index) {
    if (!Number.isInteger(index) || index < 0 || index >= SIZE * SIZE) return false;
    if (state.winner || state.board[index] !== EMPTY) return false;
    const player = state.turn;
    state.board[index] = player;
    state.moves.push(index);
    const line = winningLine(state.board, index, player);
    if (line) {
      state.winner = player;
      state.line = line;
    } else if (state.moves.length === SIZE * SIZE) {
      state.winner = -1;
    } else {
      state.turn = player === BLACK ? WHITE : BLACK;
    }
    return true;
  }

  function undo(state) {
    if (!state.moves.length) return false;
    const last = state.moves.pop();
    state.board[last] = EMPTY;
    state.winner = EMPTY;
    state.line = null;
    state.turn = state.moves.length % 2 === 0 ? BLACK : WHITE;
    return true;
  }

  function restore(text) {
    try {
      const state = JSON.parse(text);
      if (!state || state.version !== 1 || state.size !== SIZE) return null;
      if (!["ai", "pvp"].includes(state.mode)) return null;
      if (![BLACK, WHITE].includes(state.human)) return null;
      if (!LEVELS.includes(state.level)) return null;
      if (![BLACK, WHITE].includes(state.turn)) return null;
      if (![EMPTY, BLACK, WHITE, -1].includes(state.winner)) return null;
      if (!Array.isArray(state.board) || state.board.length !== SIZE * SIZE) return null;
      if (!state.board.every(value => value === EMPTY || value === BLACK || value === WHITE)) return null;
      if (!Array.isArray(state.moves)) return null;
      if (new Set(state.moves).size !== state.moves.length) return null;
      if (!state.moves.every(move => Number.isInteger(move) && move >= 0 && move < SIZE * SIZE && state.board[move] !== EMPTY)) return null;
      const black = state.board.filter(value => value === BLACK).length;
      const white = state.board.filter(value => value === WHITE).length;
      if (black + white !== state.moves.length) return null;
      if (black - white !== 0 && black - white !== 1) return null;
      if (state.line !== null && (!Array.isArray(state.line) || state.line.length < 5)) return null;
      return state;
    } catch {
      return null;
    }
  }

  window.Gomoku = { SIZE, EMPTY, BLACK, WHITE, DIRS, idx, inBounds, create, place, undo, winningLine, restore };
}());
