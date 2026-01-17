import type { FastifyPluginCallback } from 'fastify';
import type { ConfigResponse } from '../../shared/types.js';
import { hasApiKey, getModel, checkCliAvailable, getMcpServers, GUI_VERSION } from '../services/config.js';

export const configRoutes: FastifyPluginCallback = (server, _opts, done) => {
  server.get<{ Reply: ConfigResponse }>('/api/config', async () => {
    const [model, keyExists, cliAvailable, mcpServers] = await Promise.all([
      getModel(),
      hasApiKey(),
      Promise.resolve(checkCliAvailable()),
      getMcpServers(),
    ]);

    return {
      model,
      has_api_key: keyExists,
      cli_available: cliAvailable,
      mcp_servers: mcpServers,
      version: GUI_VERSION,
    };
  });

  done();
};
