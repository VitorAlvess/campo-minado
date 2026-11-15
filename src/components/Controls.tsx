import React from 'react';
import { Difficulty, DIFFICULTIES, InteractionMode } from '../types';
import { Pickaxe, Flag, Sparkles, Dices } from 'lucide-react';

interface ControlsProps {
  difficulty: Difficulty;
  onSelectDifficulty: (d: Difficulty) => void;
  mode: InteractionMode;
  onToggleMode: (m: InteractionMode) => void;
  onOpenSeedModal?: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  difficulty,
  onSelectDifficulty,
  mode,
  onToggleMode,
  onOpenSeedModal,
}) => {
  return (
    <div className="w-full flex flex-col gap-2.5 mt-3 select-none">
      {/* Seletor de Modo de Toque (Escavar vs Bandeira) */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#4a752c] rounded-2xl shadow-md border border-[#3e6824]">
        <button
          type="button"
          aria-label="Escavar - Abrir Célula"
          onClick={() => onToggleMode('reveal')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            mode === 'reveal'
              ? 'bg-[#1976d2] text-white shadow-md scale-[1.02]'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
        >
          <Pickaxe className="w-4 h-4" />
          <span>Escavar</span>
        </button>

        <button
          type="button"
          aria-label="Bandeira"
          onClick={() => onToggleMode('flag')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            mode === 'flag'
              ? 'bg-[#ea4335] text-white shadow-md scale-[1.02]'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>Bandeira</span>
        </button>
      </div>

      {/* Seletor de Dificuldade no Estilo Google */}
      <div className="flex items-center justify-between gap-1.5 p-1.5 bg-[#4a752c] rounded-2xl shadow-md border border-[#3e6824]">
        {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => {
          const config = DIFFICULTIES[d];
          const isSelected = difficulty === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelectDifficulty(d)}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                isSelected
                  ? 'bg-[#578a34] text-white shadow-md border border-[#6ba940]'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    d === 'easy'
                      ? 'bg-emerald-400'
                      : d === 'medium'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                  }`}
                />
                <span>{config.name}</span>
              </div>
              <span className="block text-[10px] opacity-75 font-mono mt-0.5">
                {config.rows}x{config.cols} ({config.mines})
              </span>
            </button>
          );
        })}
      </div>

      {/* Botão de Jogar com Seed / Desafio */}
      {onOpenSeedModal && (
        <button
          type="button"
          onClick={onOpenSeedModal}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#4a752c] hover:bg-[#578a34] active:scale-98 rounded-2xl shadow-md border border-[#3e6824] text-xs font-bold text-white transition-all cursor-pointer"
        >
          <Dices className="w-4 h-4 text-amber-300" />
          <span>Desafio por Seed / Jogar com Amigo</span>
        </button>
      )}

      {/* Dica de Toque Longo */}
      <div className="flex items-center justify-center gap-1.5 text-center text-xs text-white/90 bg-[#4a752c]/90 py-2 px-3 rounded-xl shadow-sm border border-[#3e6824]">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <span>Toque longo (segurar) coloca bandeira sem trocar de modo.</span>
      </div>
    </div>
  );
};
