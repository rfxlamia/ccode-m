import fastify from 'fastify';
import { configRoutes } from './routes/config.js';

const server = fastify({ logger: true });

// Health check endpoint (enables Story 1.0 E2E placeholder test)
server.get('/api/health', () => {
  return { status: 'ok', version: '0.1.0-beta' };
});

// Register config routes
server.register(configRoutes);

// 🔴 CRITICAL: Bind to 127.0.0.1 ONLY (CVE-2025-49596)
server.listen({ port: 3000, host: '127.0.0.1' }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
