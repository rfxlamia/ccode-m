import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import fastify from 'fastify';
import { configRoutes } from '../routes/config';
import type { ConfigResponse } from '@shared/types';

describe('GET /api/config', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = fastify({ logger: false });
    await server.register(configRoutes);
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('returns config with correct structure', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/config',
    });

    expect(response.statusCode).toBe(200);

    const body: ConfigResponse = response.json();
    expect(body).toHaveProperty('model');
    expect(body).toHaveProperty('has_api_key');
    expect(body).toHaveProperty('cli_available');
    expect(body).toHaveProperty('mcp_servers');
    expect(body).toHaveProperty('version');
    expect(Array.isArray(body.mcp_servers)).toBe(true);
  });

  it('returns snake_case JSON fields (not camelCase)', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/config',
    });

    const body: Record<string, unknown> = response.json();
    expect(body).toHaveProperty('has_api_key'); // snake_case
    expect(body).toHaveProperty('cli_available'); // snake_case
    expect(body).toHaveProperty('mcp_servers'); // snake_case
    expect(body).not.toHaveProperty('hasApiKey'); // NOT camelCase
    expect(body).not.toHaveProperty('cliAvailable'); // NOT camelCase
    expect(body).not.toHaveProperty('mcpServers'); // NOT camelCase
  });

  it('returns boolean for has_api_key (NEVER the actual key)', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/config',
    });

    const body: ConfigResponse = response.json();
    expect(typeof body.has_api_key).toBe('boolean');

    // Ensure it's not leaking the actual API key
    expect(body).not.toHaveProperty('api_key');
    expect(body).not.toHaveProperty('primaryApiKey');
  });

  it('returns version number', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/config',
    });

    const body: ConfigResponse = response.json();
    expect(body.version).toMatch(/^\d+\.\d+\.\d+-?/); // semantic version pattern
  });
});
