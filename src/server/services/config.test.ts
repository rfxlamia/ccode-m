import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as childProcess from 'node:child_process';

vi.mock('node:fs', () => ({
  default: {},
  promises: { readFile: vi.fn() },
}));

vi.mock('node:child_process', () => ({
  default: {},
  execSync: vi.fn(),
}));

describe('config service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('hasApiKey', () => {
    it('returns true when config.json has primaryApiKey', async () => {
      const { hasApiKey } = await import('./config');
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(
        JSON.stringify({ primaryApiKey: 'sk-ant-xxx' })
      );

      expect(await hasApiKey()).toBe(true);
    });

    it('returns true when ANTHROPIC_API_KEY env var exists', async () => {
      const { hasApiKey } = await import('./config');
      process.env.ANTHROPIC_API_KEY = 'sk-env';
      vi.mocked(fs.promises.readFile).mockRejectedValueOnce(new Error('ENOENT'));

      expect(await hasApiKey()).toBe(true);
    });

    it('returns false when no API key configured', async () => {
      const { hasApiKey } = await import('./config');
      vi.mocked(fs.promises.readFile).mockRejectedValueOnce(new Error('ENOENT'));

      expect(await hasApiKey()).toBe(false);
    });

    it('NEVER returns the actual API key value', async () => {
      const { hasApiKey } = await import('./config');
      vi.mocked(fs.promises.readFile).mockResolvedValueOnce(
        JSON.stringify({ primaryApiKey: 'sk-ant-secret-key' })
      );

      const result = await hasApiKey();
      expect(typeof result).toBe('boolean');
      expect(result).not.toBe('sk-ant-secret-key');
    });
  });

  describe('loadSettings', () => {
    it('deep merges nested objects correctly', async () => {
      const { loadSettings } = await import('./config');

      vi.mocked(fs.promises.readFile)
        .mockResolvedValueOnce(JSON.stringify({
          model: 'opus',
          permissions: { allow: ['Read'], deny: [] }
        }))
        .mockResolvedValueOnce(JSON.stringify({
          permissions: { allow: ['Write'] }
        }))
        .mockResolvedValueOnce(JSON.stringify({
          model: 'sonnet'
        }));

      const settings = await loadSettings();

      expect(settings.model).toBe('sonnet');
      expect(settings.permissions?.allow).toContain('Read');
      expect(settings.permissions?.allow).toContain('Write');
    });
  });

  describe('encodeProjectPath', () => {
    it('encodes paths correctly for CLI compatibility', async () => {
      const { encodeProjectPath } = await import('./config');

      expect(encodeProjectPath('/home/v/project/claudecode-gui'))
        .toBe('-home-v-project-claudecode-gui');
    });
  });

  describe('checkCliAvailable', () => {
    it('returns boolean indicating CLI availability', async () => {
      // This test verifies the function returns a boolean
      // The actual value depends on whether 'claude' is installed
      const { checkCliAvailable } = await import('./config');
      const result = checkCliAvailable();
      expect(typeof result).toBe('boolean');
    });

    it('handles execSync errors gracefully by returning false', async () => {
      // Test the error handling path by mocking execSync to throw
      vi.mocked(childProcess.execSync).mockImplementation(() => {
        throw new Error('Command not found: claude');
      });

      // Force re-import to use the mock
      vi.resetModules();

      // Re-setup the mock after resetModules
      vi.doMock('node:child_process', () => ({
        execSync: vi.fn().mockImplementation(() => {
          throw new Error('Command not found');
        }),
      }));

      const configModule = await import('./config');
      expect(configModule.checkCliAvailable()).toBe(false);
    });
  });
});
