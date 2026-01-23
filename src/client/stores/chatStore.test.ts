import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatStore } from './chatStore';

// Mock sse module
vi.mock('@/services/sse', () => ({
  resetSession: vi.fn(),
}));

describe('useChatStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useChatStore.setState({
        messages: [],
        isStreaming: false,
        isResetting: false,
        sessionId: null,
        error: null,
        isAtBottom: true,
      });
    });
  });

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useChatStore());
    expect(result.current.messages).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.sessionId).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isAtBottom).toBe(true);
    expect(result.current.isResetting).toBe(false);
  });

  it('should add a message', () => {
    const { result } = renderHook(() => useChatStore());
    const testMessage = {
      id: 'test-1',
      role: 'user' as const,
      content: 'Hello',
      timestamp: new Date(),
    };

    act(() => {
      result.current.addMessage(testMessage);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toEqual(testMessage);
  });

  it('should append content to the last assistant message', () => {
    const { result } = renderHook(() => useChatStore());

    // Add user and assistant messages
    act(() => {
      result.current.addMessage({
        id: 'user-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      });
      result.current.addMessage({
        id: 'assistant-1',
        role: 'assistant',
        content: 'Hi',
        timestamp: new Date(),
      });
    });

    // Append to last assistant message
    act(() => {
      result.current.appendToLastMessage(' there');
    });

    const message = result.current.messages[1];
    if (!message) throw new Error('Expected message to exist');
    expect(message.content).toBe('Hi there');
  });

  it('should not append to user message', () => {
    const { result } = renderHook(() => useChatStore());

    act(() => {
      result.current.addMessage({
        id: 'user-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      });
    });

    act(() => {
      result.current.appendToLastMessage(' extra');
    });

    const userMessage = result.current.messages[0];
    if (!userMessage) throw new Error('Expected user message to exist');
    expect(userMessage.content).toBe('Hello');
  });

  it('should finalize last message', () => {
    const { result } = renderHook(() => useChatStore());

    act(() => {
      result.current.addMessage({
        id: 'assistant-1',
        role: 'assistant',
        content: 'Response',
        timestamp: new Date(),
        isStreaming: true,
      });
    });

    act(() => {
      result.current.finalizeLastMessage({
        input_tokens: 10,
        output_tokens: 20,
      });
    });

    const finalizedMessage = result.current.messages[0];
    if (!finalizedMessage) throw new Error('Expected finalized message to exist');
    expect(finalizedMessage.isStreaming).toBe(false);
    expect(finalizedMessage.usage).toEqual({
      input_tokens: 10,
      output_tokens: 20,
    });
  });

  it('should update streaming state', () => {
    const { result } = renderHook(() => useChatStore());

    act(() => {
      result.current.setStreaming(true);
    });

    expect(result.current.isStreaming).toBe(true);

    act(() => {
      result.current.setStreaming(false);
    });

    expect(result.current.isStreaming).toBe(false);
  });

  describe('isResetting state', () => {
    it('defaults to false', () => {
      const { result } = renderHook(() => useChatStore());
      expect(result.current.isResetting).toBe(false);
    });

    it('updates via setResetting', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.setResetting(true);
      });
      expect(result.current.isResetting).toBe(true);

      act(() => {
        result.current.setResetting(false);
      });
      expect(result.current.isResetting).toBe(false);
    });
  });

  it('should update session ID', () => {
    const { result } = renderHook(() => useChatStore());

    act(() => {
      result.current.setSessionId('test-session-123');
    });

    expect(result.current.sessionId).toBe('test-session-123');
  });

  it('should update error', () => {
    const { result } = renderHook(() => useChatStore());

    act(() => {
      result.current.setError('Connection failed');
    });

    expect(result.current.error).toBe('Connection failed');

    act(() => {
      result.current.setError(null);
    });

    expect(result.current.error).toBe(null);
  });

  it('should clear all messages', () => {
    const { result } = renderHook(() => useChatStore());

    act(() => {
      result.current.addMessage({
        id: '1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      });
      result.current.addMessage({
        id: '2',
        role: 'assistant',
        content: 'Hi',
        timestamp: new Date(),
      });
    });

    expect(result.current.messages).toHaveLength(2);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
  });

  it('should update scroll state', () => {
    const { result } = renderHook(() => useChatStore());

    act(() => {
      result.current.setIsAtBottom(false);
    });

    expect(result.current.isAtBottom).toBe(false);

    act(() => {
      result.current.setIsAtBottom(true);
    });

    expect(result.current.isAtBottom).toBe(true);
  });
});

describe('clearSession async action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useChatStore.setState({
        messages: [
          { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
          { id: '2', role: 'assistant', content: 'Hi', timestamp: new Date() },
        ],
        sessionId: 'old-session-123',
        isStreaming: false,
        isResetting: false,
        error: null,
        isAtBottom: false,
      });
    });
  });

  it('should clear session successfully and reset all state', async () => {
    const { resetSession } = await import('@/services/sse');
    vi.mocked(resetSession).mockResolvedValue('new-session-456');

    const { result } = renderHook(() => useChatStore());

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.sessionId).toBe('old-session-123');

    await act(async () => {
      await result.current.clearSession();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.sessionId).toBe('new-session-456');
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.isAtBottom).toBe(true);
    expect(result.current.isResetting).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should set isResetting to true during reset', async () => {
    const { resetSession } = await import('@/services/sse');
    let resolveReset: (value: string) => void;
    const resetPromise = new Promise<string>((resolve) => {
      resolveReset = resolve;
    });
    vi.mocked(resetSession).mockReturnValue(resetPromise);

    const { result } = renderHook(() => useChatStore());

    // Start clearSession but don't await yet
    let clearPromise: Promise<void>;
    act(() => {
      clearPromise = result.current.clearSession();
    });

    // isResetting should be true while waiting
    expect(result.current.isResetting).toBe(true);

    // Resolve the reset
    await act(async () => {
      resolveReset('new-session-789');
      await clearPromise;
    });

    // isResetting should be false after completion
    expect(result.current.isResetting).toBe(false);
  });

  it('should handle error and set error state', async () => {
    const { resetSession } = await import('@/services/sse');
    vi.mocked(resetSession).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useChatStore());

    await act(async () => {
      await result.current.clearSession();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.isResetting).toBe(false);
    // Messages should NOT be cleared on error
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.sessionId).toBe('old-session-123');
  });

  it('should handle non-Error exceptions', async () => {
    const { resetSession } = await import('@/services/sse');
    vi.mocked(resetSession).mockRejectedValue('String error');

    const { result } = renderHook(() => useChatStore());

    await act(async () => {
      await result.current.clearSession();
    });

    expect(result.current.error).toBe('Failed to reset session');
    expect(result.current.isResetting).toBe(false);
  });
});
