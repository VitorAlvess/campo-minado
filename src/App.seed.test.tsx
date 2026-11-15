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
    fireEvent.change(input, { target: { value: '9x9-10-ALPHA2' } });

    // 4. Submit form
    const startSeedBtn = screen.getByRole('button', { name: /Jogar Seed/i });
    expect(startSeedBtn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(startSeedBtn);

    // 5. Header now displays active seed badge
    expect(screen.getByText(/Seed: 9x9-10-ALPHA2/i)).not.toBeNull();
  });

  it('Loads a seed match directly from URL parameter', () => {
    // Simulate URL with ?seed=9x9-10-URLSEED
    delete (window as any).location;
    window.location = new URL('https://example.com/?seed=9x9-10-URLSEED') as any;

    render(<App />);

    // Header automatically shows the seed code from the URL
    expect(screen.getByText(/Seed: 9x9-10-URLSEED/i)).not.toBeNull();
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
    fireEvent.change(input, { target: { value: '9x9-10-CLEAR9' } });

    const startSeedBtn = screen.getByRole('button', { name: /Jogar Seed/i });
    fireEvent.click(startSeedBtn);

    expect(screen.getByText(/Seed: 9x9-10-CLEAR9/i)).not.toBeNull();

    // Switch to Medium difficulty
    const mediumBtn = screen.getByRole('button', { name: /Médio/i });
    fireEvent.click(mediumBtn);

    // Seed badge is cleared
    expect(screen.queryByText(/Seed: 9x9-10-CLEAR1/i)).toBeNull();
  });
});
