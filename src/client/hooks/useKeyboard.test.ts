import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useKeyboard } from './useKeyboard';

describe('useKeyboard', () => {
  it('registers keydown listener on mount', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');

    renderHook(() => {
      useKeyboard();
    });

    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    addSpy.mockRestore();
  });

  it('removes keydown listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => {
      useKeyboard();
    });
    unmount();

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('calls focusChat on Cmd+K', () => {
    const focusChat = vi.fn();
    renderHook(() => {
      useKeyboard({ focusChat });
    });

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
    });
    document.dispatchEvent(event);

    expect(focusChat).toHaveBeenCalledTimes(1);
  });

  it('calls focusChat on Ctrl+K', () => {
    const focusChat = vi.fn();
    renderHook(() => {
      useKeyboard({ focusChat });
    });

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
    });
    document.dispatchEvent(event);

    expect(focusChat).toHaveBeenCalledTimes(1);
  });

  it('calls sendMessage on Cmd+Enter', () => {
    const sendMessage = vi.fn();
    renderHook(() => {
      useKeyboard({ sendMessage });
    });

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      metaKey: true,
    });
    document.dispatchEvent(event);

    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('calls escape on Escape key', () => {
    const escape = vi.fn();
    renderHook(() => {
      useKeyboard({ escape });
    });

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
    });
    document.dispatchEvent(event);

    expect(escape).toHaveBeenCalledTimes(1);
  });

  it('does not call handlers when no shortcuts provided', () => {
    renderHook(() => {
      useKeyboard();
    });

    // Should not throw when dispatching events with no handlers
    const events = [
      new KeyboardEvent('keydown', { key: 'k', metaKey: true }),
      new KeyboardEvent('keydown', { key: 'Enter', metaKey: true }),
      new KeyboardEvent('keydown', { key: 'Escape' }),
    ];

    events.forEach((event) => {
      expect(() => document.dispatchEvent(event)).not.toThrow();
    });
  });

  it('does not call handlers for unrelated keys', () => {
    const focusChat = vi.fn();
    const sendMessage = vi.fn();
    const escape = vi.fn();

    renderHook(() => {
      useKeyboard({ focusChat, sendMessage, escape });
    });

    const event = new KeyboardEvent('keydown', { key: 'a' });
    document.dispatchEvent(event);

    expect(focusChat).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
    expect(escape).not.toHaveBeenCalled();
  });
});
