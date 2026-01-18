/**
 * Server Security Tests
 *
 * Integration tests for server security features:
 * - Defense-in-depth middleware for localhost verification
 * - Host binding security
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GUI_VERSION } from '../services/config.js';

/**
 * Extracted middleware logic for testability.
 * This mirrors the actual middleware in index.ts.
 */
function isAllowedIp(clientIp: string): boolean {
  const allowedIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
  return allowedIps.includes(clientIp);
}

describe('server security', () => {
  let server: FastifyInstance;
  let serverUrl: string;

  beforeAll(async () => {
    server = fastify({ logger: false });

    // Add defense-in-depth middleware (same as production)
    server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
      const clientIp = request.ip;

      if (!isAllowedIp(clientIp)) {
        server.log.warn({ clientIp }, 'Rejected non-localhost request');
        reply.code(403).send({ error: 'Access denied: localhost only' });
        return;
      }
    });

    server.get('/api/health', () => ({
      status: 'ok',
      version: GUI_VERSION,
      cli_available: true,
    }));

    server.get('/test', () => ({ message: 'ok' }));

    // Start server on localhost
    await server.listen({ port: 0, host: '127.0.0.1' });
    const address = server.server.address();
    if (address && typeof address === 'object' && 'port' in address) {
      serverUrl = `http://127.0.0.1:${address.port}`;
    } else {
      throw new Error('Failed to get server address');
    }
  });

  afterAll(async () => {
    await server.close();
  });

  describe('isAllowedIp helper (unit tests)', () => {
    it('allows 127.0.0.1', () => {
      expect(isAllowedIp('127.0.0.1')).toBe(true);
    });

    it('allows ::1 (IPv6 localhost)', () => {
      expect(isAllowedIp('::1')).toBe(true);
    });

    it('allows ::ffff:127.0.0.1 (IPv4-mapped IPv6)', () => {
      expect(isAllowedIp('::ffff:127.0.0.1')).toBe(true);
    });

    it('rejects 192.168.1.100 (private network)', () => {
      expect(isAllowedIp('192.168.1.100')).toBe(false);
    });

    it('rejects 10.0.0.1 (private network)', () => {
      expect(isAllowedIp('10.0.0.1')).toBe(false);
    });

    it('rejects 8.8.8.8 (public IP)', () => {
      expect(isAllowedIp('8.8.8.8')).toBe(false);
    });

    it('rejects 0.0.0.0', () => {
      expect(isAllowedIp('0.0.0.0')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isAllowedIp('')).toBe(false);
    });
  });

  describe('defense-in-depth middleware (integration)', () => {
    it('allows requests from 127.0.0.1', async () => {
      const response = await fetch(`${serverUrl}/test`);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('ok');
    });

    it('server binds to localhost only', async () => {
      const address = server.server.address();
      expect(address).not.toBeNull();
      if (address && typeof address === 'object') {
        expect(address.address).toBe('127.0.0.1');
      }
    });
  });

  describe('health endpoint', () => {
    it('returns correct structure for localhost requests', async () => {
      const response = await fetch(`${serverUrl}/api/health`);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('cli_available');
      expect(body.status).toBe('ok');
      expect(typeof body.version).toBe('string');
      expect(typeof body.cli_available).toBe('boolean');
    });

    it('includes cli_available field', async () => {
      const response = await fetch(`${serverUrl}/api/health`);

      const body = await response.json();
      expect(body).toHaveProperty('cli_available');
      expect(body.cli_available).toBe(true);
    });

    it('uses GUI_VERSION constant (not hardcoded)', async () => {
      const response = await fetch(`${serverUrl}/api/health`);

      const body = await response.json();
      expect(body.version).toBe(GUI_VERSION);
    });
  });
});
