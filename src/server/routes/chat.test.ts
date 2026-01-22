import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { chatRoutes } from './chat.js';

// Mock the index module
vi.mock('../index.js', () => ({
  getGlobalSession: vi.fn(),
  resetGlobalSession: vi.fn(),
  incrementActiveRequests: vi.fn(),
  decrementActiveRequests: vi.fn(),
}));

// Mock cli-process
vi.mock('../services/cli-process.js', () => ({
  getSession: vi.fn(),
}));

// Mock cli-protocol
vi.mock('../services/cli-protocol.js', () => ({
  sendMessage: vi.fn(),
}));

describe('DELETE /api/chat/session', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    server = Fastify();
    await server.register(chatRoutes);
  });

  afterEach(async () => {
    await server.close();
  });

  it('returns new sessionId on successful reset', async () => {
    const { resetGlobalSession } = await import('../index.js');
    vi.mocked(resetGlobalSession).mockResolvedValue('new-session-123');

    const response = await server.inject({
      method: 'DELETE',
      url: '/api/chat/session',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ sessionId: 'new-session-123' });
  });

  it('returns 500 when reset fails', async () => {
    const { resetGlobalSession } = await import('../index.js');
    vi.mocked(resetGlobalSession).mockResolvedValue(null);

    const response = await server.inject({
      method: 'DELETE',
      url: '/api/chat/session',
    });

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ error: 'Failed to reset CLI session' });
  });
});
