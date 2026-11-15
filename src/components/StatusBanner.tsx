import React, { useEffect } from 'react';
import { GameStatus } from '../types';
import confetti from 'canvas-confetti';
import { Trophy, Skull, RotateCcw } from 'lucide-react';

interface StatusBannerProps {
  status: GameStatus;
  timer: number;
  onReset: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  timer,
  onReset,
}) => {
  useEffect(() => {
    if (status === 'won') {
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignora caso falhe
      }
    }
  }, [status]);

  if (status !== 'won' && status !== 'lost') {
    return null;
  }

  const isWon = status === 'won';

  return (
    <div
      className={`w-full mt-3 p-4 rounded-2xl border shadow-xl flex items-center justify-between animate-fade-in ${
        isWon
          ? 'bg-[#388e3c] border-[#2e7d32] text-white'
          : 'bg-[#d32f2f] border-[#b71c1c] text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-black/20">
          {isWon ? (
            <Trophy className="w-6 h-6 text-amber-300 animate-bounce" />
          ) : (
            <Skull className="w-6 h-6 text-white animate-pulse" />
          )}
        </div>
        <div>
          <h3 className="font-black text-base tracking-wide">
            {isWon ? 'Vitória! Você limpou o campo!' : 'Fim de Jogo! Uma mina explodiu!'}
          </h3>
          <p className="text-xs text-white/80 font-medium">
            {isWon
              ? `Tempo: ${timer}s no estilo Google`
              : 'Clique em Jogar para tentar novamente!'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl font-black text-xs shadow-md transition-transform active:scale-95 bg-white text-slate-900 hover:bg-slate-100 cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Jogar</span>
      </button>
    </div>
  );
};
