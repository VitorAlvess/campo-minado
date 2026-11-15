import React from 'react';
import { Cell, InteractionMode } from '../types';
import { useCellInteraction } from '../hooks/useCellInteraction';

interface CellViewProps {
  cell: Cell;
  mode: InteractionMode;
  disabled: boolean;
  onReveal: (row: number, col: number) => void;
  onToggleFlag: (row: number, col: number) => void;
  onChord: (row: number, col: number) => void;
}

// Cores autênticas dos números do Campo Minado do Google
const GOOGLE_NUMBER_COLORS: Record<number, string> = {
  1: 'text-[#1976d2]', // Azul Google
  2: 'text-[#388e3c]', // Verde Google
  3: 'text-[#d32f2f]', // Vermelho Google
  4: 'text-[#7b1fa2]', // Roxo
  5: 'text-[#ff8f00]', // Laranja/Âmbar
  6: 'text-[#0097a7]', // Ciano/Teal
  7: 'text-[#424242]', // Cinza escuro
  8: 'text-[#616161]', // Cinza médio
};

/** Ícone de bandeira estilizado igual ao do Google */
const GoogleFlag: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-[72%] h-[72%] drop-shadow-sm select-none" fill="none">
    {/* Base da haste */}
    <ellipse cx="12" cy="20" rx="6" ry="2" fill="#2e3d23" opacity="0.6" />
    <path d="M12 4 L12 20" stroke="#37474f" strokeWidth="2" strokeLinecap="round" />
    {/* Flâmula vermelha Google */}
    <path d="M12 4 L21 8.5 L12 13 Z" fill="#ea4335" />
    <path d="M12 4 L18 8.5 L12 13 Z" fill="#d93025" />
  </svg>
);

/** Ícone de mina estilizado igual ao do Google */
const GoogleMine: React.FC<{ isExploded?: boolean }> = ({ isExploded }) => (
  <svg viewBox="0 0 24 24" className="w-[78%] h-[78%] select-none" fill="none">
    {/* Espinhos da mina */}
    <line x1="12" y1="2" x2="12" y2="22" stroke={isExploded ? '#ffffff' : '#212121'} strokeWidth="2.2" strokeLinecap="round" />
    <line x1="2" y1="12" x2="22" y2="12" stroke={isExploded ? '#ffffff' : '#212121'} strokeWidth="2.2" strokeLinecap="round" />
    <line x1="4.9" y1="4.9" x2="19.1" y2="19.1" stroke={isExploded ? '#ffffff' : '#212121'} strokeWidth="2.2" strokeLinecap="round" />
    <line x1="4.9" y1="19.1" x2="19.1" y2="4.9" stroke={isExploded ? '#ffffff' : '#212121'} strokeWidth="2.2" strokeLinecap="round" />
    {/* Corpo central esférico */}
    <circle cx="12" cy="12" r="6.5" fill={isExploded ? '#ffffff' : '#263238'} />
    {/* Brilho da esfera */}
    <circle cx="10" cy="10" r="2" fill={isExploded ? '#ffebee' : '#78909c'} opacity="0.8" />
    {/* Ponto central decorativo */}
    <circle cx="12" cy="12" r="1.5" fill={isExploded ? '#d32f2f' : '#ea4335'} />
  </svg>
);

export const CellView: React.FC<CellViewProps> = ({
  cell,
  mode,
  disabled,
  onReveal,
  onToggleFlag,
  onChord,
}) => {
  const { row, col, isMine, isRevealed, isFlagged, adjacentMines, isExploded } = cell;

  const interaction = useCellInteraction({
    onReveal: () => {
      if (isRevealed) {
        onChord(row, col);
      } else {
        onReveal(row, col);
      }
    },
    onToggleFlag: () => onToggleFlag(row, col),
    mode,
    disabled,
  });

  const isEven = (row + col) % 2 === 0;

  const renderContent = () => {
    if (isFlagged) {
      return <GoogleFlag />;
    }

    if (!isRevealed) {
      return null;
    }

    if (isMine) {
      return <GoogleMine isExploded={isExploded} />;
    }

    if (adjacentMines > 0) {
      return (
        <span
          className={`font-sans font-black text-lg select-none leading-none ${
            GOOGLE_NUMBER_COLORS[adjacentMines] || 'text-slate-800'
          }`}
          style={{ textShadow: '0 1px 0 rgba(255,255,255,0.3)' }}
        >
          {adjacentMines}
        </span>
      );
    }

    return null;
  };

  // Cores do Campo Minado do Google: Padrão xadrez de grama (#aad751 e #a2d149) e solo (#e5c29f e #d7b899)
  let cellClass =
    'relative aspect-square flex items-center justify-center transition-colors select-none font-bold overflow-hidden cursor-pointer ';

  if (!isRevealed) {
    // Grama (não revelada)
    cellClass += isEven
      ? 'bg-[#aad751] hover:bg-[#bfe17d] active:bg-[#97c63e] '
      : 'bg-[#a2d149] hover:bg-[#b6dd74] active:bg-[#8ebb35] ';
  } else {
    // Solo / Terra (revelada)
    if (isExploded) {
      cellClass += 'bg-[#ea4335] shadow-inner ';
    } else if (isMine) {
      cellClass += 'bg-[#d93025]/90 shadow-inner ';
    } else {
      cellClass += isEven ? 'bg-[#e5c29f] ' : 'bg-[#d7b899] ';
    }
  }

  return (
    <button
      type="button"
      {...interaction}
      disabled={disabled}
      className={cellClass}
      aria-label={`Linha ${row + 1}, Coluna ${col + 1}`}
    >
      {renderContent()}
    </button>
  );
};
