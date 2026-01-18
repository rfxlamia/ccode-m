/**
 * Chat Routes - Epic 1 Infrastructure Validation
 *
 * Simple validation endpoint for testing CLI infrastructure.
 * Single shared session pattern (Option A - conversation continuity).
 */

import type { FastifyPluginCallback } from 'fastify';
import { getSession } from '../services/cli-process.js';
import { sendMessage } from '../services/cli-protocol.js';
import type { SSEEvent } from '@shared/types.js';

// ============================================
// LOGGING
// ============================================

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
// ROUTE HANDLER
// ============================================

export const chatRoutes: FastifyPluginCallback = (server, _opts, done) => {
  /**
   * GET /api/chat/session
   * Get the global session ID.
   */
  server.get('/api/chat/session', async (_request, reply) => {
    // Import getGlobalSession from index.ts
    const indexModule = await import('../index.js') as { getGlobalSession: () => { sessionId: string } | null };
    const session = indexModule.getGlobalSession();

    if (session === null) {
      return await reply.status(503).send({ error: 'CLI session not ready' });
    }

    return await reply.send({ sessionId: session.sessionId });
  });

  /**
   * POST /api/chat
   * Send message to shared CLI session and wait for complete response.
   */
  server.post<{
    Body: { message: string; sessionId: string };
  }>('/api/chat', async (request, reply) => {
    const { message, sessionId } = request.body;

    // Validation: message required
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return await reply.status(400).send({ error: 'message is required' });
    }

    // Validation: sessionId required (global session provided by server)
    if (!sessionId || typeof sessionId !== 'string') {
      return await reply.status(400).send({ error: 'sessionId is required' });
    }

    // Fix F7: Track active requests for graceful shutdown (after validation)
    const indexModule = await import('../index.js') as {
      incrementActiveRequests: () => void;
      decrementActiveRequests: () => void;
    };
    indexModule.incrementActiveRequests();

    try {
      // Get session from cli-process.ts
      const session = getSession(sessionId);
      if (!session) {
        log.error({ sessionId }, 'Session not found');
        return await reply.status(404).send({ error: 'Session not found' });
      }

      // Send message to CLI
      const sent = sendMessage(sessionId, message);
      if (!sent) {
        log.error({ sessionId, message }, 'Failed to send message to CLI');
        return await reply.status(500).send({ error: 'Failed to send message to CLI' });
      }

      log.info({ sessionId, message: message.substring(0, 50) }, 'Message sent to CLI');

      // Collect CLI response events until 'complete' or 'error'
      const responseEvents: SSEEvent[] = [];
      const timeoutMs = 30_000; // 30 second timeout

      const responsePromise = new Promise<{ reply: string; sessionId: string }>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error('CLI response timeout (30s)'));
        }, timeoutMs);

        // Fix F2: Cleanup on client disconnect to prevent memory leak
        const abortHandler = (): void => {
          cleanup();
          reject(new Error('Client disconnected'));
        };
        request.raw.on('close', abortHandler);

        const eventHandler = (event: SSEEvent): void => {
          responseEvents.push(event);

          // Collect assistant messages
          if (event.type === 'message') {
            // Continue collecting
          } else if (event.type === 'complete') {
            cleanup();
            clearTimeout(timeoutId);

            // Extract text from all message events
            const replyText = responseEvents
              .filter((e): e is Extract<SSEEvent, { type: 'message' }> => e.type === 'message')
              .map((e) => e.content)
              .join('');

            resolve({ reply: replyText, sessionId });
          } else if (event.type === 'error') {
            cleanup();
            clearTimeout(timeoutId);
            reject(new Error(event.error_message));
          }
        };

        const errorHandler = (err: Error): void => {
          cleanup();
          clearTimeout(timeoutId);
          reject(err);
        };

        const cleanup = (): void => {
          session.emitter.off('cli-event', eventHandler);
          session.emitter.off('cli-error', errorHandler);
          request.raw.off('close', abortHandler);
        };

        session.emitter.on('cli-event', eventHandler);
        session.emitter.on('cli-error', errorHandler);
      });

      const result = await responsePromise;
      log.info({ sessionId, replyPreview: result.reply.substring(0, 50) }, 'CLI response received');

      return await reply.send(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error({ sessionId, error: errorMessage }, 'Error processing chat request');
      return await reply.status(500).send({ error: errorMessage });
    } finally {
      // Fix F7: Decrement counter when request completes
      indexModule.decrementActiveRequests();
    }
  });

  done();
};
