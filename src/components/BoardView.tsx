import React from 'react';
import { Board, InteractionMode } from '../types';
import { CellView } from './CellView';

interface BoardViewProps {
  board: Board;
  mode: InteractionMode;
  disabled: boolean;
  onReveal: (row: number, col: number) => void;
  onToggleFlag: (row: number, col: number) => void;
  onChord: (row: number, col: number) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  board,
  mode,
  disabled,
  onReveal,
  onToggleFlag,
  onChord,
}) => {
  const cols = board[0]?.length || 9;

  return (
    <div className="w-full flex justify-center items-center select-none">
      <div
        className="w-full max-w-md bg-[#87af3a] rounded-b-2xl overflow-hidden shadow-2xl border-4 border-[#4a752c] border-t-0 touch-manipulation"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: '0px',
        }}
      >
        {board.map((row) =>
          row.map((cell) => (
            <CellView
              key={`${cell.row}-${cell.col}`}
              cell={cell}
              mode={mode}
              disabled={disabled}
              onReveal={onReveal}
              onToggleFlag={onToggleFlag}
              onChord={onChord}
            />
          )),
        )}
      </div>
    </div>
  );
};
