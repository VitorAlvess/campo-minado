import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Difficulty,
  DIFFICULTIES,
  Board,
  GameStatus,
  InteractionMode,
  SeedMatchInfo,
} from './types';
import {
  createEmptyBoard,
  populateMines,
  revealCell,
  toggleFlag,
  chordCell,
  checkWinCondition,
  countFlags,
} from './game/logic';
import {
  generateBoardFromSeed,
  decodeSeedCode,
  encodeSeedCode,
  generateRandomSeed,
} from './game/seedGenerator';
import { Header } from './components/Header';
import { BoardView } from './components/BoardView';
import { Controls } from './components/Controls';
import { StatusBanner } from './components/StatusBanner';
import { SeedModal } from './components/SeedModal';

export function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [board, setBoard] = useState<Board>(() => {
    const config = DIFFICULTIES.easy;
    return createEmptyBoard(config.rows, config.cols);
  });
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [timer, setTimer] = useState(0);
  const [mode, setMode] = useState<InteractionMode>('reveal');
  const [movesCount, setMovesCount] = useState(0);
  const [seedMatch, setSeedMatch] = useState<SeedMatchInfo | null>(null);
  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);

  const config = DIFFICULTIES[difficulty];
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Inicia uma partida determinística com base em um código de seed
  const handleStartWithSeed = useCallback((code: string) => {
    const parsed = decodeSeedCode(code);
    if (!parsed) return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const { board: initialBoard, startCell, threeBV, seedCode } = generateBoardFromSeed(
      parsed.rows,
      parsed.cols,
      parsed.mines,
      parsed.seed,
    );

    // Ajusta a dificuldade correspondente se casar com um preset
    const matchingDiff = (Object.keys(DIFFICULTIES) as Difficulty[]).find(
      (d) =>
        DIFFICULTIES[d].rows === parsed.rows &&
        DIFFICULTIES[d].cols === parsed.cols &&
        DIFFICULTIES[d].mines === parsed.mines,
    );
    if (matchingDiff) {
      setDifficulty(matchingDiff);
    }

    setBoard(initialBoard);
    setSeedMatch({
      code: seedCode,
      seed: parsed.seed,
      rows: parsed.rows,
      cols: parsed.cols,
      mines: parsed.mines,
      threeBV,
      startCell,
    });
    setTimer(0);
    setMovesCount(0);
    setGameStatus('idle');

    // Atualiza a URL sem recarregar a página para permitir compartilhamento direto
    try {
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.set('seed', seedCode);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {
      // Ignora falhas de replaceState em ambientes de teste / iframe
    }
  }, []);

  // Leitura de parâmetro de URL (?seed=... ou #seed=...) ao inicializar o app
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlSeed =
        params.get('seed') ||
        (window.location.hash.startsWith('#seed=')
          ? window.location.hash.slice(6)
          : null);

      if (urlSeed) {
        handleStartWithSeed(urlSeed);
      }
    }
  }, [handleStartWithSeed]);

  // Inicializa ou reinicia a partida
  const handleReset = useCallback(
    (newDiff?: Difficulty) => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      setTimer(0);
      setMovesCount(0);
      setGameStatus('idle');

      // Se mudou de dificuldade explicitamente, sai do modo seed
      if (newDiff) {
        setSeedMatch(null);
        try {
          if (typeof window !== 'undefined' && window.history?.replaceState) {
            const url = new URL(window.location.href);
            url.searchParams.delete('seed');
            window.history.replaceState({}, '', url.toString());
          }
        } catch {
          // Ignora
        }
        const targetConfig = DIFFICULTIES[newDiff];
        setBoard(createEmptyBoard(targetConfig.rows, targetConfig.cols));
        return;
      }

      // Se estava em uma partida de seed e apenas clicou no Smiley (reiniciar), recria o mesmo mapa!
      if (seedMatch) {
        const { board: initialBoard } = generateBoardFromSeed(
          seedMatch.rows,
          seedMatch.cols,
          seedMatch.mines,
          seedMatch.seed,
        );
        setBoard(initialBoard);
        return;
      }

      // Modo padrão (aleatório)
      setBoard(createEmptyBoard(config.rows, config.cols));
    },
    [config.rows, config.cols, seedMatch],
  );

  // Troca de dificuldade
  const handleSelectDifficulty = (newDiff: Difficulty) => {
    if (newDiff === difficulty && !seedMatch) return;
    setDifficulty(newDiff);
    handleReset(newDiff);
  };

  // Temporizador da partida
  useEffect(() => {
    if (gameStatus === 'playing') {
      timerIntervalRef.current = setInterval(() => {
        setTimer((t) => Math.min(999, t + 1));
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [gameStatus]);

  // Ação de Revelar Célula (Tap)
  const handleReveal = (row: number, col: number) => {
    if (gameStatus === 'won' || gameStatus === 'lost') return;
    if (board[row][col].isRevealed || board[row][col].isFlagged) return;

    let currentBoard = board;

    // Primeiro toque da partida
    if (gameStatus === 'idle') {
      if (!seedMatch) {
        // Modo aleatório tradicional: gera as bombas garantindo que a célula seja segura
        currentBoard = populateMines(
          board,
          config.rows,
          config.cols,
          config.mines,
          row,
          col,
        );
      }
      setGameStatus('playing');
    }

    setMovesCount((m) => m + 1);
    const { newBoard, hitMine } = revealCell(currentBoard, row, col);

    if (hitMine) {
      setBoard(newBoard);
      setGameStatus('lost');
    } else if (checkWinCondition(newBoard)) {
      // Vitória: coloca bandeiras automáticas em todas as minas restantes
      const wonBoard = newBoard.map((r) =>
        r.map((c) => (c.isMine ? { ...c, isFlagged: true } : c)),
      );
      setBoard(wonBoard);
      setGameStatus('won');
    } else {
      setBoard(newBoard);
    }
  };

  // Ação de Colocar/Remover Bandeira (Toque longo ou modo bandeira)
  const handleToggleFlag = (row: number, col: number) => {
    if (gameStatus === 'won' || gameStatus === 'lost') return;
    setMovesCount((m) => m + 1);
    const newBoard = toggleFlag(board, row, col);
    setBoard(newBoard);
  };

  // Abertura rápida de vizinhos (Chording)
  const handleChord = (row: number, col: number) => {
    if (gameStatus !== 'playing') return;
    setMovesCount((m) => m + 1);
    const { newBoard, hitMine } = chordCell(board, row, col);

    if (hitMine) {
      setBoard(newBoard);
      setGameStatus('lost');
    } else if (checkWinCondition(newBoard)) {
      const wonBoard = newBoard.map((r) =>
        r.map((c) => (c.isMine ? { ...c, isFlagged: true } : c)),
      );
      setBoard(wonBoard);
      setGameStatus('won');
    } else {
      setBoard(newBoard);
    }
  };

  // Compartilhamento de Convite de Seed
  const handleShareSeed = () => {
    if (!seedMatch) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?seed=${seedMatch.code}`;
    const text = `🚩 Desafio de Campo Minado!\nJogue exatamente o mesmo mapa que eu.\nCódigo: ${seedMatch.code}\nLink: ${shareUrl}`;

    if (navigator.share) {
      navigator.share({ title: 'Desafio Campo Minado', text, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareUrl);
      alert(`Link do desafio copiado para a área de transferência:\n${shareUrl}`);
    }
  };

  // Compartilhamento de Resultado (estilo Wordle / Termoo)
  const handleShareResult = () => {
    if (!seedMatch) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?seed=${seedMatch.code}`;
    const outcome = gameStatus === 'won' ? '🏆 Vitória!' : '💥 Derrota!';
    const text = `🚩 Campo Minado - Desafio por Seed!\n🗺️ Mapa: ${seedMatch.code}\n⏱️ Tempo: ${timer}s | 👆 Ações: ${movesCount} | 3BV: ${seedMatch.threeBV}\n${outcome}\nJogue no mesmo mapa: ${shareUrl}`;

    if (navigator.share) {
      navigator.share({ title: 'Resultado do Campo Minado', text, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      alert('Resultado copiado com sucesso para a área de transferência!');
    }
  };

  const flagsCount = countFlags(board);
  const activeMinesCount = seedMatch ? seedMatch.mines : config.mines;
  const remainingMines = gameStatus === 'won' ? 0 : activeMinesCount - flagsCount;

  return (
    <div className="min-h-screen bg-[#4a752c] text-white flex flex-col justify-between items-center p-3 select-none overscroll-none touch-manipulation">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Cabeçalho de Placar no estilo Campo Minado do Google */}
        <Header
          remainingMines={remainingMines}
          timer={timer}
          gameStatus={gameStatus}
          onReset={() => handleReset()}
          seedCode={seedMatch?.code}
          onShareSeed={handleShareSeed}
        />

        {/* Tabuleiro com padrão de grama xadrez do Google */}
        <BoardView
          board={board}
          mode={mode}
          disabled={gameStatus === 'won' || gameStatus === 'lost'}
          onReveal={handleReveal}
          onToggleFlag={handleToggleFlag}
          onChord={handleChord}
        />

        {/* Banner de Vitória / Derrota com métricas e compartilhamento */}
        <StatusBanner
          status={gameStatus}
          timer={timer}
          movesCount={movesCount}
          seedCode={seedMatch?.code}
          threeBV={seedMatch?.threeBV}
          onReset={() => handleReset()}
          onShareResult={handleShareResult}
        />

        {/* Controles no estilo Google */}
        <Controls
          difficulty={difficulty}
          onSelectDifficulty={handleSelectDifficulty}
          mode={mode}
          onToggleMode={setMode}
          onOpenSeedModal={() => setIsSeedModalOpen(true)}
        />
      </div>

      {/* Modal de Desafio por Seed */}
      <SeedModal
        isOpen={isSeedModalOpen}
        onClose={() => setIsSeedModalOpen(false)}
        onStartWithSeed={handleStartWithSeed}
        currentSeedCode={
          seedMatch?.code ||
          encodeSeedCode(config.rows, config.cols, config.mines, generateRandomSeed(6))
        }
        defaultDifficulty={difficulty}
      />

      {/* Rodapé PWA */}
      <footer className="w-full max-w-md text-center py-2 text-xs text-white/70 font-medium">
        Campo Minado • Visual Google • Desafio por Seed • 100% Offline
      </footer>
    </div>
  );
}

export default App;
