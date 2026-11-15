import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Difficulty,
  DIFFICULTIES,
  Board,
  GameStatus,
  InteractionMode,
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
import { Header } from './components/Header';
import { BoardView } from './components/BoardView';
import { Controls } from './components/Controls';
import { StatusBanner } from './components/StatusBanner';

export function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [board, setBoard] = useState<Board>(() => {
    const config = DIFFICULTIES.easy;
    return createEmptyBoard(config.rows, config.cols);
  });
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [timer, setTimer] = useState(0);
  const [mode, setMode] = useState<InteractionMode>('reveal');

  const config = DIFFICULTIES[difficulty];
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Inicializa ou reinicia a partida
  const handleReset = useCallback(
    (newDiff?: Difficulty) => {
      const activeDiff = newDiff || difficulty;
      const targetConfig = DIFFICULTIES[activeDiff];

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      setGameStatus('idle');
      setTimer(0);
      setBoard(createEmptyBoard(targetConfig.rows, targetConfig.cols));
    },
    [difficulty],
  );

  // Troca de dificuldade
  const handleSelectDifficulty = (newDiff: Difficulty) => {
    if (newDiff === difficulty) return;
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

    // Primeiro toque da partida: gera as bombas garantindo que a célula seja segura
    if (gameStatus === 'idle') {
      currentBoard = populateMines(
        board,
        config.rows,
        config.cols,
        config.mines,
        row,
        col,
      );
      setGameStatus('playing');
    }

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
    const newBoard = toggleFlag(board, row, col);
    setBoard(newBoard);
  };

  // Abertura rápida de vizinhos (Chording)
  const handleChord = (row: number, col: number) => {
    if (gameStatus !== 'playing') return;
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

  const flagsCount = countFlags(board);
  const remainingMines = gameStatus === 'won' ? 0 : config.mines - flagsCount;

  return (
    <div className="min-h-screen bg-[#4a752c] text-white flex flex-col justify-between items-center p-3 select-none overscroll-none touch-manipulation">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Cabeçalho de Placar no estilo Campo Minado do Google */}
        <Header
          remainingMines={remainingMines}
          timer={timer}
          gameStatus={gameStatus}
          onReset={() => handleReset()}
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

        {/* Banner de Vitória / Derrota */}
        <StatusBanner
          status={gameStatus}
          timer={timer}
          onReset={() => handleReset()}
        />

        {/* Controles no estilo Google */}
        <Controls
          difficulty={difficulty}
          onSelectDifficulty={handleSelectDifficulty}
          mode={mode}
          onToggleMode={setMode}
        />
      </div>

      {/* Rodapé PWA */}
      <footer className="w-full max-w-md text-center py-2 text-xs text-white/70 font-medium">
        Campo Minado • Visual Google • 100% Offline no iOS
      </footer>
    </div>
  );
}

export default App;
