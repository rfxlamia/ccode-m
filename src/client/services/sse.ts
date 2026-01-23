import type { SSEEvent } from '@shared/types';

interface StreamOptions {
  onEvent: (event: SSEEvent) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
  signal?: AbortSignal;
}

interface SessionResponse {
  sessionId: string;
}

/**
 * Send message and stream SSE response
 * Pattern: Connect SSE first → Send message → Receive events
 *
 * CRITICAL: SSE must connect BEFORE sending message to avoid race condition
 * where events are emitted before the stream listener is attached.
 */
export async function sendAndStream(
  sessionId: string,
  message: string,
  options: StreamOptions
): Promise<void> {
  const { onEvent, onError, onComplete, signal } = options;

  try {
    // 1. Connect to SSE stream FIRST (before sending message)
    const streamResponse = await fetch(`/api/chat/stream/${sessionId}`, {
      headers: { Accept: 'text/event-stream' },
      ...(signal && { signal }),
    });

    if (!streamResponse.ok || !streamResponse.body) {
      throw new Error(`Stream failed: ${String(streamResponse.status)}`);
    }

    // 2. NOW send message via non-blocking endpoint
    const sendResponse = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId }),
      ...(signal && { signal }),
    });

    if (!sendResponse.ok) {
      throw new Error(`Send failed: ${String(sendResponse.status)}`);
    }

    // 3. Read SSE stream
    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const result = await reader.read();
        if (result.done) break;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (result.value) {
          buffer += decoder.decode(result.value, { stream: true });
        }

        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const event = JSON.parse(line.slice(6)) as SSEEvent;
            onEvent(event);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    onComplete();
  } catch (error) {
    // Don't report AbortError as an error (it's intentional cancellation)
    if (error instanceof Error && error.name === 'AbortError') {
      onComplete();
      return;
    }
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Fetch session ID from server
 */
export async function getSessionId(signal?: AbortSignal): Promise<string> {
  const response = await fetch('/api/chat/session', {
    ...(signal && { signal }),
  });
  if (!response.ok) {
    throw new Error('Failed to get session');
  }
  const data = (await response.json()) as SessionResponse;
  return data.sessionId;
}

/**
 * Reset session (clear conversation).
 * Terminates current CLI session and spawns a new one.
 * @returns New session ID
 * @throws Error if reset fails
 */
export async function resetSession(signal?: AbortSignal): Promise<string> {
  const response = await fetch('/api/chat/session', {
    method: 'DELETE',
    ...(signal && { signal }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: 'Unknown error' }))) as {
      error: string;
    };
    throw new Error(errorData.error || `Reset failed: ${String(response.status)}`);
  }

  const data = (await response.json()) as SessionResponse;
  return data.sessionId;
}
