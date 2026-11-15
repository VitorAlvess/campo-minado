import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  getNeighbors,
  populateMines,
  revealCell,
  toggleFlag,
  chordCell,
  checkWinCondition,
  countFlags,
} from './logic';
import { DIFFICULTIES, Board } from '../types';

describe('createEmptyBoard', () => {
  it('should create a board with correct dimensions for Easy difficulty (9x9)', () => {
    const { rows, cols } = DIFFICULTIES.easy;
    const board = createEmptyBoard(rows, cols);

    expect(board.length).toBe(9);
    for (let r = 0; r < 9; r++) {
      expect(board[r].length).toBe(9);
    }
  });

  it('should create a board with correct dimensions for Medium (12x12) and Hard (16x14)', () => {
    const mediumBoard = createEmptyBoard(DIFFICULTIES.medium.rows, DIFFICULTIES.medium.cols);
    expect(mediumBoard.length).toBe(12);
    expect(mediumBoard[0].length).toBe(12);

    const hardBoard = createEmptyBoard(DIFFICULTIES.hard.rows, DIFFICULTIES.hard.cols);
    expect(hardBoard.length).toBe(16);
    expect(hardBoard[0].length).toBe(14);
  });

  it('should initialize all cells with default values and correct coordinates', () => {
    const board = createEmptyBoard(3, 4);

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = board[r][c];
        expect(cell).toEqual({
          row: r,
          col: c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          adjacentMines: 0,
        });
      }
    }
  });
});

describe('getNeighbors', () => {
  const board = createEmptyBoard(5, 5);

  it('should return 3 neighbors for a corner cell', () => {
    const neighborsTopLeft = getNeighbors(board, 0, 0);
    expect(neighborsTopLeft.length).toBe(3);
    const coords = neighborsTopLeft.map((c) => `${c.row},${c.col}`).sort();
    expect(coords).toEqual(['0,1', '1,0', '1,1']);

    const neighborsBottomRight = getNeighbors(board, 4, 4);
    expect(neighborsBottomRight.length).toBe(3);
  });

  it('should return 5 neighbors for an edge cell', () => {
    const neighborsTopEdge = getNeighbors(board, 0, 2);
    expect(neighborsTopEdge.length).toBe(5);
    const coords = neighborsTopEdge.map((c) => `${c.row},${c.col}`).sort();
    expect(coords).toEqual(['0,1', '0,3', '1,1', '1,2', '1,3']);
  });

  it('should return 8 neighbors for an interior cell', () => {
    const neighborsCenter = getNeighbors(board, 2, 2);
    expect(neighborsCenter.length).toBe(8);
  });
});

describe('populateMines & Safe Zone', () => {
  it('should place exactly the requested number of mines', () => {
    const rows = 9;
    const cols = 9;
    const mines = 10;
    const board = createEmptyBoard(rows, cols);
    const populated = populateMines(board, rows, cols, mines, 4, 4);

    let totalMines = 0;
    for (const row of populated) {
      for (const cell of row) {
        if (cell.isMine) totalMines++;
      }
    }
    expect(totalMines).toBe(mines);
  });

  it('should guarantee that the clicked cell and all its 8 neighbors have NO mines (safe zone)', () => {
    const rows = 9;
    const cols = 9;
    const mines = 10;
    const board = createEmptyBoard(rows, cols);

    // Repeat multiple times to ensure randomness doesn't violate the rule
    for (let trial = 0; trial < 20; trial++) {
      const safeR = 4;
      const safeC = 4;
      const populated = populateMines(board, rows, cols, mines, safeR, safeC);

      // Safe cell itself
      expect(populated[safeR][safeC].isMine).toBe(false);
      expect(populated[safeR][safeC].adjacentMines).toBe(0);

      // 8 neighbors of safe cell
      const neighbors = getNeighbors(populated, safeR, safeC);
      for (const neighbor of neighbors) {
        expect(neighbor.isMine).toBe(false);
      }
    }
  });

  it('should respect safe zone on corner and edge clicks', () => {
    const rows = 9;
    const cols = 9;
    const mines = 10;
    const board = createEmptyBoard(rows, cols);

    // Corner click (0, 0)
    const populatedCorner = populateMines(board, rows, cols, mines, 0, 0);
    expect(populatedCorner[0][0].isMine).toBe(false);
    expect(populatedCorner[0][0].adjacentMines).toBe(0);
    const cornerNeighbors = getNeighbors(populatedCorner, 0, 0);
    for (const n of cornerNeighbors) {
      expect(n.isMine).toBe(false);
    }

    // Edge click (0, 4)
    const populatedEdge = populateMines(board, rows, cols, mines, 0, 4);
    expect(populatedEdge[0][4].isMine).toBe(false);
    expect(populatedEdge[0][4].adjacentMines).toBe(0);
    const edgeNeighbors = getNeighbors(populatedEdge, 0, 4);
    for (const n of edgeNeighbors) {
      expect(n.isMine).toBe(false);
    }
  });

  it('should correctly calculate adjacentMines for all cells', () => {
    const rows = 9;
    const cols = 9;
    const mines = 10;
    const board = createEmptyBoard(rows, cols);
    const populated = populateMines(board, rows, cols, mines, 2, 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!populated[r][c].isMine) {
          const actualMines = getNeighbors(populated, r, c).filter((n) => n.isMine).length;
          expect(populated[r][c].adjacentMines).toBe(actualMines);
        }
      }
    }
  });

  it('should fallback to single-cell safe zone when mine count exceeds available cells outside 9-cell zone', () => {
    // 3x3 board = 9 cells. safeZone = 9 cells. availableCells = 0.
    // If minesCount = 5, availableCells (0) < minesCount (5),
    // so actualSafeZone drops to only the clicked cell.
    const board = createEmptyBoard(3, 3);
    const populated = populateMines(board, 3, 3, 5, 1, 1);

    expect(populated[1][1].isMine).toBe(false);
    let totalMines = 0;
    for (const r of populated) {
      for (const c of r) {
        if (c.isMine) totalMines++;
      }
    }
    expect(totalMines).toBe(5);
  });

  it('BUG-05: should clamp minesCount to at most rows * cols - 1 and at least 0 without infinite loop', () => {
    const board = createEmptyBoard(3, 3); // 9 cells
    // Requesting 15 mines (more than 9 cells)
    const clampedPopulated = populateMines(board, 3, 3, 15, 1, 1);
    let totalMines = 0;
    for (const r of clampedPopulated) {
      for (const c of r) {
        if (c.isMine) totalMines++;
      }
    }
    // Should be clamped to 9 - 1 = 8 mines, safe cell remains safe
    expect(totalMines).toBe(8);
    expect(clampedPopulated[1][1].isMine).toBe(false);

    // Negative mines should clamp to 0
    const zeroBoard = populateMines(board, 3, 3, -5, 1, 1);
    let zeroMines = 0;
    for (const r of zeroBoard) {
      for (const c of r) {
        if (c.isMine) zeroMines++;
      }
    }
    expect(zeroMines).toBe(0);
  });
});

describe('revealCell & Flood-Fill Cascade', () => {
  function buildCustomBoard(layout: string[][]): Board {
    const rows = layout.length;
    const cols = layout[0].length;
    const board: Board = createEmptyBoard(rows, cols);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (layout[r][c] === 'M') {
          board[r][c].isMine = true;
        }
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!board[r][c].isMine) {
          board[r][c].adjacentMines = getNeighbors(board, r, c).filter((n) => n.isMine).length;
        }
      }
    }
    return board;
  }

  it('BUG-10: should return identical board reference without cloning if cell is already revealed or flagged', () => {
    const board = createEmptyBoard(3, 3);
    board[0][0].isRevealed = true;
    board[0][1].isFlagged = true;

    const resRevealed = revealCell(board, 0, 0);
    expect(resRevealed.newBoard).toBe(board); // Exact same reference

    const resFlagged = revealCell(board, 0, 1);
    expect(resFlagged.newBoard).toBe(board); // Exact same reference
  });

  it('should cascade-reveal empty cells and stop at numbered cells', () => {
    // Layout:
    // . . . M
    // . . . M
    // . . . M
    // Row 0, Col 0 has adjacentMines = 0.
    // Neighbors at Col 2 will have adjacentMines = 2 or 3 (numbered boundary).
    const layout = [
      ['.', '.', '.', 'M'],
      ['.', '.', '.', 'M'],
      ['.', '.', '.', 'M'],
      ['.', '.', '.', 'M'],
    ];
    const board = buildCustomBoard(layout);

    const { newBoard, hitMine } = revealCell(board, 0, 0);

    expect(hitMine).toBe(false);
    // Cols 0, 1, 2 should all be revealed
    for (let r = 0; r < 4; r++) {
      expect(newBoard[r][0].isRevealed).toBe(true);
      expect(newBoard[r][1].isRevealed).toBe(true);
      expect(newBoard[r][2].isRevealed).toBe(true);
      // Mine column must NOT be revealed
      expect(newBoard[r][3].isRevealed).toBe(false);
    }
  });

  it('should only reveal the single clicked cell if it is a numbered cell (> 0 adjacent mines)', () => {
    // Layout:
    // . M
    // . .
    // (0, 0) has 1 adjacent mine.
    const layout = [
      ['.', 'M'],
      ['.', '.'],
    ];
    const board = buildCustomBoard(layout);
    expect(board[0][0].adjacentMines).toBe(1);

    const { newBoard, hitMine } = revealCell(board, 0, 0);
    expect(hitMine).toBe(false);
    expect(newBoard[0][0].isRevealed).toBe(true);
    expect(newBoard[0][1].isRevealed).toBe(false);
    expect(newBoard[1][0].isRevealed).toBe(false);
    expect(newBoard[1][1].isRevealed).toBe(false);
  });

  it('should do nothing when revealing an already revealed cell', () => {
    const board = createEmptyBoard(3, 3);
    const { newBoard: firstReveal } = revealCell(board, 1, 1);
    const { newBoard: secondReveal, hitMine } = revealCell(firstReveal, 1, 1);

    expect(hitMine).toBe(false);
    expect(secondReveal).toBe(firstReveal);
  });

  it('should do nothing when trying to reveal a flagged cell', () => {
    const board = createEmptyBoard(3, 3);
    board[1][1].isFlagged = true;

    const { newBoard, hitMine } = revealCell(board, 1, 1);
    expect(hitMine).toBe(false);
    expect(newBoard[1][1].isRevealed).toBe(false);
  });

  it('should NOT cascade through flagged cells during flood-fill', () => {
    // Layout 1x5: [ . , . , . , . , M ]
    // Flagging cell (0, 2) should block flood fill beyond it
    const layout = [
      ['.', '.', '.', '.', 'M'],
    ];
    const board = buildCustomBoard(layout);
    board[0][2].isFlagged = true;

    const { newBoard } = revealCell(board, 0, 0);

    expect(newBoard[0][0].isRevealed).toBe(true);
    expect(newBoard[0][1].isRevealed).toBe(true);
    expect(newBoard[0][2].isRevealed).toBe(false); // Flagged: must remain unrevealed
    expect(newBoard[0][2].isFlagged).toBe(true);
    expect(newBoard[0][3].isRevealed).toBe(false); // Beyond flag: not reached
  });
});

describe('toggleFlag & countFlags', () => {
  it('should toggle flag state on unrevealed cells', () => {
    const board = createEmptyBoard(3, 3);

    const flaggedBoard = toggleFlag(board, 1, 1);
    expect(flaggedBoard[1][1].isFlagged).toBe(true);

    const unflaggedBoard = toggleFlag(flaggedBoard, 1, 1);
    expect(unflaggedBoard[1][1].isFlagged).toBe(false);
  });

  it('should NOT toggle flag on already revealed cells', () => {
    const board = createEmptyBoard(3, 3);
    const { newBoard: revealedBoard } = revealCell(board, 0, 0);

    const attemptedFlag = toggleFlag(revealedBoard, 0, 0);
    expect(attemptedFlag[0][0].isFlagged).toBe(false);
  });

  it('should accurately count flags across the board', () => {
    let board = createEmptyBoard(5, 5);
    expect(countFlags(board)).toBe(0);

    board = toggleFlag(board, 0, 0);
    board = toggleFlag(board, 1, 2);
    board = toggleFlag(board, 3, 4);
    expect(countFlags(board)).toBe(3);

    board = toggleFlag(board, 1, 2); // remove flag
    expect(countFlags(board)).toBe(2);
  });
});

describe('chordCell', () => {
  function buildCustomBoard(layout: string[][]): Board {
    const rows = layout.length;
    const cols = layout[0].length;
    const board: Board = createEmptyBoard(rows, cols);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (layout[r][c] === 'M') {
          board[r][c].isMine = true;
        }
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!board[r][c].isMine) {
          board[r][c].adjacentMines = getNeighbors(board, r, c).filter((n) => n.isMine).length;
        }
      }
    }
    return board;
  }

  it('should do nothing if called on an unrevealed cell', () => {
    const board = createEmptyBoard(3, 3);
    const { newBoard, hitMine } = chordCell(board, 1, 1);
    expect(hitMine).toBe(false);
    expect(newBoard).toBe(board);
  });

  it('should do nothing if called on a cell with adjacentMines === 0', () => {
    const board = createEmptyBoard(3, 3);
    board[1][1].isRevealed = true;
    board[1][1].adjacentMines = 0;

    const { newBoard, hitMine } = chordCell(board, 1, 1);
    expect(hitMine).toBe(false);
    expect(newBoard).toBe(board);
  });

  it('should do nothing when flag count does not match adjacentMines (fewer flags or more flags)', () => {
    // 3x3 with 2 mines
    const layout = [
      ['M', '.', '.'],
      ['.', '.', '.'],
      ['M', '.', '.'],
    ];
    const board = buildCustomBoard(layout);
    // (1, 0) has 2 adjacent mines
    board[1][0].isRevealed = true;
    expect(board[1][0].adjacentMines).toBe(2);

    // 0 flags: does nothing
    expect(chordCell(board, 1, 0).hitMine).toBe(false);

    // 1 flag: fewer flags than adjacentMines (1 < 2)
    board[0][0].isFlagged = true;
    expect(chordCell(board, 1, 0).hitMine).toBe(false);

    // 3 flags: more flags than adjacentMines (3 > 2)
    board[2][0].isFlagged = true;
    board[1][1].isFlagged = true;
    expect(chordCell(board, 1, 0).hitMine).toBe(false);
  });

  it('should successfully chord and reveal all unflagged neighbors when flags are correct', () => {
    // Layout:
    // M . .
    // . . .
    // . . .
    // (1, 1) has 1 adjacent mine at (0, 0).
    const layout = [
      ['M', '.', '.'],
      ['.', '.', '.'],
      ['.', '.', '.'],
    ];
    const board = buildCustomBoard(layout);
    board[1][1].isRevealed = true;
    expect(board[1][1].adjacentMines).toBe(1);

    // Correctly flag (0, 0)
    board[0][0].isFlagged = true;

    const { newBoard, hitMine } = chordCell(board, 1, 1);
    expect(hitMine).toBe(false);

    // All other 7 neighbors should now be revealed
    const neighbors = getNeighbors(newBoard, 1, 1);
    for (const n of neighbors) {
      if (n.row === 0 && n.col === 0) {
        expect(n.isFlagged).toBe(true);
        expect(n.isRevealed).toBe(false);
      } else {
        expect(n.isRevealed).toBe(true);
      }
    }
  });

  it('should hit a mine and lose if chording with incorrect flags (mine unflagged, safe cell flagged)', () => {
    // Layout:
    // M .
    // . .
    // (1, 1) has 1 adjacent mine at (0, 0).
    const layout = [
      ['M', '.'],
      ['.', '.'],
    ];
    const board = buildCustomBoard(layout);
    board[1][1].isRevealed = true;
    expect(board[1][1].adjacentMines).toBe(1);

    // Incorrectly flag (0, 1) instead of (0, 0)
    board[0][1].isFlagged = true;

    // Chording (1, 1): neighbor (0, 0) is unflagged and has a mine!
    const { newBoard, hitMine } = chordCell(board, 1, 1);
    expect(hitMine).toBe(true);
    expect(newBoard[0][0].isRevealed).toBe(true);
    expect(newBoard[0][0].isExploded).toBe(true);
  });
});

describe('checkWinCondition', () => {
  it('should return false on initial unrevealed board', () => {
    const board = createEmptyBoard(3, 3);
    expect(checkWinCondition(board)).toBe(false);
  });

  it('should return true when all safe cells are revealed, even if mines are not flagged', () => {
    const board = createEmptyBoard(2, 2);
    board[0][0].isMine = true;
    // Reveal all safe cells
    board[0][1].isRevealed = true;
    board[1][0].isRevealed = true;
    board[1][1].isRevealed = true;

    expect(checkWinCondition(board)).toBe(true);
  });

  it('should return true when all safe cells are revealed and mines are flagged', () => {
    const board = createEmptyBoard(2, 2);
    board[0][0].isMine = true;
    board[0][0].isFlagged = true;
    board[0][1].isRevealed = true;
    board[1][0].isRevealed = true;
    board[1][1].isRevealed = true;

    expect(checkWinCondition(board)).toBe(true);
  });

  it('should return false if even one safe cell remains unrevealed', () => {
    const board = createEmptyBoard(2, 2);
    board[0][0].isMine = true;
    board[0][1].isRevealed = true;
    board[1][0].isRevealed = true;
    // (1, 1) is safe but NOT revealed
    board[1][1].isRevealed = false;

    expect(checkWinCondition(board)).toBe(false);
  });
});

describe('Game Over on Mine Reveal', () => {
  it('should reveal the exploded mine and all other mines when a mine is clicked', () => {
    const board = createEmptyBoard(3, 3);
    board[0][0].isMine = true;
    board[2][2].isMine = true;

    const { newBoard, hitMine } = revealCell(board, 0, 0);

    expect(hitMine).toBe(true);
    // Clicked mine exploded
    expect(newBoard[0][0].isRevealed).toBe(true);
    expect(newBoard[0][0].isExploded).toBe(true);

    // Other mine revealed
    expect(newBoard[2][2].isRevealed).toBe(true);

    // Safe unrevealed cells must remain unrevealed
    expect(newBoard[1][1].isRevealed).toBe(false);
  });

  it('BUG-06: should only reveal unflagged mines on game over, leaving flagged mines intact', () => {
    const board = createEmptyBoard(3, 3);
    board[0][0].isMine = true;
    board[1][1].isMine = true;
    board[2][2].isMine = true;

    // Player correctly flagged mine at (1, 1)
    board[1][1].isFlagged = true;

    // Player steps on mine at (0, 0)
    const { newBoard, hitMine } = revealCell(board, 0, 0);

    expect(hitMine).toBe(true);
    // Exploded mine is revealed
    expect(newBoard[0][0].isRevealed).toBe(true);
    expect(newBoard[0][0].isExploded).toBe(true);

    // Unflagged mine at (2, 2) is revealed
    expect(newBoard[2][2].isRevealed).toBe(true);

    // Flagged mine at (1, 1) MUST NOT be revealed (remains flagged)
    expect(newBoard[1][1].isRevealed).toBe(false);
    expect(newBoard[1][1].isFlagged).toBe(true);
  });
});

describe('First-Click 100% Safety Across All Difficulties (Easy, Medium, Hard)', () => {
  it('guarantees 100% safe first-click on Easy difficulty (9x9, 10 mines) across 50 trials', () => {
    const { rows, cols, mines } = DIFFICULTIES.easy;
    const board = createEmptyBoard(rows, cols);

    for (let trial = 0; trial < 50; trial++) {
      const safeR = Math.floor(Math.random() * rows);
      const safeC = Math.floor(Math.random() * cols);

      const populated = populateMines(board, rows, cols, mines, safeR, safeC);

      // 1. Clicked cell must NEVER be a mine
      expect(populated[safeR][safeC].isMine).toBe(false);

      // 2. Clicked cell must have 0 adjacent mines (safe zone guarantees cascade)
      expect(populated[safeR][safeC].adjacentMines).toBe(0);

      // 3. None of its neighbors can be mines
      const neighbors = getNeighbors(populated, safeR, safeC);
      for (const neighbor of neighbors) {
        expect(neighbor.isMine).toBe(false);
      }

      // 4. Exact mine count preserved
      const totalMines = populated.flat().filter((c) => c.isMine).length;
      expect(totalMines).toBe(mines);
    }
  });

  it('guarantees 100% safe first-click on Medium difficulty (12x12, 22 mines) across 50 trials', () => {
    const { rows, cols, mines } = DIFFICULTIES.medium;
    const board = createEmptyBoard(rows, cols);

    for (let trial = 0; trial < 50; trial++) {
      const safeR = Math.floor(Math.random() * rows);
      const safeC = Math.floor(Math.random() * cols);

      const populated = populateMines(board, rows, cols, mines, safeR, safeC);

      expect(populated[safeR][safeC].isMine).toBe(false);
      expect(populated[safeR][safeC].adjacentMines).toBe(0);

      const neighbors = getNeighbors(populated, safeR, safeC);
      for (const neighbor of neighbors) {
        expect(neighbor.isMine).toBe(false);
      }

      const totalMines = populated.flat().filter((c) => c.isMine).length;
      expect(totalMines).toBe(mines);
    }
  });

  it('guarantees 100% safe first-click on Hard difficulty (16x14, 36 mines) across 50 trials', () => {
    const { rows, cols, mines } = DIFFICULTIES.hard;
    const board = createEmptyBoard(rows, cols);

    for (let trial = 0; trial < 50; trial++) {
      const safeR = Math.floor(Math.random() * rows);
      const safeC = Math.floor(Math.random() * cols);

      const populated = populateMines(board, rows, cols, mines, safeR, safeC);

      expect(populated[safeR][safeC].isMine).toBe(false);
      expect(populated[safeR][safeC].adjacentMines).toBe(0);

      const neighbors = getNeighbors(populated, safeR, safeC);
      for (const neighbor of neighbors) {
        expect(neighbor.isMine).toBe(false);
      }

      const totalMines = populated.flat().filter((c) => c.isMine).length;
      expect(totalMines).toBe(mines);
    }
  });

  it('guarantees safe zone for all 4 corners and all 4 edges across all difficulties', () => {
    for (const diff of Object.values(DIFFICULTIES)) {
      const { rows, cols, mines } = diff;
      const board = createEmptyBoard(rows, cols);

      // Check all 4 corners
      const corners = [
        [0, 0],
        [0, cols - 1],
        [rows - 1, 0],
        [rows - 1, cols - 1],
      ];

      for (const [cr, cc] of corners) {
        const populated = populateMines(board, rows, cols, mines, cr, cc);
        expect(populated[cr][cc].isMine).toBe(false);
        expect(populated[cr][cc].adjacentMines).toBe(0);
        const neighbors = getNeighbors(populated, cr, cc);
        for (const n of neighbors) {
          expect(n.isMine).toBe(false);
        }
      }
    }
  });
});

describe('Advanced Chording & Edge Cases', () => {
  function buildCustomBoard(layout: string[][]): Board {
    const rows = layout.length;
    const cols = layout[0].length;
    const board: Board = createEmptyBoard(rows, cols);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (layout[r][c] === 'M') {
          board[r][c].isMine = true;
        }
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!board[r][c].isMine) {
          board[r][c].adjacentMines = getNeighbors(board, r, c).filter((n) => n.isMine).length;
        }
      }
    }
    return board;
  }

  it('does not chord when flags count is strictly less than adjacentMines', () => {
    // 3x3 with 3 mines surrounding (1, 1)
    const layout = [
      ['M', 'M', '.'],
      ['M', '.', '.'],
      ['.', '.', '.'],
    ];
    const board = buildCustomBoard(layout);
    board[1][1].isRevealed = true;
    expect(board[1][1].adjacentMines).toBe(3);

    // 0 flags
    expect(chordCell(board, 1, 1).hitMine).toBe(false);

    // 1 flag
    board[0][0].isFlagged = true;
    expect(chordCell(board, 1, 1).hitMine).toBe(false);

    // 2 flags (still < 3)
    board[0][1].isFlagged = true;
    expect(chordCell(board, 1, 1).hitMine).toBe(false);
  });

  it('does not chord when flags count is strictly greater than adjacentMines', () => {
    const layout = [
      ['M', '.', '.'],
      ['.', '.', '.'],
      ['.', '.', '.'],
    ];
    const board = buildCustomBoard(layout);
    board[1][1].isRevealed = true;
    expect(board[1][1].adjacentMines).toBe(1);

    // Put 2 flags (2 > 1)
    board[0][0].isFlagged = true;
    board[0][1].isFlagged = true;
    const result = chordCell(board, 1, 1);
    expect(result.hitMine).toBe(false);
    expect(result.newBoard).toBe(board);
  });

  it('chords and triggers cascade flood-fill when an opened neighbor is an empty cell (0 adjacent mines)', () => {
    // Layout 4x4:
    // M . . .
    // . . . .
    // . . . .
    // . . . .
    // Cell (0, 0) is mine. Cell (1, 1) has 1 adjacent mine.
    // Flag (0, 0).
    // Neighbor (2, 2) and (1, 2) have 0 adjacent mines!
    const layout = [
      ['M', '.', '.', '.'],
      ['.', '.', '.', '.'],
      ['.', '.', '.', '.'],
      ['.', '.', '.', '.'],
    ];
    const board = buildCustomBoard(layout);
    board[1][1].isRevealed = true;
    expect(board[1][1].adjacentMines).toBe(1);

    // Flag the mine
    board[0][0].isFlagged = true;

    const { newBoard, hitMine } = chordCell(board, 1, 1);
    expect(hitMine).toBe(false);

    // Flood fill should propagate all the way to bottom right (3, 3)
    expect(newBoard[3][3].isRevealed).toBe(true);
    expect(newBoard[2][2].isRevealed).toBe(true);
    // Mine remains flagged and unrevealed
    expect(newBoard[0][0].isRevealed).toBe(false);
    expect(newBoard[0][0].isFlagged).toBe(true);
  });

  it('chording on corner cell functions properly', () => {
    // 2x2 board:
    // . M
    // . .
    // Corner (0, 0) has 1 adjacent mine at (0, 1)
    const layout = [
      ['.', 'M'],
      ['.', '.'],
    ];
    const board = buildCustomBoard(layout);
    board[0][0].isRevealed = true;
    expect(board[0][0].adjacentMines).toBe(1);

    // Flag (0, 1)
    board[0][1].isFlagged = true;

    const { newBoard, hitMine } = chordCell(board, 0, 0);
    expect(hitMine).toBe(false);
    expect(newBoard[1][0].isRevealed).toBe(true);
    expect(newBoard[1][1].isRevealed).toBe(true);
  });

  it('chording does nothing if all unflagged neighbors are already revealed', () => {
    const layout = [
      ['M', '.'],
      ['.', '.'],
    ];
    const board = buildCustomBoard(layout);
    board[1][1].isRevealed = true;
    board[0][0].isFlagged = true;
    board[0][1].isRevealed = true;
    board[1][0].isRevealed = true;

    const { newBoard, hitMine } = chordCell(board, 1, 1);
    expect(hitMine).toBe(false);
    expect(newBoard[0][1].isRevealed).toBe(true);
    expect(newBoard[1][0].isRevealed).toBe(true);
  });
});

describe('Clamping & Safety in populateMines (BUG-05 verification)', () => {
  it('safely clamps minesCount when equal to or greater than total board cells', () => {
    // 3x3 board = 9 cells. minesCount = 9 or 15.
    // Safe zone guarantees at least 1 safe cell, so maximum mines is 8.
    const board = createEmptyBoard(3, 3);
    const populated = populateMines(board, 3, 3, 10, 1, 1);

    expect(populated[1][1].isMine).toBe(false);
    const totalMines = populated.flat().filter((c) => c.isMine).length;
    expect(totalMines).toBe(8); // Clamped to rows * cols - 1
  });

  it('safely handles minesCount = 0', () => {
    const board = createEmptyBoard(4, 4);
    const populated = populateMines(board, 4, 4, 0, 2, 2);
    const totalMines = populated.flat().filter((c) => c.isMine).length;
    expect(totalMines).toBe(0);
  });
});
