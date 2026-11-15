import { useRef, useCallback } from 'react';
import { InteractionMode } from '../types';

interface UseCellInteractionProps {
  onReveal: () => void;
  onToggleFlag: () => void;
  mode: InteractionMode;
  disabled?: boolean;
}

export function useCellInteraction({
  onReveal,
  onToggleFlag,
  mode,
  disabled = false,
}: UseCellInteractionProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchTimeRef = useRef<number>(-1000);

  // Duração para caracterizar o toque longo (360ms é o sweet-spot para mobile)
  const LONG_PRESS_MS = 360;

  const triggerHaptic = () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(40);
      }
    } catch {
      // Ignora falhas em navegadores sem suporte
    }
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      isLongPressRef.current = false;
      const touch = e.touches[0];
      startPosRef.current = { x: touch.clientX, y: touch.clientY };

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        triggerHaptic();
        onToggleFlag();
      }, LONG_PRESS_MS);
    },
    [disabled, onToggleFlag],
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startPosRef.current.x);
    const dy = Math.abs(touch.clientY - startPosRef.current.y);

    // Se o dedo moveu mais de 10px, cancela o toque longo (está rolando/arrastando)
    if (dx > 10 || dy > 10) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      startPosRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      lastTouchTimeRef.current = Date.now();

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Previne evento de clique sintético gerado pelo navegador após o toque
      if (e.preventDefault) {
        e.preventDefault();
      }

      // Se não foi toque longo e não foi arrasto, processa o clique
      if (!isLongPressRef.current && startPosRef.current) {
        if (mode === 'flag') {
          triggerHaptic();
          onToggleFlag();
        } else {
          onReveal();
        }
      }

      startPosRef.current = null;
      isLongPressRef.current = false;
    },
    [disabled, mode, onReveal, onToggleFlag],
  );

  const handleTouchCancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
    isLongPressRef.current = false;
  }, []);

  // Para desktop / mouse
  const handleClick = useCallback(
    (_e: React.MouseEvent) => {
      if (disabled) return;
      // Previne disparo duplicado caso touch tenha executado recentemente (< 400ms)
      if (Date.now() - lastTouchTimeRef.current < 400) return;

      if (mode === 'flag') {
        onToggleFlag();
      } else {
        onReveal();
      }
    },
    [disabled, mode, onReveal, onToggleFlag],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (disabled) return;
      triggerHaptic();
      onToggleFlag();
    },
    [disabled, onToggleFlag],
  );

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
    onClick: handleClick,
    onContextMenu: handleContextMenu,
  };
}
