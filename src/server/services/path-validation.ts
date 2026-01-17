import * as path from 'node:path';
import * as fs from 'node:fs';
import { CLAUDE_DIR } from './config.js';

/**
 * Validate path is within allowed directories
 * Prevents directory traversal attacks
 */
export function isPathAllowed(requestedPath: string): boolean {
  const resolved = path.resolve(requestedPath);
  const allowedPaths = [CLAUDE_DIR, process.cwd()];

  return allowedPaths.some(allowed =>
    resolved === allowed || resolved.startsWith(allowed + path.sep)
  );
}

/**
 * Safe file read with path validation
 */
export async function safeReadFile(filePath: string): Promise<string> {
  if (!isPathAllowed(filePath)) {
    const error = new Error('Access denied: path outside allowed directories');
    (error as Error & { statusCode: number }).statusCode = 403;
    throw error;
  }

  return fs.promises.readFile(filePath, 'utf-8');
}
