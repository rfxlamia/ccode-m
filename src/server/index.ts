/**
 * Modern Server - Fastify HTTP Server with Security
 *
 * Security features:
 * - Binds to 127.0.0.1 ONLY (CVE-2025-49596 mitigation)
 * - Defense-in-depth middleware rejects non-localhost requests
 * - Dynamic port allocation (3000-3099)
 * - PID/port file management
 * - Graceful shutdown handling
 */

import fastify from 'fastify';
import { configRoutes } from './routes/config.js';
import { GUI_VERSION, checkCliAvailable } from './services/config.js';
import {
  findAvailablePort,
  detectStalePidFile,
  writePidFile,
  writePortFile,
  cleanupProcessFiles,
  DEFAULT_PORT,
} from './services/port-manager.js';

const server = fastify({ logger: true });

// ============================================
// DEFENSE-IN-DEPTH MIDDLEWARE
// ============================================

/**
 * Security middleware: Reject non-localhost requests
 *
 * This provides defense-in-depth in addition to the host binding.
 * Even if the server were somehow bound to 0.0.0.0,
 * this middleware would still reject external requests.
 */
server.addHook('onRequest', async (request, reply) => {
  const clientIp = request.ip;
  const allowedIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

  if (!allowedIps.includes(clientIp)) {
    server.log.warn({ clientIp }, 'Rejected non-localhost request');
    reply.code(403).send({ error: 'Access denied: localhost only' });
    return; // CRITICAL: Must return to stop request processing!
  }
});

// ============================================
// HEALTH ENDPOINT
// ============================================

server.get('/api/health', () => {
  return {
    status: 'ok',
    version: GUI_VERSION,
    cli_available: checkCliAvailable(),
  };
});

// ============================================
// ROUTES
// ============================================

server.register(configRoutes);

// ============================================
// SERVER STARTUP AND SHUTDOWN
// ============================================

/**
 * Graceful shutdown handler
 */
const shutdown = async (signal: string): Promise<void> => {
  server.log.info({ signal }, 'Received shutdown signal');
  await cleanupProcessFiles();
  await server.close();
  process.exit(0);
};

/**
 * Start the server with security and port management
 */
const start = async (): Promise<void> => {
  try {
    // Detect and clean up stale PID files from crashed processes
    await detectStalePidFile();

    // Find available port with fallback
    const port = await findAvailablePort(DEFAULT_PORT);

    // Start listening on localhost ONLY
    await server.listen({ port, host: '127.0.0.1' });

    // Write PID and port files after successful bind (parallel for atomicity)
    await Promise.all([writePidFile(), writePortFile(port)]);

    server.log.info({ port, pid: process.pid }, 'Server started');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Register signal handlers for graceful shutdown
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// Start the server
start();
