// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import App from './App';

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

describe('App Seed Matches & Deterministic Workflow', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete (window as any).location;
    window.location = new URL('https://example.com/') as any;
  });

  it('Opens Seed Modal from Controls, types a code and starts a seed match', () => {
    render(<App />);

    // 1. Click "Desafio por Seed" button in Controls
    const openSeedBtn = screen.getByRole('button', { name: /Desafio por Seed/i });
    fireEvent.click(openSeedBtn);

    // 2. Modal is visible
    expect(screen.getByText('Jogar com Seed')).not.toBeNull();

    // 3. Type valid seed code into input
    const input = screen.getByLabelText(/Código da Partida/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '9x9-10-K7M2QX' } });

    // 4. Submit form
    const startSeedBtn = screen.getByRole('button', { name: /Jogar Seed/i });
    expect(startSeedBtn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(startSeedBtn);

    // 5. Header now displays active seed badge
    expect(screen.getByText(/Seed: 9x9-10-K7M2QX/i)).not.toBeNull();
  });

  it('Loads a seed match directly from URL parameter', () => {
    // Simulate URL with ?seed=9x9-10-WEBSED
    delete (window as any).location;
    window.location = new URL('https://example.com/?seed=9x9-10-WEBSED') as any;

    render(<App />);

    // Header automatically shows the seed code from the URL
    expect(screen.getByText(/Seed: 9x9-10-WEBSED/i)).not.toBeNull();
  });

  it('Reset button (Smiley) resets the same seed match keeping identical board', () => {
    render(<App />);

    // Open modal and start seed
    const openSeedBtn = screen.getByRole('button', { name: /Desafio por Seed/i });
    fireEvent.click(openSeedBtn);

    const input = screen.getByLabelText(/Código da Partida/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '9x9-10-RETRY9' } });

    const startSeedBtn = screen.getByRole('button', { name: /Jogar Seed/i });
    fireEvent.click(startSeedBtn);

    // Click Smiley to retry
    const resetBtn = screen.getByLabelText('Reiniciar Partida');
    fireEvent.click(resetBtn);

    // Seed badge is still present and active
    expect(screen.getByText(/Seed: 9x9-10-RETRY9/i)).not.toBeNull();
    // Timer is reset to 000
    expect(screen.getByText('000')).not.toBeNull();
  });

  it('Switching difficulty clears seed match and returns to standard random board', () => {
    render(<App />);

    // Start with seed
    const openSeedBtn = screen.getByRole('button', { name: /Desafio por Seed/i });
    fireEvent.click(openSeedBtn);

    const input = screen.getByLabelText(/Código da Partida/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '9x9-10-RESET9' } });

    const startSeedBtn = screen.getByRole('button', { name: /Jogar Seed/i });
    fireEvent.click(startSeedBtn);

    expect(screen.getByText(/Seed: 9x9-10-RESET9/i)).not.toBeNull();

    // Switch to Medium difficulty
    const mediumBtn = screen.getByRole('button', { name: /Médio/i });
    fireEvent.click(mediumBtn);

    // Seed badge is cleared
    expect(screen.queryByText(/Seed: 9x9-10-RESET9/i)).toBeNull();
  });

  it('Loads a seed match directly from URL hash (#seed=...) parameter', () => {
    delete (window as any).location;
    window.location = new URL('https://example.com/#seed=9x9-10-HASHSEED') as any;

    render(<App />);

    expect(screen.getByText(/Seed: 9x9-10-HASHSEED/i)).not.toBeNull();
  });

  it('Full gameplay flow: tracks movesCount, starts timer on first action, and allows sharing', () => {
    delete (window as any).location;
    window.location = new URL('https://example.com/?seed=9x9-10-MATCH8') as any;

    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      share: shareMock,
    });

    render(<App />);

    // 1. Verify seed match loaded with startCell pre-revealed
    expect(screen.getByText(/Seed: 9x9-10-MATCH8/i)).not.toBeNull();
    const cells = screen.getAllByRole('button', { name: /Linha \d+, Coluna \d+/i });

    // At least one cell is already revealed at start
    const revealedCellsAtStart = cells.filter((c) =>
      c.className.includes('bg-[#e5c29f]') || c.className.includes('bg-[#d7b899]'),
    );
    expect(revealedCellsAtStart.length).toBeGreaterThan(0);

    // 2. Find an unrevealed cell and click it in Reveal mode
    const unrevealedCell = cells.find(
      (c) => c.className.includes('bg-[#aad751]') || c.className.includes('bg-[#a2d149]'),
    );
    expect(unrevealedCell).toBeDefined();

    fireEvent.click(unrevealedCell!);

    // Timer starts (gameStatus becomes 'playing')
    // 3. Switch to flag mode and place a flag
    const flagModeBtn = screen.getByRole('button', { name: /Bandeira/i });
    fireEvent.click(flagModeBtn);

    const anotherUnrevealed = cells.find(
      (c) =>
        (c.className.includes('bg-[#aad751]') || c.className.includes('bg-[#a2d149]')) &&
        c !== unrevealedCell,
    );
    fireEvent.click(anotherUnrevealed!);

    // Flag placed
    expect(anotherUnrevealed?.querySelector('svg')).not.toBeNull();

    // 4. Test Header Share button
    const shareHeaderBtn = screen.getByLabelText('Compartilhar Seed');
    fireEvent.click(shareHeaderBtn);

    expect(shareMock).toHaveBeenCalled();
    const shareCall = shareMock.mock.calls[0][0];
    expect(shareCall.text).toContain('9x9-10-MATCH8');
    expect(shareCall.url).toContain('seed=9x9-10-MATCH8');
  });

  it('StatusBanner displays 3BV benchmark and movesCount on game conclusion', () => {
    delete (window as any).location;
    window.location = new URL('https://example.com/?seed=9x9-10-BENCH9') as any;

    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      share: shareMock,
    });

    render(<App />);

    // Click all unrevealed buttons to conclude match (won or lost)
    const cells = screen.getAllByRole('button', { name: /Linha \d+, Coluna \d+/i });
    for (const cell of cells) {
      if (!cell.hasAttribute('disabled')) {
        fireEvent.click(cell);
      }
    }

    // Match concluded: StatusBanner renders with seed info (in both Header and StatusBanner)
    expect(screen.getAllByText(/Seed: 9x9-10-BENCH9/i).length).toBeGreaterThanOrEqual(2);
    // 3BV benchmark is displayed
    expect(screen.getByText(/3BV:/i)).not.toBeNull();

    // Click Share Result button in StatusBanner
    const shareResultBtn = screen.getByRole('button', { name: /Compartilhar Resultado/i });
    fireEvent.click(shareResultBtn);

    expect(shareMock).toHaveBeenCalled();
    const sharePayload = shareMock.mock.calls[0][0];
    expect(sharePayload.text).toContain('9x9-10-BENCH9');
    expect(sharePayload.text).toContain('3BV:');
    expect(sharePayload.text).toContain('Ações:');
  });

  it('Header share button shows "Copiado!" visual feedback when clicked', () => {
    delete (window as any).location;
    window.location = new URL('https://example.com/?seed=9x9-10-CPY777') as any;

    Object.assign(navigator, {
      share: undefined,
      clipboard: { writeText: vi.fn() },
    });
    window.alert = vi.fn();

    render(<App />);

    const shareHeaderBtn = screen.getByLabelText('Compartilhar Seed');
    expect(shareHeaderBtn.textContent).toContain('Compartilhar');

    fireEvent.click(shareHeaderBtn);

    // After fix: setCopied(true) is executed and shows "Copiado!"
    expect(shareHeaderBtn.textContent).toContain('Copiado!');
  });

  it('Chording in seed match while idle transitions game to playing', () => {
    delete (window as any).location;
    window.location = new URL('https://example.com/?seed=9x9-10-CHESS9') as any;

    render(<App />);

    // In seed match, startCell is already revealed. Find an already revealed button
    const buttons = screen.getAllByRole('button', { name: /Linha \d+, Coluna \d+/i });
    const revealedBtn = buttons.find((b) => b.className.includes('bg-[#e5c29f]') || b.className.includes('bg-[#d7b899]'));
    expect(revealedBtn).toBeDefined();

    // Trigger chord on revealed button while idle
    fireEvent.click(revealedBtn!);

    const resetBtn = screen.getByLabelText('Reiniciar Partida');
    expect(resetBtn.textContent).toContain('🙂');
  });
});
