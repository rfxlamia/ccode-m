/**
 * Port Management Service
 *
 * Handles dynamic port allocation, PID/port file management,
 * and stale process detection for the modern server.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import getPort from 'get-port';
import { CLAUDE_DIR } from './config.js';

// ============================================
// LOGGING
// ============================================

/**
 * Simple structured logger for startup-time logging.
 * Uses console but formats output consistently with Fastify's pino logger.
 */
const log = {
  info: (data: Record<string, unknown>, msg: string): void => {
    console.log(JSON.stringify({ level: 'info', ...data, msg }));
  },
  warn: (data: Record<string, unknown>, msg: string): void => {
    console.warn(JSON.stringify({ level: 'warn', ...data, msg }));
  },
};

// ============================================
// CONSTANTS
// ============================================

export const DEFAULT_PORT = 3000;
export const PORT_RANGE_START = 3001;
export const PORT_RANGE_END = 3099;

const PID_FILE = path.join(CLAUDE_DIR, 'modern-server.pid');
const PORT_FILE = path.join(CLAUDE_DIR, 'modern-server-port.txt');

// ============================================
// PORT MANAGEMENT
// ============================================

/**
 * Find an available port, trying the preferred port first
 * then falling back to the configured port range.
 */
export async function findAvailablePort(preferred: number = DEFAULT_PORT): Promise<number> {
  const portRange = Array.from(
    { length: PORT_RANGE_END - PORT_RANGE_START + 1 },
    (_, i) => PORT_RANGE_START + i
  );

  return getPort({ port: [preferred, ...portRange] });
}

// ============================================
// PID FILE MANAGEMENT
// ============================================

/**
 * Ensure the CLAUDE_DIR exists before writing files.
 */
async function ensureClaudeDirExists(): Promise<void> {
  await fs.promises.mkdir(CLAUDE_DIR, { recursive: true });
}

/**
 * Write the current process ID to the PID file.
 */
export async function writePidFile(): Promise<void> {
  await ensureClaudeDirExists();
  await fs.promises.writeFile(PID_FILE, String(process.pid), { mode: 0o644 });
}

/**
 * Write the assigned port number to the port file.
 */
export async function writePortFile(port: number): Promise<void> {
  await ensureClaudeDirExists();
  await fs.promises.writeFile(PORT_FILE, String(port), { mode: 0o644 });
}

/**
 * Remove PID and port files during graceful shutdown.
 * Uses Promise.allSettled to ensure both deletions are attempted
 * even if one fails. Missing files are silently ignored.
 */
export async function cleanupProcessFiles(): Promise<void> {
  await Promise.allSettled([
    fs.promises.unlink(PID_FILE),
    fs.promises.unlink(PORT_FILE),
  ]);
}

// ============================================
// STALE PID DETECTION
// ============================================

/**
 * Detect and handle stale PID files from crashed processes.
 *
 * If a PID file exists but the process is no longer running,
 * the stale file is removed to allow a fresh server start.
 *
 * @throws Error if another server process is still running
 */
export async function detectStalePidFile(): Promise<void> {
  try {
    const pidContent = await fs.promises.readFile(PID_FILE, 'utf-8');
    const oldPid = parseInt(pidContent.trim(), 10);

    // Check if process is still running using signal 0
    try {
      process.kill(oldPid, 0);
      // Process exists - another server is running
      throw new Error(`Another server is already running (PID: ${oldPid})`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ESRCH') {
        // Process not found - stale PID file, safe to remove
        await fs.promises.unlink(PID_FILE);
        log.info({ oldPid }, 'Cleaned up stale PID file');
      } else {
        throw err;
      }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
    // No PID file exists - OK to proceed
  }
}

// ============================================
// FILE PATHS (for testing and debugging)
// ============================================

export function getPidFilePath(): string {
  return PID_FILE;
}

export function getPortFilePath(): string {
  return PORT_FILE;
}
