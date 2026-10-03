(function () {
  "use strict";
  const output = document.getElementById("results");
  const results = [];
  const { SIZE, EMPTY, BLACK, WHITE, idx, create, place, undo, winningLine, restore } = window.Gomoku;
  const AI = window.GomokuAI;

  function assert(condition, label) {
    if (!condition) throw new Error(label);
    results.push("PASS " + label);
    output.textContent = results.join("\n");
  }

  function blank() { return new Array(SIZE * SIZE).fill(EMPTY); }
  function put(board, player, cells) { cells.forEach(([r, c]) => { board[idx(r, c)] = player; }); return board; }

  try {
    // Win detection in every direction.
    let board = put(blank(), BLACK, [[7, 3], [7, 4], [7, 5], [7, 6], [7, 7]]);
    assert(winningLine(board, idx(7, 5), BLACK).length === 5, "Detects horizontal five");
    board = put(blank(), WHITE, [[2, 4], [3, 4], [4, 4], [5, 4], [6, 4]]);
    assert(winningLine(board, idx(4, 4), WHITE).length === 5, "Detects vertical five");
    board = put(blank(), BLACK, [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]);
    assert(winningLine(board, idx(2, 2), BLACK).length === 5, "Detects diagonal five");
    board = put(blank(), BLACK, [[4, 0], [3, 1], [2, 2], [1, 3], [0, 4]]);
    assert(winningLine(board, idx(2, 2), BLACK).length === 5, "Detects anti-diagonal five");
    board = put(blank(), BLACK, [[7, 3], [7, 4], [7, 5], [7, 6]]);
    assert(winningLine(board, idx(7, 4), BLACK) === null, "Four in a row is not a win");

    // Turn flow and rules.
    let state = create("pvp");
    assert(state.turn === BLACK, "Black moves first");
    assert(place(state, idx(7, 7)) && state.turn === WHITE, "Turn alternates after a move");
    assert(!place(state, idx(7, 7)), "Cannot play an occupied point");
    assert(place(state, idx(7, 8)) && state.turn === BLACK, "Turn returns to black");

    // Winning ends the game and locks the board.
    state = create("pvp");
    [[7, 1], [0, 1], [7, 2], [0, 2], [7, 3], [0, 3], [7, 4], [0, 4]].forEach(([r, c]) => place(state, idx(r, c)));
    assert(state.winner === EMPTY, "No winner before five");
    assert(place(state, idx(7, 5)) && state.winner === BLACK, "Fifth in a row wins");
    assert(state.line.length === 5, "Winning line is recorded");
    assert(!place(state, idx(9, 9)), "Cannot move after the game is won");

    // Undo.
    state = create("pvp");
    place(state, idx(7, 7));
    place(state, idx(7, 8));
    assert(undo(state) && state.board[idx(7, 8)] === EMPTY && state.turn === WHITE, "Undo reverts the last move and turn");
    assert(undo(state) && state.board[idx(7, 7)] === EMPTY && state.turn === BLACK, "Undo reverts back to the start");
    assert(!undo(state), "Undo on an empty board does nothing");

    // AI takes an immediate win (all levels).
    for (const level of ["easy", "medium", "hard"]) {
      const win = put(blank(), BLACK, [[7, 3], [7, 4], [7, 5], [7, 6]]);
      const move = AI.chooseMove(win, BLACK, level);
      win[move] = BLACK;
      assert(AI.makesFive(win, move, BLACK), level + " AI completes a winning five");
    }

    // AI blocks an opponent's open four (medium and hard are deterministic here).
    for (const level of ["medium", "hard"]) {
      const threat = put(blank(), BLACK, [[7, 3], [7, 4], [7, 5], [7, 6]]);
      const move = AI.chooseMove(threat, WHITE, level);
      assert(move === idx(7, 2) || move === idx(7, 7), level + " AI blocks an open four");
    }

    // AI never returns an occupied or out-of-range point.
    let mixed = create("ai", { human: BLACK, level: "hard" });
    [[7, 7], [7, 8], [8, 7], [6, 6], [8, 8]].forEach(([r, c], i) => { mixed.board[idx(r, c)] = i % 2 === 0 ? BLACK : WHITE; });
    const aiMove = AI.chooseMove(mixed.board, WHITE, "hard");
    assert(Number.isInteger(aiMove) && aiMove >= 0 && aiMove < SIZE * SIZE && mixed.board[aiMove] === EMPTY, "AI returns a legal empty point");

    // Evaluation ordering.
    const openFour = AI.scorePlayer(put(blank(), BLACK, [[7, 3], [7, 4], [7, 5], [7, 6]]), BLACK);
    const openThree = AI.scorePlayer(put(blank(), BLACK, [[7, 3], [7, 4], [7, 5]]), BLACK);
    const openTwo = AI.scorePlayer(put(blank(), BLACK, [[7, 3], [7, 4]]), BLACK);
    assert(openFour > openThree && openThree > openTwo, "Longer open runs score higher");

    // Persistence.
    state = create("ai", { human: WHITE, level: "hard" });
    place(state, idx(7, 7));
    assert(restore(JSON.stringify(state)) !== null, "Valid saved game restores");
    const tampered = JSON.parse(JSON.stringify(state));
    tampered.board[idx(0, 0)] = BLACK;
    assert(restore(JSON.stringify(tampered)) === null, "Board inconsistent with move list is rejected");
    assert(restore("not json") === null, "Corrupt save is ignored");
    assert(restore('{"version":1}') === null, "Incomplete save is ignored");

    output.textContent += "\n\nALL " + results.length + " CHECKS PASSED";
    document.body.dataset.result = "passed";
  } catch (error) {
    output.textContent += "\nFAIL " + error.message;
    document.body.dataset.result = "failed";
    console.error(error);
  }
}());
