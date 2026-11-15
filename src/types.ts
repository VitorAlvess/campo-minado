export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  name: string;
  rows: number;
  cols: number;
  mines: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    name: 'Fácil',
    rows: 9,
    cols: 9,
    mines: 10,
  },
  medium: {
    name: 'Médio',
    rows: 12,
    cols: 12,
    mines: 22,
  },
  hard: {
    name: 'Difícil',
    rows: 16,
    cols: 14,
    mines: 36,
  },
};

export interface Cell {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
  isExploded?: boolean;
}

export type Board = Cell[][];

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

export type InteractionMode = 'reveal' | 'flag';

export interface SeedMatchInfo {
  code: string;
  seed: string;
  rows: number;
  cols: number;
  mines: number;
  threeBV: number;
  startCell: { row: number; col: number };
}


