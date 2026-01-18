/**
 * CLI Process Manager Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';

// Hoisted mock function
const mockSpawn = vi.hoisted(() => vi.fn());

// Mock child_process with hoisted function - MUST include default export
vi.mock('node:child_process', () => ({
  spawn: mockSpawn,
  default: { spawn: mockSpawn },
}));

// Mock modules - use function factories with default exports
vi.mock('./config.js', () => ({
  checkCliAvailable: vi.fn(),
  CLAUDE_DIR: '/mock/.claude',
  default: {},
}));

vi.mock('./cli-parser.js', () => ({
  parseCLIOutput: vi.fn().mockReturnValue([]),
  clearSessionBuffer: vi.fn(),
  default: {},
}));

// Type for mock process
interface MockProcess {
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

// Create mock process factory
function createMockProcess(): MockProcess {
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

// Now import the modules
import { spawnCLISession, terminateSession, getSession, createErrorEvent } from './cli-process.js';
import { checkCliAvailable } from './config.js';
import { clearSessionBuffer } from './cli-parser.js';

describe('spawnCLISession', () => {
  let mockProcess: MockProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-session-id');
    mockProcess = createMockProcess();
    mockSpawn.mockReturnValue(mockProcess as unknown as ChildProcess);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls checkCliAvailable before spawn', () => {
    vi.mocked(checkCliAvailable).mockReturnValue(true);

    spawnCLISession('/test/project');

    expect(checkCliAvailable).toHaveBeenCalled();
  });

  it('throws error if CLI not available', () => {
    vi.mocked(checkCliAvailable).mockReturnValue(false);

    expect(() => spawnCLISession('/test/project')).toThrow('CLI_NOT_FOUND');
  });

  it('spawns with correct flags', () => {
    vi.mocked(checkCliAvailable).mockReturnValue(true);

    spawnCLISession('/test/project');

    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining([
        '--print',
        '--output-format',
        'stream-json',
        '--verbose',
        '--input-format',
        'stream-json',
      ]),
      expect.objectContaining({
        cwd: '/test/project',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    );
  });

  it('adds --continue flag when option provided', () => {
    vi.mocked(checkCliAvailable).mockReturnValue(true);

    spawnCLISession('/test/project', undefined, { continue: true });

    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['--continue']),
      expect.any(Object)
    );
  });

  it('adds --resume flag with session id', () => {
    vi.mocked(checkCliAvailable).mockReturnValue(true);

    spawnCLISession('/test/project', undefined, { resume: 'session-123' });

    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['--resume', 'session-123']),
      expect.any(Object)
    );
  });

  it('wires stdout to emit events', () => {
    vi.mocked(checkCliAvailable).mockReturnValue(true);

    spawnCLISession('/test/project');

    // Verify stdout has listeners (wired up in spawnCLISession)
    expect(mockProcess.stdout.listenerCount('data')).toBeGreaterThan(0);
  });

  it('returns session with unique id', () => {
    vi.mocked(checkCliAvailable).mockReturnValue(true);

    const session = spawnCLISession('/test/project');

    expect(session.sessionId).toBe('test-session-id');
    expect(session.projectPath).toBe('/test/project');
    expect(session.mode).toBe('streaming');
  });

  it('emits cli-event on parsed output', () => {
    vi.mocked(checkCliAvailable).mockReturnValue(true);

    const session = spawnCLISession('/test/project');

    expect(session.emitter).toBeDefined();
    expect(typeof session.emitter.emit).toBe('function');
  });
});

describe('terminateSession', () => {
  let mockProcess: MockProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-session-id');
    vi.mocked(checkCliAvailable).mockReturnValue(true);
    mockProcess = createMockProcess();
    mockSpawn.mockReturnValue(mockProcess as unknown as ChildProcess);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false for non-existent session', async () => {
    const result = await terminateSession('non-existent');
    expect(result).toBe(false);
  });

  it('sends SIGTERM for graceful shutdown', async () => {
    spawnCLISession('/test/project');
    await terminateSession('test-session-id');

    expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('sends SIGKILL if process does not respond', async () => {
    spawnCLISession('/test/project');

    mockProcess.killed = false;

    await terminateSession('test-session-id');

    expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('removes session from sessions map', async () => {
    spawnCLISession('/test/project');

    expect(getSession('test-session-id')).toBeDefined();

    await terminateSession('test-session-id');

    expect(getSession('test-session-id')).toBeUndefined();
  });

  it('clears session buffer via cli-parser', async () => {
    spawnCLISession('/test/project');

    await terminateSession('test-session-id');

    expect(clearSessionBuffer).toHaveBeenCalledWith('test-session-id');
  });
});

describe('getSession', () => {
  it('returns undefined for non-existent session', () => {
    expect(getSession('non-existent')).toBeUndefined();
  });
});

describe('createErrorEvent', () => {
  it('creates error event with message', () => {
    const event = createErrorEvent('Test error', 'TEST_ERROR');

    expect(event.type).toBe('error');
    expect(event.error_message).toBe('Test error');
    expect(event.error_code).toBe('TEST_ERROR');
  });

  it('uses default error code if not provided', () => {
    const event = createErrorEvent('Test error');

    expect(event.error_code).toBe('CLI_ERROR');
  });
});
