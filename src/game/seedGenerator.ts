import { Board } from '../types';
import { createEmptyBoard, getNeighbors, revealCell } from './logic';

/** Alfabeto Crockford Base32 (sem caracteres ambíguos como 0/O, 1/I, L, U) */
export const SEED_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Hash xmur3: Converte uma string de seed em uma função que produz inteiros de 32 bits determinísticos.
 */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/**
 * Mulberry32: Gerador de números pseudo-aleatórios (PRNG) determinístico de 32 bits.
 * Retorna floats no intervalo [0, 1).
 */
export function mulberry32(seedNum: number): () => number {
  let a = seedNum >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cria um PRNG a partir de qualquer string de seed */
export function createPRNG(seedStr: string): () => number {
  const seedHash = xmur3(seedStr.toUpperCase().trim())();
  return mulberry32(seedHash);
}

/** Gera uma seed aleatória curta e legível (ex: K7M2QX) */
export function generateRandomSeed(length = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * SEED_ALPHABET.length);
    result += SEED_ALPHABET[idx];
  }
  return result;
}

/** Formata o código compartilhável da partida (ex: 9x9-10-K7M2QX) */
export function encodeSeedCode(
  rows: number,
  cols: number,
  mines: number,
  seed: string,
): string {
  const cleanSeed = seed.toUpperCase().trim().replace(/[^2-9A-HJ-NP-Z]/g, '');
  return `${cols}x${rows}-${mines}-${cleanSeed}`;
}

export interface ParsedSeedCode {
  rows: number;
  cols: number;
  mines: number;
  seed: string;
}

/**
 * Valida e decodifica o código de partida recebido.
 * Aceita formatos como: "9x9-10-K7M2QX" ou "16x16-40-ABCDEF"
 */
export function decodeSeedCode(code: string): ParsedSeedCode | null {
  if (!code || typeof code !== 'string') return null;
  const trimmed = code.trim().toUpperCase();

  // Regex para formato: {cols}x{rows}-{mines}-{seed}
  const match = /^(\d{1,2})X(\d{1,2})-(\d{1,3})-([2-9A-HJ-NP-Z]{3,16})$/i.exec(
    trimmed,
  );
  if (!match) return null;

  const cols = parseInt(match[1], 10);
  const rows = parseInt(match[2], 10);
  const mines = parseInt(match[3], 10);
  const seed = match[4].toUpperCase();

  // Validação de limites razoáveis
  if (rows < 6 || rows > 30) return null;
  if (cols < 6 || cols > 30) return null;
  if (mines < 1 || mines >= rows * cols - 1) return null;

  return { rows, cols, mines, seed };
}

/**
 * Calcula o valor 3BV (Bechtel's Board Benchmark Value) do tabuleiro.
 * Representa o número mínimo de cliques necessários para resolver o tabuleiro.
 */
export function calculate3BV(board: Board): number {
  const rows = board.length;
  const cols = board[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  let threeBV = 0;

  // 1. Identifica e conta todas as áreas vazias de abertura (adjacentMines === 0)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c].isMine && board[r][c].adjacentMines === 0 && !visited[r][c]) {
        threeBV++;
        // Flood fill da abertura
        const queue: [number, number][] = [[r, c]];
        visited[r][c] = true;

        while (queue.length > 0) {
          const [currR, currC] = queue.shift()!;
          const neighbors = getNeighbors(board, currR, currC);

          for (const n of neighbors) {
            if (!n.isMine && !visited[n.row][n.col]) {
              visited[n.row][n.col] = true;
              if (n.adjacentMines === 0) {
                queue.push([n.row, n.col]);
              }
            }
          }
        }
      }
    }
  }

  // 2. Conta todas as células seguras restantes que não foram abertas por nenhuma área vazia
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c].isMine && !visited[r][c]) {
        threeBV++;
      }
    }
  }

  return threeBV;
}

export interface GeneratedSeedBoard {
  board: Board;
  startCell: { row: number; col: number };
  threeBV: number;
  seedCode: string;
}

/**
 * Gera o tabuleiro de forma 100% DETERMINÍSTICA baseada na seed.
 * 1. PRNG determinístico gerado a partir do hash da seed.
 * 2. Célula inicial segura (startCell) sorteada pela seed.
 * 3. Fisher-Yates shuffle determinístico para posicionar as minas fora da safeZone.
 * 4. Pré-revelação da startCell para que ambos comecem com o mapa idêntico aberto.
 */
export function generateBoardFromSeed(
  rows: number,
  cols: number,
  minesCount: number,
  seed: string,
): GeneratedSeedBoard {
  const prng = createPRNG(seed);
  const cleanSeed = seed.toUpperCase().trim().replace(/[^2-9A-HJ-NP-Z]/g, '');
  const seedCode = encodeSeedCode(rows, cols, minesCount, cleanSeed);

  // Cria tabuleiro vazio
  const board: Board = createEmptyBoard(rows, cols);

  // Sorteia a célula inicial segura determinística com o PRNG
  const startRow = Math.floor(prng() * rows);
  const startCol = Math.floor(prng() * cols);
  const startCell = { row: startRow, col: startCol };

  // Define a zona segura 3x3 em torno da startCell
  const safeZone = new Set<string>();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = startRow + dr;
      const nc = startCol + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        safeZone.add(`${nr},${nc}`);
      }
    }
  }

  // Se o tabuleiro for muito denso, reduz para a própria célula
  const available = rows * cols - safeZone.size;
  const actualSafeZone = available >= minesCount ? safeZone : new Set([`${startRow},${startCol}`]);

  // Lista de todas as células elegíveis em ordem fixa (row-major)
  const candidateCoords: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!actualSafeZone.has(`${r},${c}`)) {
        candidateCoords.push([r, c]);
      }
    }
  }

  // Embaralhamento determinístico de Fisher-Yates
  for (let i = candidateCoords.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    const temp = candidateCoords[i];
    candidateCoords[i] = candidateCoords[j];
    candidateCoords[j] = temp;
  }

  // Posiciona as minas nas primeiras minesCount células embaralhadas
  const clampedMines = Math.min(minesCount, candidateCoords.length);
  for (let i = 0; i < clampedMines; i++) {
    const [r, c] = candidateCoords[i];
    board[r][c].isMine = true;
  }

  // Calcula minas adjacentes para cada célula
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c].isMine) {
        const neighbors = getNeighbors(board, r, c);
        board[r][c].adjacentMines = neighbors.filter((n) => n.isMine).length;
      }
    }
  }

  // Calcula a métrica 3BV do tabuleiro gerado
  const threeBV = calculate3BV(board);

  // Executa a revelação automática inicial da startCell (abre cascata inicial)
  const { newBoard } = revealCell(board, startRow, startCol);

  return {
    board: newBoard,
    startCell,
    threeBV,
    seedCode,
  };
}
