import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch for SSE service tests
global.fetch = vi.fn();

describe('sse service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSessionId', () => {
    it('should return session ID on successful response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ sessionId: 'test-session-123' }),
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const { getSessionId } = await import('./sse');
      const result = await getSessionId();

      expect(result).toBe('test-session-123');
      expect(global.fetch).toHaveBeenCalledWith('/api/chat/session', { signal: undefined });
    });

    it('should throw error on failed response', async () => {
      const mockResponse = {
        ok: false,
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const { getSessionId } = await import('./sse');
      await expect(getSessionId()).rejects.toThrow('Failed to get session');
    });

    it('should pass abort signal to fetch', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ sessionId: 'test-session-123' }),
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const abortController = new AbortController();
      const { getSessionId } = await import('./sse');
      await getSessionId(abortController.signal);

      expect(global.fetch).toHaveBeenCalledWith('/api/chat/session', { signal: abortController.signal });
    });
  });

  describe('sendAndStream', () => {
    it('should connect SSE first, then send message', async () => {
      // Mock SSE stream response (connected first)
      const mockStreamResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode('data: {"type":"message","content":"Hello"}\n\n'));
            controller.enqueue(encoder.encode('data: {"type":"complete","input_tokens":10,"output_tokens":20}\n\n'));
            controller.close();
          },
        }),
      };

      // Mock POST send response
      const mockSendResponse = { ok: true };

      // First call is SSE stream, second is POST send
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockStreamResponse)
        .mockResolvedValueOnce(mockSendResponse);

      const { sendAndStream } = await import('./sse');

      const onEvent = vi.fn();
      const onError = vi.fn();
      const onComplete = vi.fn();

      await sendAndStream('test-session', 'Hi', { onEvent, onError, onComplete });

      // Verify SSE connected first (GET), then send (POST)
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/chat/stream/test-session', expect.objectContaining({
        headers: { Accept: 'text/event-stream' },
      }));
      expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/chat/send', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'Hi', sessionId: 'test-session' }),
      }));

      expect(onEvent).toHaveBeenCalledTimes(2);
      expect(onEvent).toHaveBeenCalledWith({ type: 'message', content: 'Hello' });
      expect(onEvent).toHaveBeenCalledWith({ type: 'complete', input_tokens: 10, output_tokens: 20 });
      expect(onComplete).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle error events', async () => {
      const mockStreamResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode('data: {"type":"error","error_message":"Test error","error_code":"TEST_ERROR"}\n\n'));
            controller.close();
          },
        }),
      };
      const mockSendResponse = { ok: true };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockStreamResponse)
        .mockResolvedValueOnce(mockSendResponse);

      const { sendAndStream } = await import('./sse');

      const onEvent = vi.fn();
      const onError = vi.fn();
      const onComplete = vi.fn();

      await sendAndStream('test-session', 'Hi', { onEvent, onError, onComplete });

      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        error_message: 'Test error',
        error_code: 'TEST_ERROR',
      });
    });

    it('should throw error on stream failure', async () => {
      const mockStreamResponse = {
        ok: false,
        status: 404,
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockStreamResponse);

      const { sendAndStream } = await import('./sse');

      const onEvent = vi.fn();
      const onError = vi.fn();
      const onComplete = vi.fn();

      await sendAndStream('test-session', 'Hi', { onEvent, onError, onComplete });

      expect(onError).toHaveBeenCalled();
      const errorCall = onError.mock.calls[0];
      if (!errorCall) throw new Error('Expected error call');
      const errorArg = errorCall[0] as Error;
      expect(errorArg.message).toContain('Stream failed');
    });

    it('should throw error on send failure', async () => {
      const mockStreamResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            // Stream connected but won't get data
            setTimeout(() => {
              controller.close();
            }, 100);
          },
        }),
      };
      const mockSendResponse = {
        ok: false,
        status: 500,
      };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockStreamResponse)
        .mockResolvedValueOnce(mockSendResponse);

      const { sendAndStream } = await import('./sse');

      const onEvent = vi.fn();
      const onError = vi.fn();
      const onComplete = vi.fn();

      await sendAndStream('test-session', 'Hi', { onEvent, onError, onComplete });

      expect(onError).toHaveBeenCalled();
      const errorCall = onError.mock.calls[0];
      if (!errorCall) throw new Error('Expected error call');
      const errorArg = errorCall[0] as Error;
      expect(errorArg.message).toContain('Send failed');
    });

    it('should handle abort signal gracefully', async () => {
      const abortController = new AbortController();

      vi.mocked(global.fetch).mockImplementation(() => {
        // Simulate abort
        abortController.abort();
        const error = new Error('Aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const { sendAndStream } = await import('./sse');

      const onEvent = vi.fn();
      const onError = vi.fn();
      const onComplete = vi.fn();

      await sendAndStream('test-session', 'Hi', {
        signal: abortController.signal,
        onEvent,
        onError,
        onComplete,
      });

      // AbortError should not trigger onError, just onComplete
      expect(onError).not.toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
