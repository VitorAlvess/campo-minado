// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCellInteraction } from './useCellInteraction';

describe('useCellInteraction Touch & Click Interactions', () => {
  it('Touch drag/scroll (> 10px) cancels timer and touchend does NOT trigger onReveal', () => {
    const onReveal = vi.fn();
    const onToggleFlag = vi.fn();

    const { result } = renderHook(() =>
      useCellInteraction({
        onReveal,
        onToggleFlag,
        mode: 'reveal',
      }),
    );

    // 1. Touch start at (100, 100)
    act(() => {
      result.current.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as any);
    });

    // 2. User drags finger to (100, 150) (scrolling the board, 50px movement > 10px threshold)
    act(() => {
      result.current.onTouchMove({
        touches: [{ clientX: 100, clientY: 150 }],
      } as any);
    });

    // 3. User lifts finger
    const preventDefault = vi.fn();
    act(() => {
      result.current.onTouchEnd({
        preventDefault,
      } as any);
    });

    // Because gesture was a drag/scroll, touchend does not trigger onReveal
    expect(onReveal).not.toHaveBeenCalled();
  });

  it('Long-press toggles flag, calls e.preventDefault() on touchend, and suppresses synthetic click', () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    const onToggleFlag = vi.fn();

    const { result } = renderHook(() =>
      useCellInteraction({
        onReveal,
        onToggleFlag,
        mode: 'reveal',
      }),
    );

    // 1. User touches cell
    act(() => {
      result.current.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as any);
    });

    // 2. 360ms passes (Long press threshold)
    act(() => {
      vi.advanceTimersByTime(360);
    });

    expect(onToggleFlag).toHaveBeenCalledTimes(1);

    // 3. User lifts finger
    const preventDefault = vi.fn();
    act(() => {
      result.current.onTouchEnd({
        preventDefault,
      } as any);
    });

    // e.preventDefault() IS called on touchend
    expect(preventDefault).toHaveBeenCalledTimes(1);

    // 4. Even if browser synthesizes a click event:
    act(() => {
      result.current.onClick({} as any);
    });

    // Synthetic click within 400ms is suppressed
    expect(onReveal).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('onTouchCancel is provided, cancelling timer and gestures when touch is cancelled', () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    const onToggleFlag = vi.fn();

    const { result } = renderHook(() =>
      useCellInteraction({
        onReveal,
        onToggleFlag,
        mode: 'reveal',
      }),
    );

    // onTouchCancel handler exists on returned object
    expect(result.current.onTouchCancel).toBeDefined();

    // 1. User touches cell
    act(() => {
      result.current.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as any);
    });

    // If OS cancels touch (e.g. system gesture)
    act(() => {
      result.current.onTouchCancel();
    });

    act(() => {
      vi.advanceTimersByTime(360);
    });

    // onToggleFlag does not fire because timer was cancelled
    expect(onToggleFlag).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('Desktop mouse interaction: onClick in reveal mode calls onReveal, in flag mode calls onToggleFlag', () => {
    const onReveal = vi.fn();
    const onToggleFlag = vi.fn();

    const { result, rerender } = renderHook(
      ({ mode }: { mode: 'reveal' | 'flag' }) =>
        useCellInteraction({
          onReveal,
          onToggleFlag,
          mode,
        }),
      { initialProps: { mode: 'reveal' } },
    );

    // Click in reveal mode
    act(() => {
      result.current.onClick({} as any);
    });
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(onToggleFlag).not.toHaveBeenCalled();

    // Switch to flag mode
    rerender({ mode: 'flag' });
    act(() => {
      result.current.onClick({} as any);
    });
    expect(onToggleFlag).toHaveBeenCalledTimes(1);
  });

  it('Desktop mouse right-click (onContextMenu) prevents default browser menu and calls onToggleFlag', () => {
    const onReveal = vi.fn();
    const onToggleFlag = vi.fn();

    const { result } = renderHook(() =>
      useCellInteraction({
        onReveal,
        onToggleFlag,
        mode: 'reveal',
      }),
    );

    const preventDefault = vi.fn();
    act(() => {
      result.current.onContextMenu({ preventDefault } as any);
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onToggleFlag).toHaveBeenCalledTimes(1);
    expect(onReveal).not.toHaveBeenCalled();
  });

  it('Disabled state ignores all touches and clicks', () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    const onToggleFlag = vi.fn();

    const { result } = renderHook(() =>
      useCellInteraction({
        onReveal,
        onToggleFlag,
        mode: 'reveal',
        disabled: true,
      }),
    );

    // Touch start ignored
    act(() => {
      result.current.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as any);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onToggleFlag).not.toHaveBeenCalled();

    // Click ignored
    act(() => {
      result.current.onClick({} as any);
    });
    expect(onReveal).not.toHaveBeenCalled();

    // Context menu ignored
    const preventDefault = vi.fn();
    act(() => {
      result.current.onContextMenu({ preventDefault } as any);
    });
    expect(onToggleFlag).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
