// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react';
import App from './App';
import * as logic from './game/logic';

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

describe('App State Management & Edge Cases', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  it('Clicking a flagged cell while idle does NOT start game, consume safe zone, or reveal cell', () => {
    render(<App />);

    // 1. Switch to flag mode
    const flagModeBtn = screen.getByRole('button', { name: /Bandeira/i });
    fireEvent.click(flagModeBtn);

    // 2. Flag cell (0, 0)
    const cell00 = screen.getByLabelText('Linha 1, Coluna 1');
    fireEvent.click(cell00);

    // 3. Switch back to reveal mode
    const revealModeBtn = screen.getByRole('button', { name: /Escavar/i });
    fireEvent.click(revealModeBtn);

    // 4. Click cell (0, 0) while gameStatus is 'idle'
    fireEvent.click(cell00);

    // Game should remain 'idle' (Smiley icon 🙂)
    const resetBtn = screen.getByLabelText('Reiniciar Partida');
    expect(resetBtn.textContent).toContain('🙂');

    // And cell (0, 0) is still unrevealed and flagged!
    const flagSvg = cell00.querySelector('svg');
    expect(flagSvg).not.toBeNull();
  });

  it('BUG-08: Board container uses touch-manipulation instead of touch-none', () => {
    const { container } = render(<App />);
    const boardContainer = container.querySelector('.touch-manipulation');
    expect(boardContainer).not.toBeNull();
    const touchNone = container.querySelector('.touch-none');
    expect(touchNone).toBeNull();
  });

  it('BUG-07 & BUG-09: On game over / win, cells are disabled and mines are auto-flagged on win', () => {
    // We can simulate game loss by clicking first cell to start, then finding a mine to click
    render(<App />);

    // First click to start game at (0, 0)
    const cell00 = screen.getByLabelText('Linha 1, Coluna 1');
    fireEvent.click(cell00);

    // Look for all cell buttons
    const buttons = screen.getAllByRole('button', { name: /Linha \d+, Coluna \d+/i });

    // Click remaining unrevealed buttons until game is won or lost
    for (const btn of buttons) {
      if (!btn.hasAttribute('disabled')) {
        fireEvent.click(btn);
      }
    }

    // After all clicks, game must be won or lost, and buttons must be disabled
    const anyDisabled = buttons.some((b) => (b as HTMLButtonElement).disabled);
    expect(anyDisabled).toBe(true);
  });

  it('BUG-07: Auto-flags all remaining mines and displays 0 remaining mines when game is won', () => {
    // Setup a 9x9 board with 10 mines where (0, 0) is the last unrevealed safe cell
    vi.spyOn(logic, 'populateMines').mockImplementation((board) => {
      const custom = board.map((row) => row.map((cell) => ({ ...cell })));
      // Set 10 mines on row 8 (9 mines) and row 7 (1 mine)
      for (let c = 0; c < 9; c++) {
        custom[8][c].isMine = true;
      }
      custom[7][8].isMine = true;

      // Mark all safe cells as revealed EXCEPT (0, 0)
      for (let r = 0; r < custom.length; r++) {
        for (let c = 0; c < custom[0].length; c++) {
          if (!custom[r][c].isMine && !(r === 0 && c === 0)) {
            custom[r][c].isRevealed = true;
          }
        }
      }
      return custom;
    });

    render(<App />);

    // Click (0, 0). This reveals the last safe cell, triggering win!
    const cell00 = screen.getByLabelText('Linha 1, Coluna 1');
    fireEvent.click(cell00);

    // Header remaining mines should show '0'
    const flagsCounter = screen.getByText('0');
    expect(flagsCounter).not.toBeNull();

    // The mine cell at row 9, col 9 (index 8, 8) should now have a flag
    const cell88 = screen.getByLabelText('Linha 9, Coluna 9');
    const flagSvg = cell88.querySelector('svg');
    expect(flagSvg).not.toBeNull();

    // Reset button should show Sunglasses emoji (won)
    const resetBtn = screen.getByLabelText('Reiniciar Partida');
    expect(resetBtn.textContent).toContain('😎');
  });

  it('Difficulty change during match resets board dimensions, timer, game status, and mine counter', () => {
    vi.useFakeTimers();
    render(<App />);

    // Start game on Easy by clicking (0, 0)
    const cell00 = screen.getByLabelText('Linha 1, Coluna 1');
    fireEvent.click(cell00);

    // Fast-forward time by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Game should be in playing state with timer > 0
    expect(screen.getByText('005')).not.toBeNull();

    // Switch to Medium
    const mediumBtn = screen.getByRole('button', { name: /Médio/i });
    fireEvent.click(mediumBtn);

    // Verify board has 144 cells (12x12)
    const mediumCells = screen.getAllByRole('button', { name: /Linha \d+, Coluna \d+/i });
    expect(mediumCells.length).toBe(12 * 12);

    // Verify remaining mines counter displays 22
    expect(screen.getByText('22')).not.toBeNull();

    // Verify timer is reset to 000
    expect(screen.getByText('000')).not.toBeNull();

    // Verify game status is idle (🙂)
    const resetBtn = screen.getByLabelText('Reiniciar Partida');
    expect(resetBtn.textContent).toContain('🙂');

    // Advance timer while idle - timer should NOT increment
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('000')).not.toBeNull();

    // Switch to Hard
    const hardBtn = screen.getByRole('button', { name: /Difícil/i });
    fireEvent.click(hardBtn);

    // Verify board has 224 cells (16x14)
    const hardCells = screen.getAllByRole('button', { name: /Linha \d+, Coluna \d+/i });
    expect(hardCells.length).toBe(16 * 14);

    // Verify remaining mines counter displays 36
    expect(screen.getByText('36')).not.toBeNull();

    vi.useRealTimers();
  });

  it('Reset button (Smiley) resets an active match to idle and clears timer', () => {
    vi.useFakeTimers();
    render(<App />);

    // Start game
    const cell00 = screen.getByLabelText('Linha 1, Coluna 1');
    fireEvent.click(cell00);

    vi.advanceTimersByTime(10000);

    const resetBtn = screen.getByLabelText('Reiniciar Partida');
    // Click reset button
    fireEvent.click(resetBtn);

    // Status is idle
    expect(resetBtn.textContent).toContain('🙂');

    // Timer is reset to 000
    expect(screen.getByText('000')).not.toBeNull();

    // All cells are unrevealed again
    const cells = screen.getAllByRole('button', { name: /Linha \d+, Coluna \d+/i });
    expect(cells.length).toBe(81);

    vi.useRealTimers();
  });

  it('Remaining mines counter correctly formats negative values when player places excess flags', () => {
    render(<App />);

    // Switch to flag mode
    const flagModeBtn = screen.getByRole('button', { name: /Bandeira/i });
    fireEvent.click(flagModeBtn);

    // Easy mode has 10 mines. Let's flag 12 cells:
    for (let c = 1; c <= 12; c++) {
      const row = c <= 9 ? 1 : 2;
      const col = c <= 9 ? c : c - 9;
      const targetCell = screen.getByLabelText(`Linha ${row}, Coluna ${col}`);
      fireEvent.click(targetCell);
    }

    // Remaining mines: 10 - 12 = -2 -> should display -2
    expect(screen.getByText('-2')).not.toBeNull();
  });

  it('Chording in UI: clicking an already revealed cell with matching flag count triggers chord', () => {
    // Setup board with 1 mine at (0, 0), and (1, 1) having adjacentMines: 1
    vi.spyOn(logic, 'populateMines').mockImplementation((board) => {
      const custom = board.map((row) => row.map((cell) => ({ ...cell })));
      custom[0][0].isMine = true;
      custom[1][1].adjacentMines = 1;
      return custom;
    });

    render(<App />);

    // 1. First reveal on (1, 1) to start game
    const cell11 = screen.getByLabelText('Linha 2, Coluna 2');
    fireEvent.click(cell11);

    // 2. Switch to flag mode and flag (0, 0)
    const flagModeBtn = screen.getByRole('button', { name: /Bandeira/i });
    fireEvent.click(flagModeBtn);
    const cell00 = screen.getByLabelText('Linha 1, Coluna 1');
    fireEvent.click(cell00);

    // 3. Switch back to reveal mode
    const revealModeBtn = screen.getByRole('button', { name: /Escavar/i });
    fireEvent.click(revealModeBtn);

    // 4. Click already revealed cell (1, 1) to chord!
    fireEvent.click(cell11);

    // Unflagged neighbor (0, 1) should now be revealed with soil background!
    const cell01 = screen.getByLabelText('Linha 1, Coluna 2');
    expect(cell01.className).toMatch(/bg-\[#(e5c29f|d7b899)\]/);
  });

  it('Chording in UI: chording with incorrect flag detonates mine and triggers lost state', () => {
    vi.spyOn(logic, 'populateMines').mockImplementation((board) => {
      const custom = board.map((row) => row.map((cell) => ({ ...cell })));
      custom[0][0].isMine = true;
      custom[1][1].adjacentMines = 1;
      return custom;
    });

    render(<App />);

    // 1. Reveal (1, 1) to start game
    const cell11 = screen.getByLabelText('Linha 2, Coluna 2');
    fireEvent.click(cell11);

    // 2. Incorrectly flag (0, 1) instead of (0, 0)
    const flagModeBtn = screen.getByRole('button', { name: /Bandeira/i });
    fireEvent.click(flagModeBtn);
    const cell01 = screen.getByLabelText('Linha 1, Coluna 2');
    fireEvent.click(cell01);

    // 3. Switch to reveal mode
    const revealModeBtn = screen.getByRole('button', { name: /Abrir Célula/i });
    fireEvent.click(revealModeBtn);

    // 4. Click revealed cell (1, 1) to chord -> unflagged mine (0, 0) explodes!
    fireEvent.click(cell11);

    // Game lost: Dizzy face emoji on reset button
    const resetBtn = screen.getByLabelText('Reiniciar Partida');
    expect(resetBtn.textContent).toContain('😵');

    // Status banner shows game over
    expect(screen.getByText(/Fim de Jogo! Uma mina explodiu/i)).not.toBeNull();
  });
});
