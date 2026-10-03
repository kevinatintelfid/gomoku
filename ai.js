(function () {
  "use strict";

  const { SIZE, EMPTY, BLACK, WHITE, DIRS, idx, inBounds } = window.Gomoku;
  const WIN = 10000000;
  const OPP_WEIGHT = 1.1;

  function patternScore(len, open) {
    if (len >= 5) return WIN;
    if (len === 4) return open === 2 ? 500000 : open === 1 ? 50000 : 0;
    if (len === 3) return open === 2 ? 20000 : open === 1 ? 1000 : 0;
    if (len === 2) return open === 2 ? 500 : open === 1 ? 100 : 0;
    if (len === 1) return open === 2 ? 20 : open === 1 ? 5 : 0;
    return 0;
  }

  // Full-board score for one player, counting each run once at its start.
  function scorePlayer(board, player) {
    let score = 0;
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (board[idx(row, col)] !== player) continue;
        for (const [dr, dc] of DIRS) {
          const pr = row - dr, pc = col - dc;
          if (inBounds(pr, pc) && board[idx(pr, pc)] === player) continue;
          let len = 0, r = row, c = col;
          while (inBounds(r, c) && board[idx(r, c)] === player) { len++; r += dr; c += dc; }
          const beforeOpen = inBounds(pr, pc) && board[idx(pr, pc)] === EMPTY;
          const afterOpen = inBounds(r, c) && board[idx(r, c)] === EMPTY;
          score += patternScore(len, (beforeOpen ? 1 : 0) + (afterOpen ? 1 : 0));
        }
      }
    }
    return score;
  }

  function evaluate(board, me) {
    const opp = me === BLACK ? WHITE : BLACK;
    return scorePlayer(board, me) - scorePlayer(board, opp) * OPP_WEIGHT;
  }

  function makesFive(board, index, player) {
    const row = Math.floor(index / SIZE), col = index % SIZE;
    for (const [dr, dc] of DIRS) {
      let count = 1;
      for (let step = 1; step < 5; step++) {
        const r = row + dr * step, c = col + dc * step;
        if (inBounds(r, c) && board[idx(r, c)] === player) count++; else break;
      }
      for (let step = 1; step < 5; step++) {
        const r = row - dr * step, c = col - dc * step;
        if (inBounds(r, c) && board[idx(r, c)] === player) count++; else break;
      }
      if (count >= 5) return true;
    }
    return false;
  }

  // Cheap ordering heuristic: only the four lines through this cell.
  function localScore(board, index, player) {
    const row = Math.floor(index / SIZE), col = index % SIZE;
    board[index] = player;
    let score = 0;
    for (const [dr, dc] of DIRS) {
      let len = 1, r = row + dr, c = col + dc;
      while (inBounds(r, c) && board[idx(r, c)] === player) { len++; r += dr; c += dc; }
      const afterOpen = inBounds(r, c) && board[idx(r, c)] === EMPTY;
      r = row - dr; c = col - dc;
      while (inBounds(r, c) && board[idx(r, c)] === player) { len++; r -= dr; c -= dc; }
      const beforeOpen = inBounds(r, c) && board[idx(r, c)] === EMPTY;
      score += patternScore(len, (beforeOpen ? 1 : 0) + (afterOpen ? 1 : 0));
    }
    board[index] = EMPTY;
    return score;
  }

  function candidates(board, radius) {
    const seen = new Set();
    let any = false;
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (board[idx(row, col)] === EMPTY) continue;
        any = true;
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const r = row + dr, c = col + dc;
            if (inBounds(r, c) && board[idx(r, c)] === EMPTY) seen.add(idx(r, c));
          }
        }
      }
    }
    if (!any) return [idx(7, 7)];
    return [...seen];
  }

  function ordered(board, mover, limit) {
    const opp = mover === BLACK ? WHITE : BLACK;
    const scored = candidates(board, 2).map(index => ({
      index,
      rank: Math.max(localScore(board, index, mover), localScore(board, index, opp))
    }));
    scored.sort((a, b) => b.rank - a.rank);
    return scored.slice(0, limit).map(item => item.index);
  }

  // Return an immediate winning move, or a forced block, else -1.
  function tactical(board, me) {
    const opp = me === BLACK ? WHITE : BLACK;
    const cells = candidates(board, 1);
    for (const index of cells) {
      board[index] = me;
      const win = makesFive(board, index, me);
      board[index] = EMPTY;
      if (win) return index;
    }
    const blocks = [];
    for (const index of cells) {
      board[index] = opp;
      const win = makesFive(board, index, opp);
      board[index] = EMPTY;
      if (win) blocks.push(index);
    }
    if (blocks.length) {
      let best = blocks[0], value = -Infinity;
      for (const index of blocks) {
        board[index] = me;
        const score = evaluate(board, me);
        board[index] = EMPTY;
        if (score > value) { value = score; best = index; }
      }
      return best;
    }
    return -1;
  }

  function alphabeta(board, me, mover, depth, alpha, beta, width) {
    const opp = me === BLACK ? WHITE : BLACK;
    const myScore = scorePlayer(board, me);
    const oppScore = scorePlayer(board, opp);
    if (depth === 0 || myScore >= WIN || oppScore >= WIN) return myScore - oppScore * OPP_WEIGHT;
    const moves = ordered(board, mover, width);
    if (!moves.length) return myScore - oppScore * OPP_WEIGHT;
    if (mover === me) {
      let best = -Infinity;
      for (const index of moves) {
        board[index] = mover;
        best = Math.max(best, alphabeta(board, me, opp, depth - 1, alpha, beta, width));
        board[index] = EMPTY;
        alpha = Math.max(alpha, best);
        if (alpha >= beta) break;
      }
      return best;
    }
    let best = Infinity;
    for (const index of moves) {
      board[index] = mover;
      best = Math.min(best, alphabeta(board, me, me, depth - 1, alpha, beta, width));
      board[index] = EMPTY;
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }

  function chooseMove(board, me, level) {
    const opp = me === BLACK ? WHITE : BLACK;
    if (board.every(value => value === EMPTY)) return idx(7, 7);

    if (level === "easy") {
      for (const index of candidates(board, 1)) {
        board[index] = me;
        const win = makesFive(board, index, me);
        board[index] = EMPTY;
        if (win) return index;
      }
      const block = tactical(board, me);
      if (block >= 0 && Math.random() < 0.6) return block;
      const options = ordered(board, me, 8);
      return options[Math.floor(Math.random() * Math.min(3, options.length))] ?? options[0];
    }

    const forced = tactical(board, me);
    if (forced >= 0) return forced;

    const depth = level === "hard" ? 4 : 2;
    const width = level === "hard" ? 8 : 10;
    const moves = ordered(board, me, level === "hard" ? 12 : 10);
    let best = moves[0], value = -Infinity, alpha = -Infinity;
    for (const index of moves) {
      board[index] = me;
      const score = alphabeta(board, me, opp, depth - 1, alpha, Infinity, width);
      board[index] = EMPTY;
      if (score > value) { value = score; best = index; }
      alpha = Math.max(alpha, value);
    }
    return best;
  }

  window.GomokuAI = { chooseMove, evaluate, scorePlayer, makesFive, candidates };
}());
