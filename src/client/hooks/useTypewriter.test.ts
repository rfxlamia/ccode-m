import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTypewriter } from './useTypewriter';

let originalRaf: typeof requestAnimationFrame;
let originalCancelRaf: typeof cancelAnimationFrame;

describe('src/client/hooks/useTypewriter.ts', () => {
  beforeEach(() => {
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;

    globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      return window.setTimeout(() => {
        callback(Date.now());
      }, 0);
    };
    globalThis.cancelAnimationFrame = (handle: number): void => {
      window.clearTimeout(handle);
    };
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancelRaf;
  });

  it('starts with empty displayed text', () => {
    const { result } = renderHook(() => useTypewriter('Hello'));
    expect(result.current.displayedText).toBe('');
    expect(result.current.isTyping).toBe(true);
  });

  it('skipToEnd shows full text immediately', () => {
    const { result } = renderHook(() => useTypewriter('Hello World'));
    act(() => {
      result.current.skipToEnd();
    });
    expect(result.current.displayedText).toBe('Hello World');
    expect(result.current.isTyping).toBe(false);
  });

  it('respects enabled=false', () => {
    const { result } = renderHook(() => useTypewriter('Hello', { enabled: false }));
    expect(result.current.displayedText).toBe('');
    expect(result.current.isTyping).toBe(false);
  });

  it('calls onComplete when finished', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useTypewriter('Hi', { onComplete }));
    act(() => {
      result.current.skipToEnd();
    });
    expect(onComplete).toHaveBeenCalled();
  });
});
