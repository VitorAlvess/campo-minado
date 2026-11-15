import React, { useState } from 'react';
import { decodeSeedCode, encodeSeedCode, generateRandomSeed } from '../game/seedGenerator';
import { DIFFICULTIES, Difficulty } from '../types';
import { Dices, Check, AlertCircle, X, Sparkles, Hash } from 'lucide-react';

interface SeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartWithSeed: (code: string) => void;
  currentSeedCode?: string;
  defaultDifficulty: Difficulty;
}

export const SeedModal: React.FC<SeedModalProps> = ({
  isOpen,
  onClose,
  onStartWithSeed,
  currentSeedCode,
  defaultDifficulty,
}) => {
  const [inputCode, setInputCode] = useState(() => currentSeedCode || '');
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>(defaultDifficulty);

  if (!isOpen) return null;

  const parsed = decodeSeedCode(inputCode);
  const isValid = parsed !== null;

  const handleGenerateRandom = (diff: Difficulty) => {
    setSelectedDiff(diff);
    const config = DIFFICULTIES[diff];
    const newSeed = generateRandomSeed(6);
    const newCode = encodeSeedCode(config.rows, config.cols, config.mines, newSeed);
    setInputCode(newCode);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && inputCode.trim()) {
      onStartWithSeed(inputCode.trim().toUpperCase());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div className="w-full max-w-sm bg-[#4a752c] rounded-3xl p-5 shadow-2xl border-2 border-[#5c8f37] text-white flex flex-col gap-4">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#578a34] rounded-xl shadow-inner">
              <Hash className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-black text-lg leading-tight">Jogar com Seed</h2>
              <p className="text-[11px] text-white/80 font-medium">
                Partidas idênticas para desafiar amigos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white/80 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gerador Rápido por Dificuldade */}
        <div className="bg-[#3e6824] p-3 rounded-2xl flex flex-col gap-2 border border-[#528430]">
          <div className="flex items-center justify-between text-xs font-bold text-white/90">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Gerar Seed Aleatória
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => {
              const cfg = DIFFICULTIES[d];
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleGenerateRandom(d)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center cursor-pointer border ${
                    selectedDiff === d
                      ? 'bg-[#578a34] text-white border-[#72b044] shadow-md'
                      : 'bg-[#4a752c]/80 text-white/80 border-transparent hover:bg-white/10'
                  }`}
                >
                  <span>{cfg.name}</span>
                  <span className="text-[10px] font-mono text-white/70">
                    {cfg.cols}x{cfg.rows}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Formulário com Código da Partida */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="seed-input"
              className="block text-xs font-bold text-white/90 mb-1"
            >
              Código da Partida:
            </label>
            <div className="relative">
              <input
                id="seed-input"
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Ex: 9x9-10-K7M2QX"
                className="w-full bg-[#3e6824] border border-[#528430] rounded-xl px-3 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 placeholder:text-white/40 tracking-wider"
              />
              {isValid && (
                <Check className="absolute right-3 top-3 w-4 h-4 text-emerald-400" />
              )}
            </div>

            {/* Mensagem de Validação */}
            <div className="mt-1.5 min-h-[20px] text-xs font-medium">
              {inputCode.trim() === '' ? (
                <span className="text-white/60">
                  Cole um código recebido ou clique em gerar acima.
                </span>
              ) : isValid ? (
                <span className="text-emerald-300 flex items-center gap-1 font-semibold">
                  <Check className="w-3 h-3" />
                  Código válido ({parsed.cols}x{parsed.rows}, {parsed.mines} minas)
                </span>
              ) : (
                <span className="text-rose-300 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Formato: LARGxALT-MINAS-SEED (ex: 9x9-10-K7M2QX)
                </span>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                isValid
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 active:scale-95'
                  : 'bg-white/20 text-white/40 cursor-not-allowed'
              }`}
            >
              <Dices className="w-4 h-4" />
              <span>Jogar Seed</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

