/**
 * CLI Protocol
 *
 * Single entry point for sending messages to CLI stdin.
 * Handles message formatting, encoding, and backpressure.
 */

import { getSession } from './cli-process.js';

// ============================================
// LOGGING
// ============================================

/**
 * Simple structured logger following Fastify/pino pattern.
 */
const log = {
  info: (data: Record<string, unknown>, msg: string): void => {
    console.log(JSON.stringify({ level: 'info', ...data, msg }));
  },
  warn: (data: Record<string, unknown>, msg: string): void => {
    console.warn(JSON.stringify({ level: 'warn', ...data, msg }));
  },
  error: (data: Record<string, unknown>, msg: string): void => {
    console.error(JSON.stringify({ level: 'error', ...data, msg }));
  },
};

// ============================================
// MESSAGE FORMATTING
// ============================================

/**
 * Format a message for streaming input mode (Option A).
 * Uses the validated format from Task 0.
 *
 * @param message - The user's message text
 * @returns JSON string for stdin
 */
function formatStreamingMessage(message: string): string {
  const payload = {
    type: 'user',
    message: {
      role: 'user',
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    },
  };
  return JSON.stringify(payload);
}

// ============================================
// SEND MESSAGE
// ============================================

/**
 * Send a message to a CLI session via stdin.
 * Single entry point - all sends go through this function.
 *
 * @param sessionId - The session to send to
 * @param message - The message content
 * @returns true if message was queued successfully
 */
export function sendMessage(sessionId: string, message: string): boolean {
  const session = getSession(sessionId);

  if (!session) {
    log.warn({ sessionId }, 'Session not found for sendMessage');
    return false;
  }

  const stdin = session.process.stdin;

  if (!stdin || stdin.destroyed || stdin.closed) {
    log.warn({ sessionId }, 'stdin not available for sendMessage');
    return false;
  }

  // Format message based on session mode
  const payload = session.mode === 'streaming'
    ? formatStreamingMessage(message)
    : message; // Per-message mode uses plain text

  try {
    const written = stdin.write(payload + '\n', 'utf8');

    if (!written) {
      // Handle backpressure - wait for drain event
      log.info({ sessionId }, 'Backpressure: waiting for stdin drain');
      stdin.once('drain', () => {
        log.info({ sessionId }, 'Backpressure resolved: stdin drained');
      });
    }

    log.info({ sessionId, mode: session.mode, length: message.length }, 'Message sent');
    return true;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    log.error({ sessionId, error: errorMessage }, 'Failed to send message');
    return false;
  }
}

// ============================================
// END INPUT
// ============================================

/**
 * Signal end of input for a session.
 * Used when switching modes or closing stdin.
 *
 * @param sessionId - The session to end input for
 * @returns true if stdin was ended
 */
export function endInput(sessionId: string): boolean {
  const session = getSession(sessionId);

  if (!session) {
    log.warn({ sessionId }, 'Session not found for endInput');
    return false;
  }

  const stdin = session.process.stdin;

  if (!stdin || stdin.destroyed || stdin.closed) {
    log.warn({ sessionId }, 'stdin not available for endInput');
    return false;
  }

  try {
    stdin.end();
    log.info({ sessionId }, 'stdin ended');
    return true;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    log.error({ sessionId, error: errorMessage }, 'Failed to end stdin');
    return false;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if a session's stdin is writable.
 */
export function isStdinWritable(sessionId: string): boolean {
  const session = getSession(sessionId);
  if (!session) return false;

  const stdin = session.process.stdin;
  return Boolean(stdin && !stdin.destroyed && !stdin.closed);
}

/**
 * Get the message format for a session's mode.
 */
export function getMessageFormat(sessionId: string): 'streaming' | 'plain' | 'unknown' {
  const session = getSession(sessionId);
  if (!session) return 'unknown';

  return session.mode === 'streaming' ? 'streaming' : 'plain';
}
