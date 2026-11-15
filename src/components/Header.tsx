import React from 'react';
import { GameStatus } from '../types';
import { RotateCcw } from 'lucide-react';

interface HeaderProps {
  remainingMines: number;
  timer: number;
  gameStatus: GameStatus;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  remainingMines,
  timer,
  gameStatus,
  onReset,
}) => {
  const formatTimer = (val: number) => {
    return Math.max(0, Math.min(999, val)).toString().padStart(3, '0');
  };

  const getSmileyEmoji = () => {
    switch (gameStatus) {
      case 'won':
        return '😎';
      case 'lost':
        return '😵';
      case 'playing':
        return '🙂';
      default:
        return '🙂';
    }
  };

  return (
    <header className="w-full bg-[#4a752c] rounded-t-2xl px-4 py-3 shadow-md flex items-center justify-between select-none">
      {/* Contador de Bandeiras / Minas no estilo Google */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
            <ellipse cx="12" cy="20" rx="5" ry="1.8" fill="#2d481b" opacity="0.6" />
            <path d="M12 4 L12 20" stroke="#f1f5f9" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 4 L21 8.5 L12 13 Z" fill="#ea4335" />
          </svg>
        </div>
        <span className="font-sans text-2xl font-black text-white tracking-wide tabular-nums">
          {remainingMines}
        </span>
      </div>

      {/* Botão de Reinício Central (Rostinho do Google) */}
      <button
        onClick={onReset}
        type="button"
        className="w-11 h-11 rounded-full bg-[#578a34] hover:bg-[#619a3a] active:scale-95 transition-transform flex items-center justify-center text-2xl shadow-inner border border-[#6ba940] relative group cursor-pointer"
        aria-label="Reiniciar Partida"
      >
        <span>{getSmileyEmoji()}</span>
        <div className="absolute -bottom-1 -right-1 bg-[#3a5d23] rounded-full p-1 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
          <RotateCcw className="w-2.5 h-2.5" />
        </div>
      </button>

      {/* Cronômetro no estilo Google */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2 2" />
            <path d="M12 2v3" />
            <path d="M10 2h4" />
          </svg>
        </div>
        <span className="font-sans text-2xl font-black text-white tracking-wide tabular-nums">
          {formatTimer(timer)}
        </span>
      </div>
    </header>
  );
};
