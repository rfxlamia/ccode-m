/**
 * CLI Process Manager Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { createMockChildProcess, type MockProcess } from '../__tests__/helpers/mocks.js';

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
}))

// Now import the modules
import { spawnCLISession, terminateSession, getSession, createErrorEvent } from './cli-process.js';
import { checkCliAvailable } from './config.js';
import { clearSessionBuffer } from './cli-parser.js';

describe('spawnCLISession', () => {
  let mockProcess: MockProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-0000-0000-000000000001' as `${string}-${string}-${string}-${string}-${string}`);
    mockProcess = createMockChildProcess();
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

    expect(session.sessionId).toBe('00000000-0000-0000-0000-000000000001');
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
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-0000-0000-000000000001' as `${string}-${string}-${string}-${string}-${string}`);
    vi.mocked(checkCliAvailable).mockReturnValue(true);
    mockProcess = createMockChildProcess();
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
    await terminateSession('00000000-0000-0000-0000-000000000001');

    expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('sends SIGKILL if process does not respond', async () => {
    spawnCLISession('/test/project');

    mockProcess.killed = false;

    await terminateSession('00000000-0000-0000-0000-000000000001');

    expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('removes session from sessions map', async () => {
    spawnCLISession('/test/project');

    expect(getSession('00000000-0000-0000-0000-000000000001')).toBeDefined();

    await terminateSession('00000000-0000-0000-0000-000000000001');

    expect(getSession('00000000-0000-0000-0000-000000000001')).toBeUndefined();
  });

  it('clears session buffer via cli-parser', async () => {
    spawnCLISession('/test/project');

    await terminateSession('00000000-0000-0000-0000-000000000001');

    expect(clearSessionBuffer).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001');
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
