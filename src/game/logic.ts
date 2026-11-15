import { Board, Cell } from '../types';

/** Cria um tabuleiro vazio preenchido com células zeradas */
export function createEmptyBoard(rows: number, cols: number): Board {
  const board: Board = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        row: r,
        col: c,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        adjacentMines: 0,
      });
    }
    board.push(row);
  }
  return board;
}

/** Retorna as coordenadas vizinhas válidas */
export function getNeighbors(board: Board, row: number, col: number): Cell[] {
  const neighbors: Cell[] = [];
  const rows = board.length;
  const cols = board[0].length;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        neighbors.push(board[nr][nc]);
      }
    }
  }
  return neighbors;
}

/**
 * Popula as minas no tabuleiro de forma 100% aleatória,
 * garantindo que o primeiro clique (safeRow, safeCol) e seus vizinhos estejam livres de minas.
 */
export function populateMines(
  board: Board,
  rows: number,
  cols: number,
  minesCount: number,
  safeRow: number,
  safeCol: number,
): Board {
  const newBoard: Board = board.map((r) => r.map((c) => ({ ...c })));
  const clampedMinesCount = Math.max(0, Math.min(minesCount, rows * cols - 1));
  let placedMines = 0;

  // Zona segura: a célula clicada e seus vizinhos imediatos
  const safeZone = new Set<string>();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = safeRow + dr;
      const nc = safeCol + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        safeZone.add(`${nr},${nc}`);
      }
    }
  }

  // Se o número de minas for muito alto para respeitar a zona segura de 9 células,
  // reduzimos a zona segura para apenas a própria célula clicada
  const availableCells = rows * cols - safeZone.size;
  const actualSafeZone = availableCells >= clampedMinesCount ? safeZone : new Set([`${safeRow},${safeCol}`]);

  while (placedMines < clampedMinesCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    const key = `${r},${c}`;

    if (!newBoard[r][c].isMine && !actualSafeZone.has(key)) {
      newBoard[r][c].isMine = true;
      placedMines++;
    }
  }

  // Calcula minas adjacentes para cada célula
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!newBoard[r][c].isMine) {
        const neighbors = getNeighbors(newBoard, r, c);
        newBoard[r][c].adjacentMines = neighbors.filter((n) => n.isMine).length;
      }
    }
  }

  return newBoard;
}

/**
 * Revela uma célula e propaga abertura em cascata para células vazias (adjacentMines === 0)
 */
export function revealCell(
  board: Board,
  row: number,
  col: number,
): { newBoard: Board; hitMine: boolean } {
  const cell = board[row][col];
  if (cell.isRevealed || cell.isFlagged) {
    return { newBoard: board, hitMine: false };
  }

  const newBoard: Board = board.map((r) => r.map((c) => ({ ...c })));
  const target = newBoard[row][col];

  if (target.isMine) {
    target.isRevealed = true;
    target.isExploded = true;
    // Revela todas as outras minas não marcadas com bandeira
    for (const r of newBoard) {
      for (const c of r) {
        if (c.isMine && !c.isFlagged) {
          c.isRevealed = true;
        }
      }
    }
    return { newBoard, hitMine: true };
  }

  // Fila para abertura em cascata (Flood Fill)
  const queue: [number, number][] = [[row, col]];
  target.isRevealed = true;

  while (queue.length > 0) {
    const [currR, currC] = queue.shift()!;
    const currCell = newBoard[currR][currC];

    if (currCell.adjacentMines === 0) {
      const neighbors = getNeighbors(newBoard, currR, currC);
      for (const neighbor of neighbors) {
        if (!neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
          neighbor.isRevealed = true;
          if (neighbor.adjacentMines === 0) {
            queue.push([neighbor.row, neighbor.col]);
          }
        }
      }
    }
  }

  return { newBoard, hitMine: false };
}

/** Alterna a bandeira de uma célula não revelada */
export function toggleFlag(board: Board, row: number, col: number): Board {
  const newBoard: Board = board.map((r) => r.map((c) => ({ ...c })));
  const cell = newBoard[row][col];
  if (!cell.isRevealed) {
    cell.isFlagged = !cell.isFlagged;
  }
  return newBoard;
}

/** Abertura rápida (chording): clica em célula já aberta com todas as bandeiras marcadas */
export function chordCell(
  board: Board,
  row: number,
  col: number,
): { newBoard: Board; hitMine: boolean } {
  const cell = board[row][col];
  if (!cell.isRevealed || cell.adjacentMines === 0) {
    return { newBoard: board, hitMine: false };
  }

  const neighbors = getNeighbors(board, row, col);
  const flaggedCount = neighbors.filter((n) => n.isFlagged).length;

  if (flaggedCount !== cell.adjacentMines) {
    return { newBoard: board, hitMine: false };
  }

  let currentBoard = board;
  let hitMine = false;

  for (const n of neighbors) {
    if (!n.isRevealed && !n.isFlagged) {
      const res = revealCell(currentBoard, n.row, n.col);
      currentBoard = res.newBoard;
      if (res.hitMine) {
        hitMine = true;
        break;
      }
    }
  }

  return { newBoard: currentBoard, hitMine };
}

/** Verifica se todas as células seguras (não minas) foram reveladas */
export function checkWinCondition(board: Board): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (!cell.isMine && !cell.isRevealed) {
        return false;
      }
    }
  }
  return true;
}

/** Conta quantas bandeiras foram colocadas */
export function countFlags(board: Board): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.isFlagged) count++;
    }
  }
  return count;
}

