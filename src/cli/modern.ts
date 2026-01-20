#!/usr/bin/env node
/**
 * Claude Modern CLI Launcher
 *
 * Launches the Claude Code GUI server and opens it in the default browser.
 * Handles duplicate server prevention and graceful shutdown integration.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import open from 'open';
import { getPidFilePath, getPortFilePath } from '../server/services/port-manager.js';

const CLAUDE_DIR = path.join(process.env.HOME || '', '.claude');
// Use tsx to run TypeScript source directly (handles path aliases)
const SERVER_SCRIPT = path.join(CLAUDE_DIR, 'modern', 'src', 'server', 'index.ts');

/**
 * Check if the server process is currently running.
 *
 * Reads the PID file and uses process.kill(pid, 0) to check if the process exists.
 * Returns false if the PID file doesn't exist or the process is not running.
 */
async function isServerRunning(): Promise<boolean> {
  try {
    const pidPath = getPidFilePath();
    const pidStr = await fs.readFile(pidPath, 'utf-8');
    const pid = parseInt(pidStr.trim(), 10);

    if (isNaN(pid)) {
      return false;
    }

    // Signal 0 checks if process exists without actually sending a signal
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the existing server port from the port file.
 *
 * Returns null if the file doesn't exist or contains invalid data.
 */
async function getExistingPort(): Promise<number | null> {
  try {
    const portPath = getPortFilePath();
    const portStr = await fs.readFile(portPath, 'utf-8');
    const port = parseInt(portStr.trim(), 10);
    return isNaN(port) ? null : port;
  } catch {
    return null;
  }
}

/**
 * Start the GUI server.
 *
 * Cleans any stale PID/port files, spawns the server process,
 * and waits for the port file to be written.
 *
 * @returns Object with port number and server process
 * @throws Error if server fails to start within timeout
 */
async function startServer(): Promise<{ port: number; serverProcess: ReturnType<typeof spawn> }> {
  // Clean stale files before starting
  const pidPath = getPidFilePath();
  const portPath = getPortFilePath();

  await fs.unlink(pidPath).catch(() => {});
  await fs.unlink(portPath).catch(() => {});

  console.log('Starting GUI server...');

  // Use tsx to run TypeScript source (handles path aliases properly)
  // npx tsx is available since tsx is a dev dependency
  const serverProcess = spawn('npx', ['tsx', SERVER_SCRIPT], {
    cwd: path.join(CLAUDE_DIR, 'modern'),
    stdio: 'inherit',
    detached: false,
  });

  // Wait for port file to be written (max 5 seconds)
  for (let i = 0; i < 50; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const port = await getExistingPort();
    if (port) {
      return { port, serverProcess };
    }
  }

  throw new Error('Server failed to start within timeout');
}

/**
 * Main entry point for the CLI launcher.
 *
 * Orchestrates the server start/browser open flow:
 * 1. Check if server is already running
 * 2. If running, use existing port; otherwise start new server
 * 3. Open browser to the GUI URL
 * 4. Report URL to user
 * 5. Keep process alive while server runs (for graceful shutdown)
 */
async function main(): Promise<void> {
  try {
    let port: number;
    let serverProcess: ReturnType<typeof spawn> | null = null;

    if (await isServerRunning()) {
      const existingPort = await getExistingPort();
      if (!existingPort) {
        throw new Error('Server running but port file missing');
      }
      port = existingPort;
      console.log(`GUI server already running on port ${String(port)}`);
    } else {
      const result = await startServer();
      port = result.port;
      serverProcess = result.serverProcess;
      console.log(`GUI server started on port ${String(port)}`);
    }

    // Open browser to the GUI URL
    const url = `http://127.0.0.1:${String(port)}`;
    await open(url);

    console.log(`GUI available at ${url}`);

    // If we started a new server, keep this process alive
    // Server will exit when parent exits (attached mode)
    if (serverProcess) {
      // Handle graceful shutdown
      const shutdown = (): void => {
        console.log('\nShutting down GUI server...');
        serverProcess.kill('SIGTERM');
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      // Wait for server process to exit
      await new Promise<void>((resolve) => {
        serverProcess.on('exit', () => {
          resolve();
        });
      });
    }
  } catch (error) {
    console.error(
      'Failed to launch GUI:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

// Only run main() when executed directly as CLI entry point
// This guard prevents main() from running when the module is imported for testing
if (process.argv[1]?.endsWith('modern.js') || process.argv[1]?.endsWith('modern.ts')) {
  void main();
}
