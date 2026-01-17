import { describe, it, expect } from 'vitest';
import { isPathAllowed } from './path-validation';
import * as os from 'node:os';

describe('path-validation', () => {
  describe('isPathAllowed', () => {
    it('allows ~/.claude/ paths', () => {
      const homedir = os.homedir();
      expect(isPathAllowed(`${homedir}/.claude/settings.json`)).toBe(true);
    });

    it('allows current working directory paths', () => {
      expect(isPathAllowed(`${process.cwd()}/src/index.ts`)).toBe(true);
    });

    it('blocks directory traversal attempts', () => {
      expect(isPathAllowed('../../../etc/passwd')).toBe(false);
      expect(isPathAllowed('/etc/passwd')).toBe(false);
      expect(isPathAllowed('/root/.ssh/id_rsa')).toBe(false);
    });

    it('blocks paths outside allowed directories', () => {
      expect(isPathAllowed('/tmp/malicious')).toBe(false);
      expect(isPathAllowed('/var/log/auth.log')).toBe(false);
    });
  });
});
