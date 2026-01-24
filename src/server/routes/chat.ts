/**
 * Chat Routes - Epic 1 Infrastructure Validation
 *
 * Simple validation endpoint for testing CLI infrastructure.
 * Single shared session pattern (Option A - conversation continuity).
 */

import type { FastifyPluginCallback } from 'fastify';
import { getSession, terminateSession, spawnCLISession } from '../services/cli-process.js';
import { sendMessage } from '../services/cli-protocol.js';
import type { SSEEvent } from '@shared/types.js';
import { isKnownTool, MAX_TOOL_NAME_LENGTH } from '@shared/constants.js';
import { log } from '../utils/logger.js';

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
   * DELETE /api/chat/session
   * Reset the global session (clear conversation).
   */
  server.delete('/api/chat/session', async (_request, reply) => {
    const indexModule = await import('../index.js') as {
      resetGlobalSession: () => Promise<string | null>;
    };

    const newSessionId = await indexModule.resetGlobalSession();

    if (newSessionId === null) {
      log.error({}, 'Failed to reset session');
      return await reply.status(500).send({ error: 'Failed to reset CLI session' });
    }

    log.info({ newSessionId }, 'Session reset successfully');
    return await reply.send({ sessionId: newSessionId });
  });

  /**
   * POST /api/chat/restart
   * Restart session with resume + allowedTools for permission retry flow.
   * Terminates current session and spawns new one with preserved conversation.
   */
  server.post<{
    Body: { sessionId?: string; allowedTools?: unknown };
  }>('/api/chat/restart', async (request, reply) => {
    const { sessionId, allowedTools } = request.body;

    // Validation (runtime check - request body could be malformed)
    if (!sessionId || typeof sessionId !== 'string') {
      return await reply.status(400).send({ error: 'sessionId is required' });
    }
    if (!allowedTools || !Array.isArray(allowedTools)) {
      return await reply.status(400).send({ error: 'allowedTools is required' });
    }

    // F3 FIX: Validate allowedTools array to prevent command injection
    if (allowedTools.length > 20) {
      return await reply.status(400).send({ error: 'allowedTools exceeds maximum allowed (20)' });
    }

    // Validate each tool name
    const invalidTools: string[] = [];
    const sanitizedTools: string[] = [];
    for (const tool of allowedTools) {
      // Must be string
      if (typeof tool !== 'string') {
        return await reply.status(400).send({ error: 'allowedTools must contain only strings' });
      }
      // Length check (prevents DoS)
      if (tool.length > MAX_TOOL_NAME_LENGTH) {
        return await reply.status(400).send({ error: `Tool name exceeds maximum length (${String(MAX_TOOL_NAME_LENGTH)})` });
      }
      // Must match alphanumeric pattern (no special chars that could be CLI flags)
      if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(tool)) {
        return await reply.status(400).send({ error: `Invalid tool name format: ${tool}` });
      }
      // Check if known tool (MCP tools are allowed but logged as warning)
      if (!isKnownTool(tool)) {
        log.warn({ tool }, 'Unknown tool in allowedTools (MCP or new tool)');
        invalidTools.push(tool);
      }
      // Add to sanitized list (dedupe)
      if (!sanitizedTools.includes(tool)) {
        sanitizedTools.push(tool);
      }
    }

    // Get current session to retrieve projectPath
    const session = getSession(sessionId);
    if (!session) {
      log.error({ sessionId }, 'Session not found for restart');
      return await reply.status(404).send({ error: 'Session not found' });
    }

    const projectPath = session.projectPath;

    // Terminate current session (F11 FIX: using static import)
    const terminated = await terminateSession(sessionId);
    if (!terminated) {
      log.error({ sessionId }, 'Failed to terminate session for restart');
      return await reply.status(500).send({ error: 'Failed to terminate session' });
    }

    // Spawn new session with resume + allowedTools (F11 FIX: using static import)
    const newSession = spawnCLISession(projectPath, undefined, {
      resume: sessionId,  // Restore conversation
      allowedTools: sanitizedTools,  // Apply sanitized permissions
    });

    // F5 FIX: Update global session with full CLISession object
    const { setGlobalSession } = await import('../index.js');
    setGlobalSession(newSession);

    log.info({ oldSessionId: sessionId, newSessionId: newSession.sessionId, allowedTools: sanitizedTools }, 'Session restarted with permissions');

    return await reply.send({ sessionId: newSession.sessionId });
  });

  /**
   * POST /api/chat/send
   * Send message to CLI session (non-blocking, for SSE streaming).
   * Returns immediately after message is sent, events come via SSE stream.
   */
  server.post<{
    Body: { message: string; sessionId: string };
  }>('/api/chat/send', async (request, reply) => {
    const { message, sessionId } = request.body;

    // Validation
    if (!message || !message.trim()) {
      return await reply.status(400).send({ error: 'message is required' });
    }
    if (!sessionId) {
      return await reply.status(400).send({ error: 'sessionId is required' });
    }

    // Get session
    const session = getSession(sessionId);
    if (!session) {
      log.error({ sessionId }, 'Session not found');
      return await reply.status(404).send({ error: 'Session not found' });
    }

    // Send message to CLI (non-blocking)
    const sent = sendMessage(sessionId, message);
    if (!sent) {
      log.error({ sessionId, message }, 'Failed to send message to CLI');
      return await reply.status(500).send({ error: 'Failed to send message to CLI' });
    }

    log.info({ sessionId, message: message.substring(0, 50) }, 'Message sent to CLI (non-blocking)');
    return await reply.send({ success: true, sessionId });
  });

  /**
   * POST /api/chat
   * Send message to shared CLI session and wait for complete response.
   * (Legacy blocking endpoint - use /api/chat/send + SSE for streaming)
   */
  server.post<{
    Body: { message: string; sessionId: string };
  }>('/api/chat', async (request, reply) => {
    const { message, sessionId } = request.body;

    // Validation: message required
    if (!message || !message.trim()) {
      return await reply.status(400).send({ error: 'message is required' });
    }

    // Validation: sessionId required (global session provided by server)
    if (!sessionId) {
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
      // F13 FIX: Sanitize error messages - don't expose internal details
      const rawMessage = error instanceof Error ? error.message : 'Unknown error';
      // Only expose safe error messages, hide internal paths/stack traces
      const safeMessage = rawMessage.includes('/') || rawMessage.includes('\\')
        ? 'Internal server error'
        : rawMessage.substring(0, 200);  // Length limit
      log.error({ sessionId, error: rawMessage }, 'Error processing chat request');
      return await reply.status(500).send({ error: safeMessage });
    } finally {
      // Fix F7: Decrement counter when request completes
      indexModule.decrementActiveRequests();
    }
  });

  /**
   * GET /api/chat/stream/:sessionId
   * SSE endpoint - streams CLI events to frontend in real-time
   */
  server.get<{ Params: { sessionId: string } }>(
    '/api/chat/stream/:sessionId',
    async (request, reply) => {
      const { sessionId } = request.params;

      // Import getGlobalSession from index.ts
      const indexModule = await import('../index.js') as {
        getGlobalSession: () => { sessionId: string } | null;
        incrementActiveRequests: () => void;
        decrementActiveRequests: () => void;
      };

      // Validate session exists
      const globalSession = indexModule.getGlobalSession();
      if (!globalSession) {
        return await reply.status(503).send({ error: 'CLI session not ready' });
      }

      // Verify sessionId matches global session
      if (globalSession.sessionId !== sessionId) {
        return await reply.status(403).send({ error: 'Invalid session ID' });
      }

      // Get session from cli-process.ts
      const session = getSession(sessionId);
      if (!session) {
        return await reply.status(404).send({ error: 'Session not found' });
      }

      // Increment active requests for graceful shutdown
      indexModule.incrementActiveRequests();

      // Set SSE headers for streaming
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering for real-time
      });

      // CRITICAL: Flush headers immediately with SSE comment
      // Without this, headers are queued but not sent until first write,
      // causing deadlock: frontend waits for headers, server waits for events
      reply.raw.write(':ok\n\n');

      // Track if stream has ended for cleanup
      let streamEnded = false;

      // SSE keepalive heartbeat to prevent proxy/browser timeouts
      const heartbeatInterval = setInterval(() => {
        if (!streamEnded) {
          reply.raw.write(':heartbeat\n\n');
        }
      }, 15000); // Every 15 seconds

      const endStream = (): void => {
        if (streamEnded) return;
        streamEnded = true;
        cleanup();
        reply.raw.end();
      };

      // Forward CLI events to SSE stream
      const eventHandler = (event: SSEEvent): void => {
        if (streamEnded) return;
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);

        // End stream on complete or error
        if (event.type === 'complete' || event.type === 'error') {
          endStream();
        }
      };

      // Cleanup function to remove listeners, clear heartbeat, and decrement counter
      const cleanup = (): void => {
        clearInterval(heartbeatInterval);
        session.emitter.off('cli-event', eventHandler);
        indexModule.decrementActiveRequests();
      };

      // Register event listener
      session.emitter.on('cli-event', eventHandler);

      // Cleanup on client disconnect
      request.raw.on('close', () => {
        if (!streamEnded) {
          endStream();
        }
      });
    }
  );

  done();
};
