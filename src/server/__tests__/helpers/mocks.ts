/**
 * Shared Test Mocks
 *
 * Reusable mock factories for CLI process testing.
 * Consolidates duplicated mock setup across test files.
 */

import { vi } from 'vitest';
import { EventEmitter } from 'node:events';
import type { CLISession } from '@shared/types.js';

// ============================================
// CHILD PROCESS MOCKS
// ============================================

/**
 * Type for mock child process used in tests.
 */
export interface MockProcess {
  stdout: EventEmitter;
  stderr: EventEmitter;
  stdin: {
    end: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
    destroyed?: boolean;
    closed?: boolean;
  };
  kill: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  killed: boolean;
}

/**
 * Create a mock child process for testing.
 * Includes all necessary streams and methods.
 *
 * @returns Mock process object with EventEmitters for stdout/stderr
 *
 * @example
 * ```ts
 * const mockProcess = createMockChildProcess();
 * mockSpawn.mockReturnValue(mockProcess as unknown as ChildProcess);
 *
 * // Simulate CLI output
 * mockProcess.stdout.emit('data', Buffer.from('{"type":"message"}\n'));
 * ```
 */
export function createMockChildProcess(): MockProcess {
  return {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    stdin: {
      end: vi.fn(),
      write: vi.fn().mockReturnValue(true),
      destroyed: false,
      closed: false,
    },
    kill: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    killed: false,
  };
}

// ============================================
// CLI SESSION MOCKS
// ============================================

/**
 * Options for creating a mock CLI session.
 */
export interface MockSessionOptions {
  destroyed?: boolean;
  closed?: boolean;
  mode?: 'streaming' | 'per-message';
  mockWrite?: ReturnType<typeof vi.fn>;
  mockEnd?: ReturnType<typeof vi.fn>;
  mockOnce?: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock CLI session for testing protocol layer.
 * Used when testing functions that operate on sessions without spawning processes.
 *
 * @param sessionId - Unique session identifier
 * @param options - Optional customization (stdin state, mode, mock spies)
 * @returns Mock CLISession object
 *
 * @example
 * ```ts
 * // Create session with default mocks
 * const session = createMockSession('test-session', { mode: 'streaming' });
 * mockSessions.set('test-session', session);
 *
 * // Test message sending
 * const result = sendMessage('test-session', 'Hello');
 * expect(result).toBe(true);
 *
 * // Use shared mocks for verification
 * const mockWrite = vi.fn().mockReturnValue(true);
 * const session2 = createMockSession('test-2', { mockWrite });
 * sendMessage('test-2', 'Hi');
 * expect(mockWrite).toHaveBeenCalledWith(expect.any(String), 'utf8');
 * ```
 */
export function createMockSession(
  sessionId: string,
  options?: MockSessionOptions
): CLISession {
  const mockWrite = options?.mockWrite ?? vi.fn().mockReturnValue(true);
  const mockEnd = options?.mockEnd ?? vi.fn();
  const mockOnce = options?.mockOnce ?? vi.fn();

  const stdin = {
    write: mockWrite,
    end: mockEnd,
    once: mockOnce,
    destroyed: options?.destroyed ?? false,
    closed: options?.closed ?? false,
  };

  return {
    process: {
      stdin,
      stdout: null,
      stderr: null,
      pid: 12345,
      kill: vi.fn(),
      killed: false,
      on: vi.fn(),
      once: vi.fn(),
    } as unknown as CLISession['process'],
    sessionId,
    projectPath: '/test',
    emitter: new EventEmitter(),
    createdAt: new Date(),
    mode: options?.mode ?? 'streaming',
  };
}

// ============================================
// FILESYSTEM MOCKS
// ============================================

/**
 * Mock filesystem state for config/settings tests.
 */
export interface MockFilesystemState {
  files: Map<string, string>;
}

/**
 * Create a mock filesystem for testing config loading.
 * Intercepts fs.promises.readFile calls to return mock data.
 *
 * @param files - Map of file paths to JSON content
 * @returns Cleanup function to restore original fs module
 *
 * @example
 * ```ts
 * const cleanup = createMockFilesystem(new Map([
 *   ['/home/.claude/config.json', '{"primaryApiKey":"test-key"}'],
 *   ['/home/.claude/settings.json', '{"model":"claude-4"}']
 * ]));
 *
 * const hasKey = await hasApiKey();
 * expect(hasKey).toBe(true);
 *
 * cleanup(); // Restore original fs
 * ```
 */
export function createMockFilesystem(files: Map<string, string>): () => void {
  vi.doMock('node:fs', () => ({
    promises: {
      readFile: (filePath: string): Promise<string> => {
        const content = files.get(filePath);
        if (!content) {
          return Promise.reject(new Error('ENOENT: no such file or directory'));
        }
        return Promise.resolve(content);
      },
    },
  }));

  return () => {
    vi.doUnmock('node:fs');
  };
}
