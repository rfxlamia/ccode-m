import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatStore } from './chatStore';

describe('useChatStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useChatStore.setState({
        messages: [],
        isStreaming: false,
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

    expect(result.current.messages[1].content).toBe('Hi there');
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

    expect(result.current.messages[0].content).toBe('Hello');
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

    expect(result.current.messages[0].isStreaming).toBe(false);
    expect(result.current.messages[0].usage).toEqual({
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
