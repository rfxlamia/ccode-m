/**
 * CLI Protocol Tests
 *
 * These tests mock cli-process.js to avoid spawning real CLI processes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendMessage, endInput, isStdinWritable, getMessageFormat } from './cli-protocol.js';
import type { CLISession } from '@shared/types.js';
import { createMockSession } from '../__tests__/helpers/mocks.js';

// Mock the cli-process module
const mockSessions = new Map<string, CLISession>();

// Shared mock spies for stdin methods
const mockWrite = vi.fn().mockReturnValue(true);
const mockEnd = vi.fn();
const mockOnce = vi.fn();

vi.mock('./cli-process.js', () => ({
  getSession: (sessionId: string) => mockSessions.get(sessionId),
  spawnCLISession: vi.fn(),
  terminateSession: vi.fn(),
}));

describe('sendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessions.clear();
    mockWrite.mockReturnValue(true);
  });

  afterEach(() => {
    mockSessions.clear();
  });

  it('returns false for non-existent session', () => {
    const result = sendMessage('non-existent', 'Hello');
    expect(result).toBe(false);
  });

  it('returns false if stdin is destroyed', () => {
    const session = createMockSession('test-session', { destroyed: true, mockWrite, mockEnd, mockOnce });
    mockSessions.set('test-session', session);

    const result = sendMessage('test-session', 'Hello');
    expect(result).toBe(false);
  });

  it('returns false if stdin is closed', () => {
    const session = createMockSession('test-session', { closed: true, mockWrite, mockEnd, mockOnce });
    mockSessions.set('test-session', session);

    const result = sendMessage('test-session', 'Hello');
    expect(result).toBe(false);
  });

  it('formats message as JSON for streaming mode', () => {
    const session = createMockSession('test-session', { mode: 'streaming', mockWrite, mockEnd, mockOnce });
    mockSessions.set('test-session', session);

    const result = sendMessage('test-session', 'Hello');

    expect(result).toBe(true);
    expect(mockWrite).toHaveBeenCalledWith(
      expect.stringContaining('"type":"user"'),
      'utf8'
    );
  });

  it('sends plain text for per-message mode', () => {
    const session = createMockSession('test-session', { mode: 'per-message', mockWrite, mockEnd, mockOnce });
    mockSessions.set('test-session', session);

    const result = sendMessage('test-session', 'Hello');

    expect(result).toBe(true);
    expect(mockWrite).toHaveBeenCalledWith('Hello\n', 'utf8');
  });

  it('handles backpressure by listening for drain', () => {
    mockWrite.mockReturnValueOnce(false);
    const session = createMockSession('test-session', { mockWrite, mockEnd, mockOnce });
    mockSessions.set('test-session', session);

    const result = sendMessage('test-session', 'Hello');

    expect(result).toBe(true);
    expect(mockOnce).toHaveBeenCalledWith('drain', expect.any(Function));
  });
});

describe('endInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessions.clear();
  });

  it('returns false for non-existent session', () => {
    const result = endInput('non-existent');
    expect(result).toBe(false);
  });

  it('calls stdin.end() for valid session', () => {
    const session = createMockSession('test-session', { mockWrite, mockEnd, mockOnce });
    mockSessions.set('test-session', session);

    const result = endInput('test-session');

    expect(result).toBe(true);
    expect(mockEnd).toHaveBeenCalled();
  });

  it('returns false if stdin is destroyed', () => {
    const session = createMockSession('test-session', { destroyed: true, mockWrite, mockEnd, mockOnce });
    mockSessions.set('test-session', session);

    const result = endInput('test-session');
    expect(result).toBe(false);
  });

  it('returns false if stdin is closed', () => {
    const session = createMockSession('test-session', { closed: true, mockWrite, mockEnd, mockOnce });
    mockSessions.set('test-session', session);

    const result = endInput('test-session');
    expect(result).toBe(false);
  });
});

describe('isStdinWritable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessions.clear();
  });

  it('returns false for non-existent session', () => {
    expect(isStdinWritable('non-existent')).toBe(false);
  });

  it('returns true for session with open stdin', () => {
    const session = createMockSession('test-session', { mockWrite, mockEnd, mockOnce });
    mockSessions.set('test-session', session);

    expect(isStdinWritable('test-session')).toBe(true);
  });

  it('returns false for session with destroyed stdin', () => {
    const session = createMockSession('test-session', { destroyed: true, mockWrite, mockEnd, mockOnce });
    mockSessions.set('test-session', session);

    expect(isStdinWritable('test-session')).toBe(false);
  });

  it('returns false for session with closed stdin', () => {
    const session = createMockSession('test-session', { closed: true, mockWrite, mockEnd, mockOnce });
    mockSessions.set('test-session', session);

    expect(isStdinWritable('test-session')).toBe(false);
  });
});

describe('getMessageFormat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessions.clear();
  });

  it('returns unknown for non-existent session', () => {
    expect(getMessageFormat('non-existent')).toBe('unknown');
  });

  it('returns streaming for session in streaming mode', () => {
    const session = createMockSession('test-session', { mode: 'streaming', mockWrite, mockEnd, mockOnce });
    mockSessions.set('test-session', session);

    expect(getMessageFormat('test-session')).toBe('streaming');
  });

  it('returns plain for session in per-message mode', () => {
    const session = createMockSession('test-session', { mode: 'per-message', mockWrite, mockEnd, mockOnce });
    mockSessions.set('test-session', session);

    expect(getMessageFormat('test-session')).toBe('plain');
  });
});
