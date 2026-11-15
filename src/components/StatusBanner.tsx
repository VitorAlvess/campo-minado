import React, { useEffect, useState } from 'react';
import { GameStatus } from '../types';
import confetti from 'canvas-confetti';
import { Trophy, Skull, RotateCcw, Share2, Check } from 'lucide-react';

interface StatusBannerProps {
  status: GameStatus;
  timer: number;
  movesCount?: number;
  seedCode?: string;
  threeBV?: number;
  onReset: () => void;
  onShareResult?: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  timer,
  movesCount = 0,
  seedCode,
  threeBV,
  onReset,
  onShareResult,
}) => {
  const [copied, setCopied] = useState(false);

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

  const handleShare = () => {
    if (onShareResult) {
      onShareResult();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`w-full mt-3 p-4 rounded-2xl border shadow-xl flex flex-col gap-3 animate-fade-in ${
        isWon
          ? 'bg-[#388e3c] border-[#2e7d32] text-white'
          : 'bg-[#d32f2f] border-[#b71c1c] text-white'
      }`}
    >
      <div className="flex items-center justify-between">
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
            <p className="text-xs text-white/90 font-medium">
              {isWon
                ? `Tempo: ${timer}s • ${movesCount} ações`
                : 'Clique em Jogar para tentar novamente!'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-black text-xs shadow-md transition-transform active:scale-95 bg-white text-slate-900 hover:bg-slate-100 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Jogar</span>
        </button>
      </div>

      {/* Estatísticas e Compartilhamento de Desafio por Seed */}
      {seedCode && (
        <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-white/90 font-mono text-[11px]">
            <span>Seed: {seedCode}</span>
            {threeBV !== undefined && <span>• 3BV: {threeBV}</span>}
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-black/25 hover:bg-black/40 active:scale-95 px-2.5 py-1 rounded-lg text-white font-sans font-bold text-xs cursor-pointer transition-all border border-white/20"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-amber-300" />
                <span>Compartilhar Resultado</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
