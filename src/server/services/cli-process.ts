/**
 * CLI Process Manager
 *
 * Spawns and manages Claude CLI subprocesses for the GUI server.
 * Single source of truth for CLI session lifecycle.
 */

import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { checkCliAvailable } from './config.js';
import { parseCLIOutput, clearSessionBuffer } from './cli-parser.js';
import type { CLISession, SpawnOptions } from '@shared/types.js';

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
// SESSION TRACKING
// ============================================

/**
 * Active CLI sessions - maps sessionId to session data.
 * Buffers are managed by cli-parser.ts (single source of truth).
 */
const sessions = new Map<string, CLISession>();

// ============================================
// SPAWN
// ============================================

/**
 * Spawn a new Claude CLI session.
 *
 * @param projectPath - Working directory for the CLI
 * @param sessionId - Optional session ID (generated if not provided)
 * @param options - Spawn options (continue/resume flags)
 * @returns CLISession
 * @throws Error if CLI is not available or spawn fails
 */
export function spawnCLISession(
  projectPath: string,
  sessionId?: string,
  options?: SpawnOptions
): CLISession {
  // 1. Check CLI available FIRST - fail fast if unavailable
  if (!checkCliAvailable()) {
    const error = new Error('CLI_NOT_FOUND: Claude CLI not available');
    log.error({ projectPath }, error.message);
    throw error;
  }

  const id = sessionId || crypto.randomUUID();

  // 2. Build CLI arguments
  const args = ['--print', '--output-format', 'stream-json', '--verbose'];

  // Option A: Use streaming input if validated (Task 0 complete)
  args.push('--input-format', 'stream-json');

  // Option B: Session continuity flags
  if (options?.continue) {
    args.push('--continue');
  } else if (options?.resume) {
    args.push('--resume', options.resume);
  }

  // 3. Spawn the process
  const cliProcess = spawn('claude', args, {
    cwd: projectPath,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  // 4. Create session object
  const session: CLISession = {
    process: cliProcess,
    sessionId: id,
    projectPath,
    emitter: new EventEmitter(),
    createdAt: new Date(),
    mode: 'streaming', // Using streaming mode per Task 0 validation
  };

  // 5. Wire stdout to parser → emitter
  cliProcess.stdout.on('data', (data: Buffer) => {
    const events = parseCLIOutput(id, data);
    for (const event of events) {
      session.emitter.emit('cli-event', event);
    }
  });

  // 6. Handle stderr for error events - emit as SSE error
  cliProcess.stderr.on('data', (data: Buffer) => {
    const stderrText = data.toString('utf8').trim();
    if (stderrText) {
      log.warn({ sessionId: id, stderr: stderrText }, 'CLI stderr');
      // Emit as SSE error event per AC #6
      session.emitter.emit('cli-event', createErrorEvent(stderrText, 'CLI_STDERR'));
    }
  });

  // 7. Handle process errors (ENOENT, EACCES, etc.) - emit as SSE error
  cliProcess.on('error', (err: NodeJS.ErrnoException) => {
    let errorCode = 'CLI_ERROR';

    // Specific error handling per AC #6
    if (err.code === 'ENOENT') {
      errorCode = 'CLI_NOT_FOUND';
      log.error({ sessionId: id, error: err.message }, 'Claude CLI executable not found');
    } else if (err.code === 'EACCES') {
      errorCode = 'CLI_PERMISSION_DENIED';
      log.error({ sessionId: id, error: err.message }, 'Permission denied to execute Claude CLI');
    } else {
      log.error({ sessionId: id, error: err.message, code: err.code }, 'CLI process error');
    }

    // Emit as SSE error event per AC #6
    session.emitter.emit('cli-event', createErrorEvent(err.message, errorCode));
    session.emitter.emit('cli-error', err);
  });

  // 8. Handle process exit - emit error for non-zero exit
  cliProcess.on('exit', (code, signal) => {
    log.info({ sessionId: id, code, signal }, 'CLI process exited');

    // Non-zero exit code = error per AC #6
    if (code !== null && code !== 0) {
      session.emitter.emit('cli-event', createErrorEvent(
        `CLI exited with code ${String(code)}`,
        'CLI_EXIT_ERROR'
      ));
    }

    session.emitter.emit('cli-exit', { code, signal });
    // Note: Session is removed by terminateSession, not on exit
  });

  // 9. Store session
  sessions.set(id, session);
  log.info({ sessionId: id, projectPath, mode: session.mode }, 'CLI session spawned');

  return session;
}

// ============================================
// SESSION ACCESS
// ============================================

/**
 * Get an active CLI session by ID.
 */
export function getSession(sessionId: string): CLISession | undefined {
  return sessions.get(sessionId);
}

/**
 * Get all active session IDs.
 */
export function getActiveSessionIds(): string[] {
  return Array.from(sessions.keys());
}

// ============================================
// TERMINATE
// ============================================

/**
 * Terminate a CLI session gracefully.
 * Uses SIGTERM → timeout → SIGKILL pattern.
 *
 * @param sessionId - The session to terminate
 * @returns true if session was found and terminated
 */
export async function terminateSession(sessionId: string): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session) {
    log.warn({ sessionId }, 'Attempted to terminate non-existent session');
    return false;
  }

  const { process } = session;

  // 1. Clear buffer in cli-parser.ts (single source of truth for buffers)
  clearSessionBuffer(sessionId);

  // 2. Send SIGTERM for graceful shutdown
  if (!process.killed) {
    process.kill('SIGTERM');
  }

  // 3. Wait up to 1 second for graceful termination
  const gracefulTimeout = 1000;

  await new Promise<void>((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve();
    }, gracefulTimeout);

    process.once('exit', () => {
      clearTimeout(timeoutId);
      resolve();
    });
  });

  // 4. Force SIGKILL if still running
  if (!process.killed) {
    log.warn({ sessionId }, 'CLI did not respond to SIGTERM, sending SIGKILL');
    process.kill('SIGKILL');
  }

  // 5. Clean up session from map
  sessions.delete(sessionId);
  log.info({ sessionId }, 'CLI session terminated');

  return true;
}

/**
 * Terminate all active sessions (for server shutdown).
 */
export async function terminateAllSessions(): Promise<void> {
  const sessionIds = Array.from(sessions.keys());
  await Promise.all(sessionIds.map((id) => terminateSession(id)));
}

// ============================================
// ERROR HELPERS
// ============================================

/**
 * Create an error SSE event from a process error.
 */
export function createErrorEvent(
  errorMessage: string,
  errorCode: string = 'CLI_ERROR'
): { type: 'error'; error_message: string; error_code: string } {
  return {
    type: 'error',
    error_message: errorMessage,
    error_code: errorCode,
  };
}
