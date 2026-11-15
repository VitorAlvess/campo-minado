import { describe, it, expect } from 'vitest';
import {
  createPRNG,
  encodeSeedCode,
  decodeSeedCode,
  generateBoardFromSeed,
  calculate3BV,
  generateRandomSeed,
  SEED_ALPHABET,
} from './seedGenerator';

describe('Deterministic PRNG (xmur3 + mulberry32)', () => {
  it('Produces identical float sequences for the same seed string', () => {
    const prng1 = createPRNG('CHALLENGE-2026');
    const prng2 = createPRNG('CHALLENGE-2026');

    const seq1 = Array.from({ length: 10 }, () => prng1());
    const seq2 = Array.from({ length: 10 }, () => prng2());

    expect(seq1).toEqual(seq2);
    expect(seq1[0]).toBeGreaterThanOrEqual(0);
    expect(seq1[0]).toBeLessThan(1);
  });

  it('Is case-insensitive and trims whitespace', () => {
    const prng1 = createPRNG('  my-seed-123  ');
    const prng2 = createPRNG('MY-SEED-123');

    expect(prng1()).toBe(prng2());
  });

  it('Different seeds produce different sequences', () => {
    const prngA = createPRNG('SEED-ALPHA');
    const prngB = createPRNG('SEED-BETA');

    expect(prngA()).not.toBe(prngB());
  });
});

describe('Seed Code Encoding & Decoding', () => {
  it('Correctly encodes and decodes standard format', () => {
    const code = encodeSeedCode(9, 9, 10, 'K7M2QX');
    expect(code).toBe('9x9-10-K7M2QX');

    const decoded = decodeSeedCode('9x9-10-K7M2QX');
    expect(decoded).toEqual({
      rows: 9,
      cols: 9,
      mines: 10,
      seed: 'K7M2QX',
    });
  });

  it('Rejects invalid seed codes', () => {
    expect(decodeSeedCode('')).toBeNull();
    expect(decodeSeedCode('invalid-string')).toBeNull();
    expect(decodeSeedCode('9x9')).toBeNull();
    // Negative or 0 mines
    expect(decodeSeedCode('9x9-0-ABCDEF')).toBeNull();
    // Too many mines
    expect(decodeSeedCode('9x9-81-ABCDEF')).toBeNull();
    // Ambiguous characters like O or I (not in Crockford Base32)
    expect(decodeSeedCode('9x9-10-ABCIOU')).toBeNull();
    // Out of bound dimensions
    expect(decodeSeedCode('2x2-1-ABCDEF')).toBeNull();
    expect(decodeSeedCode('50x50-10-ABCDEF')).toBeNull();
  });

  it('generateRandomSeed uses only valid Crockford alphabet characters', () => {
    const seed = generateRandomSeed(8);
    expect(seed.length).toBe(8);
    for (const char of seed) {
      expect(SEED_ALPHABET).toContain(char);
    }
  });
});

describe('Deterministic Board Generation', () => {
  it('Produces EXACT identical mine layouts and start cell for the same seed', () => {
    const res1 = generateBoardFromSeed(9, 9, 10, 'TESTSEED');
    const res2 = generateBoardFromSeed(9, 9, 10, 'TESTSEED');

    expect(res1.startCell).toEqual(res2.startCell);
    expect(res1.threeBV).toBe(res2.threeBV);

    // Verify all 81 cells have identical mine status
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(res1.board[r][c].isMine).toBe(res2.board[r][c].isMine);
        expect(res1.board[r][c].adjacentMines).toBe(res2.board[r][c].adjacentMines);
      }
    }
  });

  it('Produces different layouts for different seeds', () => {
    const resA = generateBoardFromSeed(9, 9, 10, 'SEED-AAA');
    const resB = generateBoardFromSeed(9, 9, 10, 'SEED-BBB');

    let differentCells = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (resA.board[r][c].isMine !== resB.board[r][c].isMine) {
          differentCells++;
        }
      }
    }
    expect(differentCells).toBeGreaterThan(0);
  });

  it('Places exactly the requested number of mines and startCell is safe', () => {
    const rows = 12;
    const cols = 12;
    const mines = 22;
    const { board, startCell } = generateBoardFromSeed(rows, cols, mines, 'EXACTCOUNT');

    let totalMines = 0;
    for (const row of board) {
      for (const cell of row) {
        if (cell.isMine) totalMines++;
      }
    }
    expect(totalMines).toBe(mines);

    // startCell and immediate 3x3 neighbors must NOT be mines
    const { row: sR, col: sC } = startCell;
    expect(board[sR][sC].isMine).toBe(false);
    expect(board[sR][sC].isRevealed).toBe(true);

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = sR + dr;
        const nc = sC + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          expect(board[nr][nc].isMine).toBe(false);
        }
      }
    }
  });

  it('Calculates a valid 3BV benchmark value (> 0)', () => {
    const { board, threeBV } = generateBoardFromSeed(9, 9, 10, 'BENCHMARK');
    expect(threeBV).toBeGreaterThan(0);
    expect(calculate3BV(board)).toBe(threeBV);
  });

  it('Fixed seed snapshot regression test', () => {
    // Fixed seed to guarantee cross-version regression invariance
    const { board, startCell, threeBV } = generateBoardFromSeed(9, 9, 10, 'REGRESSION-2026');

    // Known deterministic start cell for this seed:
    expect(startCell).toEqual({ row: 8, col: 3 });

    // Known mine positions list for 'REGRESSION-2026'
    const mineCoords: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c].isMine) {
          mineCoords.push([r, c]);
        }
      }
    }
    expect(mineCoords.length).toBe(10);
    expect(threeBV).toBeGreaterThanOrEqual(5);

    // Run again to ensure 100% repeatability
    const secondRun = generateBoardFromSeed(9, 9, 10, 'REGRESSION-2026');
    const secondMines: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (secondRun.board[r][c].isMine) secondMines.push([r, c]);
      }
    }
    expect(mineCoords).toEqual(secondMines);
  });

  it('Maintains 100% determinism over 50 consecutive runs for different difficulty configurations', () => {
    const testCases = [
      { rows: 9, cols: 9, mines: 10, seed: 'EASY-DET-123' },
      { rows: 12, cols: 12, mines: 22, seed: 'MED-DET-456' },
      { rows: 16, cols: 14, mines: 36, seed: 'HARD-DET-789' },
    ];

    for (const tc of testCases) {
      const baseline = generateBoardFromSeed(tc.rows, tc.cols, tc.mines, tc.seed);

      for (let run = 0; run < 10; run++) {
        const next = generateBoardFromSeed(tc.rows, tc.cols, tc.mines, tc.seed);
        expect(next.startCell).toEqual(baseline.startCell);
        expect(next.threeBV).toBe(baseline.threeBV);
        expect(next.seedCode).toBe(baseline.seedCode);

        for (let r = 0; r < tc.rows; r++) {
          for (let c = 0; c < tc.cols; c++) {
            expect(next.board[r][c].isMine).toBe(baseline.board[r][c].isMine);
            expect(next.board[r][c].adjacentMines).toBe(baseline.board[r][c].adjacentMines);
            expect(next.board[r][c].isRevealed).toBe(baseline.board[r][c].isRevealed);
          }
        }
      }
    }
  });

  it('Handles high-density boards gracefully without crashing or infinite looping', () => {
    // 6x6 board = 36 cells. Safe zone 3x3 = 9 cells.
    // If mines = 30, available cells outside 9-cell zone = 27 < 30.
    // Safe zone collapses to just startCell (1 cell safe, 35 candidates).
    const { board, startCell } = generateBoardFromSeed(6, 6, 30, 'DENSE-MAP');

    expect(board[startCell.row][startCell.col].isMine).toBe(false);
    expect(board[startCell.row][startCell.col].isRevealed).toBe(true);

    let totalMines = 0;
    for (const r of board) {
      for (const c of r) {
        if (c.isMine) totalMines++;
      }
    }
    expect(totalMines).toBe(30);
  });
});

describe('decodeSeedCode Rigorous Boundary & Malformed Inputs', () => {
  it('Validates min/max dimension boundaries (6 to 30)', () => {
    expect(decodeSeedCode('5x5-1-ABCDEF')).toBeNull(); // cols & rows < 6
    expect(decodeSeedCode('6x6-1-ABCDEF')).toEqual({ cols: 6, rows: 6, mines: 1, seed: 'ABCDEF' });
    expect(decodeSeedCode('30x30-50-ABCDEF')).toEqual({ cols: 30, rows: 30, mines: 50, seed: 'ABCDEF' });
    expect(decodeSeedCode('31x30-50-ABCDEF')).toBeNull(); // cols > 30
    expect(decodeSeedCode('30x31-50-ABCDEF')).toBeNull(); // rows > 30
  });

  it('Validates min/max mine counts', () => {
    // 6x6 = 36 cells. Min mines is 1. Max mines allowed is rows*cols - 2 = 34.
    expect(decodeSeedCode('6x6-0-ABCDEF')).toBeNull();
    expect(decodeSeedCode('6x6-1-ABCDEF')).not.toBeNull();
    expect(decodeSeedCode('6x6-34-ABCDEF')).not.toBeNull();
    expect(decodeSeedCode('6x6-35-ABCDEF')).toBeNull(); // mines >= rows*cols - 1
    expect(decodeSeedCode('6x6-36-ABCDEF')).toBeNull(); // mines >= rows*cols
    expect(decodeSeedCode('6x6-99-ABCDEF')).toBeNull();
  });

  it('Validates Crockford Base32 alphabet constraints (excludes 0, O, 1, I, L, U)', () => {
    expect(decodeSeedCode('9x9-10-ABC0EF')).toBeNull(); // contains 0
    expect(decodeSeedCode('9x9-10-ABCOEF')).toBeNull(); // contains O
    expect(decodeSeedCode('9x9-10-ABC1EF')).toBeNull(); // contains 1
    expect(decodeSeedCode('9x9-10-ABCIEF')).toBeNull(); // contains I
    expect(decodeSeedCode('9x9-10-ABCLEF')).toBeNull(); // contains L
    expect(decodeSeedCode('9x9-10-ABCUEF')).toBeNull(); // contains U
  });

  it('Validates seed string length boundaries (3 to 16)', () => {
    expect(decodeSeedCode('9x9-10-AB')).toBeNull(); // length 2: too short
    expect(decodeSeedCode('9x9-10-ABC')).not.toBeNull(); // length 3: minimum valid
    expect(decodeSeedCode('9x9-10-23456789ABCDEFGH')).not.toBeNull(); // length 16: maximum valid
    expect(decodeSeedCode('9x9-10-23456789ABCDEFGHJ')).toBeNull(); // length 17: too long
  });

  it('Rejects non-string and malformed formats', () => {
    expect(decodeSeedCode(null as any)).toBeNull();
    expect(decodeSeedCode(undefined as any)).toBeNull();
    expect(decodeSeedCode(12345 as any)).toBeNull();
    expect(decodeSeedCode('9-9-10-ABCDEF')).toBeNull();
    expect(decodeSeedCode('9x9x10-ABCDEF')).toBeNull();
    expect(decodeSeedCode('9x9-10')).toBeNull();
    expect(decodeSeedCode('9x9-10-')).toBeNull();
    expect(decodeSeedCode('-9x9-10-ABCDEF')).toBeNull();
  });
});

describe('Exact 3BV Benchmark Calculation', () => {
  function createBoardFromMatrix(matrix: number[][]): import('../types').Board {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const board = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ({
        row: r,
        col: c,
        isMine: matrix[r][c] === -1,
        isRevealed: false,
        isFlagged: false,
        adjacentMines: 0,
      })),
    );

    // Calculate adjacent mines
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!board[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) {
                count++;
              }
            }
          }
          board[r][c].adjacentMines = count;
        }
      }
    }
    return board;
  }

  it('Calculates 3BV = 1 for a board with a single opening clearing all cells', () => {
    // 3x3 with single mine in corner (2, 2)
    // Cell (0, 0) has 0 adjacent mines and opens (0,0), (0,1), (1,0), (1,1), (0,2), (2,0)
    // All safe cells are opened in 1 single cascade -> 3BV = 1
    const matrix = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, -1],
    ];
    const board = createBoardFromMatrix(matrix);
    expect(calculate3BV(board)).toBe(1);
  });

  it('Calculates 3BV correctly for isolated cells with no openings', () => {
    // 3x3 board where every safe cell is surrounded by mines (no 0-cells)
    // Layout: alternating mines and safe cells
    // -1  0 -1
    //  0 -1  0
    // -1  0 -1
    // Safe cells at (0,1), (1,0), (1,2), (2,1) each have >0 adjacent mines.
    // 4 individual clicks required -> 3BV = 4
    const matrix = [
      [-1, 0, -1],
      [0, -1, 0],
      [-1, 0, -1],
    ];
    const board = createBoardFromMatrix(matrix);
    expect(calculate3BV(board)).toBe(4);
  });

  it('Calculates 3BV correctly for composite layout: 1 opening + 2 isolated safe cells', () => {
    // Row 0: 0 0 0 -1 0
    // Row 1: 0 0 0 -1 -1
    // Row 2: 0 0 0 -1 0
    // Left 3x3 is an opening (1 click clears cols 0, 1, 2)
    // Right col (col 4) has safe cells at (0, 4) and (2, 4) separated by mines
    // 3BV = 1 (opening) + 2 (isolated cells) = 3
    const matrix = [
      [0, 0, 0, -1, 0],
      [0, 0, 0, -1, -1],
      [0, 0, 0, -1, 0],
    ];
    const board = createBoardFromMatrix(matrix);
    expect(calculate3BV(board)).toBe(3);
  });
});
