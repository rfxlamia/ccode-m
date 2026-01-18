/**
 * Port Manager Tests
 *
 * Unit tests for port management service including:
 * - Dynamic port allocation
 * - PID/port file management
 * - Stale PID detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';

// Store original process.kill for restoration (bound to prevent this scoping issues)
const originalProcessKill = process.kill.bind(process);

// Mock fs.promises before importing port-manager
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: vi.fn(),
      writeFile: vi.fn(),
      unlink: vi.fn(),
      mkdir: vi.fn(),
    },
  };
});

// Mock get-port
vi.mock('get-port', () => ({
  default: vi.fn(),
}));

import getPort from 'get-port';
import {
  findAvailablePort,
  writePidFile,
  writePortFile,
  cleanupProcessFiles,
  detectStalePidFile,
  PORT_RANGE_START,
  PORT_RANGE_END,
} from './port-manager.js';

const mockedFs = vi.mocked(fs.promises);
const mockedGetPort = vi.mocked(getPort);

describe('port-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure mkdir always succeeds by default
    mockedFs.mkdir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Always restore process.kill after each test
    process.kill = originalProcessKill;
  });

  describe('findAvailablePort', () => {
    it('returns preferred port when available', async () => {
      mockedGetPort.mockResolvedValue(3000);

      const port = await findAvailablePort(3000);

      expect(port).toBe(3000);
      // get-port is called with preferred port and range
      expect(mockedGetPort).toHaveBeenCalled();
    });

    it('returns next available port when preferred is in use', async () => {
      mockedGetPort.mockResolvedValue(3001);

      const port = await findAvailablePort(3000);

      expect(port).toBe(3001);
    });

    it('includes port range when preferred port is in use', async () => {
      mockedGetPort.mockResolvedValue(3050);

      await findAvailablePort(3000);

      expect(mockedGetPort).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        port: expect.arrayContaining([3000, 3001, 3050]),
      });
    });

    it('handles edge case when all ports in range are in use', async () => {
      // get-port returns a port outside our range when all are in use
      mockedGetPort.mockResolvedValue(3100);

      const port = await findAvailablePort(3000);

      // Should still return what get-port provides
      expect(port).toBe(3100);
    });

    it('passes correct port range to get-port', async () => {
      mockedGetPort.mockResolvedValue(3000);

      await findAvailablePort(3000);

      // Verify the range starts at 3001 and ends at 3099 (99 ports)
      const call = mockedGetPort.mock.calls[0]?.[0] as { port?: number[] } | undefined;
      const portArray = call?.port;
      expect(portArray).toHaveLength(100); // 3000 + 99 ports in range
      expect(portArray?.[0]).toBe(3000);
      expect(portArray?.[1]).toBe(PORT_RANGE_START);
      if (portArray) {
        expect(portArray[portArray.length - 1]).toBe(PORT_RANGE_END);
      }
    });
  });

  describe('writePidFile', () => {
    it('writes current PID to file', async () => {
      mockedFs.writeFile.mockResolvedValue(undefined);

      await writePidFile();

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('modern-server.pid'),
        String(process.pid),
        { mode: 0o644 }
      );
    });

    it('ensures directory exists before writing', async () => {
      mockedFs.writeFile.mockResolvedValue(undefined);

      await writePidFile();

      expect(mockedFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.claude'),
        { recursive: true }
      );
    });
  });

  describe('writePortFile', () => {
    it('writes port number to file', async () => {
      mockedFs.writeFile.mockResolvedValue(undefined);

      await writePortFile(3000);

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('modern-server-port.txt'),
        '3000',
        { mode: 0o644 }
      );
    });

    it('handles different port numbers', async () => {
      mockedFs.writeFile.mockResolvedValue(undefined);

      await writePortFile(3050);

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '3050',
        { mode: 0o644 }
      );
    });

    it('ensures directory exists before writing', async () => {
      mockedFs.writeFile.mockResolvedValue(undefined);

      await writePortFile(3000);

      expect(mockedFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.claude'),
        { recursive: true }
      );
    });
  });

  describe('cleanupProcessFiles', () => {
    it('removes both PID and port files', async () => {
      mockedFs.unlink.mockResolvedValue(undefined);

      await cleanupProcessFiles();

      expect(mockedFs.unlink).toHaveBeenCalledTimes(2);
    });

    it('handles missing files gracefully (Promise.allSettled)', async () => {
      mockedFs.unlink.mockRejectedValue({ code: 'ENOENT' });

      // Should not throw - Promise.allSettled handles rejections
      await expect(cleanupProcessFiles()).resolves.not.toThrow();
    });

    it('handles mixed file existence', async () => {
      mockedFs.unlink
        .mockResolvedValueOnce(undefined) // PID file exists
        .mockRejectedValueOnce({ code: 'ENOENT' }); // Port file missing

      // Should not throw
      await expect(cleanupProcessFiles()).resolves.not.toThrow();
    });
  });

  describe('detectStalePidFile', () => {
    it('does nothing when no PID file exists', async () => {
      mockedFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      await detectStalePidFile();

      expect(mockedFs.readFile).toHaveBeenCalled();
      expect(mockedFs.unlink).not.toHaveBeenCalled();
    });

    it('removes stale PID file when process not running', async () => {
      mockedFs.readFile.mockResolvedValue('12345');
      mockedFs.unlink.mockResolvedValue(undefined);

      // Mock process.kill to throw ESRCH (process not found)
      process.kill = vi.fn(() => {
        const err = new Error('process not found') as NodeJS.ErrnoException;
        err.code = 'ESRCH';
        throw err;
      }) as typeof process.kill;

      try {
        await detectStalePidFile();

        expect(mockedFs.unlink).toHaveBeenCalled();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(process.kill).toHaveBeenCalledWith(12345, 0);
      } finally {
        // Restore in finally block to ensure cleanup
        process.kill = originalProcessKill;
      }
    });

    it('throws when another server process is running', async () => {
      mockedFs.readFile.mockResolvedValue('12345');

      // Mock process.kill to succeed (process exists)
      process.kill = vi.fn(() => true) as unknown as typeof process.kill;

      try {
        await expect(detectStalePidFile()).rejects.toThrow(
          'Another server is already running (PID: 12345)'
        );
      } finally {
        // Restore in finally block to ensure cleanup
        process.kill = originalProcessKill;
      }
    });

    it('re-throws non-ENOENT errors from readFile', async () => {
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      mockedFs.readFile.mockRejectedValue(error);

      await expect(detectStalePidFile()).rejects.toThrow('Permission denied');
    });
  });
});
