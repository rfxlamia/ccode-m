/**
 * Logger utility tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log } from './logger.js';

interface LogOutput {
  level: string;
  msg: string;
  sessionId?: string;
  code?: string;
  error?: string;
  userId?: string;
  action?: string;
  metadata?: { nested: boolean };
}

describe('log', () => {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  beforeEach(() => {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe('info', () => {
    it('logs info level with JSON format', () => {
      log.info({ sessionId: 'test-123' }, 'Test message');

      expect(console.log).toHaveBeenCalledTimes(1);
      const mockFn = console.log as ReturnType<typeof vi.fn>;
      const output = mockFn.mock.calls[0][0] as string;
      const parsed = JSON.parse(output) as LogOutput;

      expect(parsed.level).toBe('info');
      expect(parsed.sessionId).toBe('test-123');
      expect(parsed.msg).toBe('Test message');
    });

    it('handles empty data object', () => {
      log.info({}, 'Empty data');

      const mockFn = console.log as ReturnType<typeof vi.fn>;
      const output = mockFn.mock.calls[0][0] as string;
      const parsed = JSON.parse(output) as LogOutput;

      expect(parsed.level).toBe('info');
      expect(parsed.msg).toBe('Empty data');
    });
  });

  describe('warn', () => {
    it('logs warn level with JSON format', () => {
      log.warn({ code: 'WARN_001' }, 'Warning message');

      expect(console.warn).toHaveBeenCalledTimes(1);
      const mockFn = console.warn as ReturnType<typeof vi.fn>;
      const output = mockFn.mock.calls[0][0] as string;
      const parsed = JSON.parse(output) as LogOutput;

      expect(parsed.level).toBe('warn');
      expect(parsed.code).toBe('WARN_001');
      expect(parsed.msg).toBe('Warning message');
    });
  });

  describe('error', () => {
    it('logs error level with JSON format', () => {
      log.error({ error: 'Something failed' }, 'Error message');

      expect(console.error).toHaveBeenCalledTimes(1);
      const mockFn = console.error as ReturnType<typeof vi.fn>;
      const output = mockFn.mock.calls[0][0] as string;
      const parsed = JSON.parse(output) as LogOutput;

      expect(parsed.level).toBe('error');
      expect(parsed.error).toBe('Something failed');
      expect(parsed.msg).toBe('Error message');
    });
  });

  describe('data merging', () => {
    it('merges multiple data fields', () => {
      log.info(
        { sessionId: 'sess-1', userId: 'user-1', action: 'test' },
        'Multiple fields'
      );

      const mockFn = console.log as ReturnType<typeof vi.fn>;
      const output = mockFn.mock.calls[0][0] as string;
      const parsed = JSON.parse(output) as LogOutput;

      expect(parsed.level).toBe('info');
      expect(parsed.sessionId).toBe('sess-1');
      expect(parsed.userId).toBe('user-1');
      expect(parsed.action).toBe('test');
      expect(parsed.msg).toBe('Multiple fields');
    });

    it('handles nested objects in data', () => {
      log.info({ metadata: { nested: true } }, 'Nested data');

      const mockFn = console.log as ReturnType<typeof vi.fn>;
      const output = mockFn.mock.calls[0][0] as string;
      const parsed = JSON.parse(output) as LogOutput;

      expect(parsed.metadata).toEqual({ nested: true });
    });
  });
});
