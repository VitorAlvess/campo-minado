import React, { useState } from 'react';
import { GameStatus } from '../types';
import { RotateCcw, Hash, Share2, Check } from 'lucide-react';

interface HeaderProps {
  remainingMines: number;
  timer: number;
  gameStatus: GameStatus;
  onReset: () => void;
  seedCode?: string;
  onShareSeed?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  remainingMines,
  timer,
  gameStatus,
  onReset,
  seedCode,
  onShareSeed,
}) => {
  const [copied, setCopied] = useState(false);

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

  const handleCopyOrShare = () => {
    if (onShareSeed) {
      onShareSeed();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (seedCode && typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(seedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="w-full bg-[#4a752c] rounded-t-2xl px-4 py-3 shadow-md flex flex-col gap-2 select-none">
      <div className="flex items-center justify-between w-full">
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
      </div>

      {/* Pill do Código de Seed Ativo */}
      {seedCode && (
        <div className="w-full pt-1.5 border-t border-[#578a34] flex items-center justify-between text-xs font-mono">
          <span className="text-white/90 flex items-center gap-1 font-bold">
            <Hash className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Seed: {seedCode}</span>
          </span>
          <button
            type="button"
            onClick={handleCopyOrShare}
            className="flex items-center gap-1 bg-[#578a34] hover:bg-[#619a3a] active:scale-95 px-2 py-0.5 rounded-lg text-white font-sans font-bold text-[11px] cursor-pointer transition-all"
            aria-label="Compartilhar Seed"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-300" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3 h-3 text-amber-300" />
                <span>Compartilhar</span>
              </>
            )}
          </button>
        </div>
      )}
    </header>
  );
};
