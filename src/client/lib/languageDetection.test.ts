import { describe, it, expect } from 'vitest';
import { getFileExtension, getLanguageFromPath, getStringInput } from './languageDetection';

describe('languageDetection', () => {
  describe('getStringInput', () => {
    it('should return string value when key exists and value is non-empty string', () => {
      const input = { file_path: '/test/file.ts', command: 'ls -la' };
      expect(getStringInput(input, 'file_path', 'default')).toBe('/test/file.ts');
      expect(getStringInput(input, 'command', 'default')).toBe('ls -la');
    });

    it('should return fallback when key does not exist', () => {
      const input = { file_path: '/test/file.ts' };
      expect(getStringInput(input, 'missing_key', 'fallback')).toBe('fallback');
    });

    it('should return fallback for non-string values', () => {
      const input = {
        number: 42,
        boolean: true,
        null_val: null,
        undefined_val: undefined,
        array: [1, 2, 3],
        object: { nested: 'value' },
      };
      expect(getStringInput(input, 'number', 'fallback')).toBe('fallback');
      expect(getStringInput(input, 'boolean', 'fallback')).toBe('fallback');
      expect(getStringInput(input, 'null_val', 'fallback')).toBe('fallback');
      expect(getStringInput(input, 'undefined_val', 'fallback')).toBe('fallback');
      expect(getStringInput(input, 'array', 'fallback')).toBe('fallback');
      expect(getStringInput(input, 'object', 'fallback')).toBe('fallback');
    });

    it('should return fallback for empty or whitespace-only strings', () => {
      const input = {
        empty: '',
        whitespace: '   ',
        tabs: '\t\t',
        newlines: '\n\n',
      };
      expect(getStringInput(input, 'empty', 'fallback')).toBe('fallback');
      expect(getStringInput(input, 'whitespace', 'fallback')).toBe('fallback');
      expect(getStringInput(input, 'tabs', 'fallback')).toBe('fallback');
      expect(getStringInput(input, 'newlines', 'fallback')).toBe('fallback');
    });

    it('should preserve whitespace in valid non-empty strings', () => {
      const input = { padded: '  valid value  ' };
      expect(getStringInput(input, 'padded', 'fallback')).toBe('  valid value  ');
    });
  });

  describe('getFileExtension', () => {
    it('should extract extension from simple filename', () => {
      expect(getFileExtension('file.ts')).toBe('ts');
      expect(getFileExtension('file.js')).toBe('js');
      expect(getFileExtension('file.py')).toBe('py');
    });

    it('should extract extension from full path', () => {
      expect(getFileExtension('/path/to/file.ts')).toBe('ts');
      expect(getFileExtension('./src/component.tsx')).toBe('tsx');
    });

    it('should handle dotfiles (extension-only files)', () => {
      expect(getFileExtension('.gitignore')).toBe('gitignore');
      expect(getFileExtension('.dockerignore')).toBe('dockerignore');
      expect(getFileExtension('.env')).toBe('env');
    });

    it('should handle files with multiple dots', () => {
      expect(getFileExtension('file.test.ts')).toBe('ts');
      expect(getFileExtension('file.spec.test.js')).toBe('js');
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('Makefile')).toBe('');
      expect(getFileExtension('Dockerfile')).toBe('');
      expect(getFileExtension('/path/to/README')).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(getFileExtension('')).toBe('');
      expect(getFileExtension('/path/to/')).toBe('');
    });
  });

  describe('getLanguageFromPath', () => {
    describe('TypeScript/JavaScript', () => {
      it('should detect TypeScript', () => {
        expect(getLanguageFromPath('file.ts')).toBe('typescript');
        expect(getLanguageFromPath('component.tsx')).toBe('tsx');
        expect(getLanguageFromPath('/src/app.ts')).toBe('typescript');
      });

      it('should detect JavaScript', () => {
        expect(getLanguageFromPath('file.js')).toBe('javascript');
        expect(getLanguageFromPath('component.jsx')).toBe('jsx');
        expect(getLanguageFromPath('module.mjs')).toBe('javascript');
        expect(getLanguageFromPath('script.cjs')).toBe('javascript');
      });
    });

    describe('Python', () => {
      it('should detect Python', () => {
        expect(getLanguageFromPath('script.py')).toBe('python');
        expect(getLanguageFromPath('types.pyi')).toBe('python');
      });
    });

    describe('Go', () => {
      it('should detect Go', () => {
        expect(getLanguageFromPath('main.go')).toBe('go');
        expect(getLanguageFromPath('/cmd/server.go')).toBe('go');
      });
    });

    describe('Rust', () => {
      it('should detect Rust', () => {
        expect(getLanguageFromPath('main.rs')).toBe('rust');
        expect(getLanguageFromPath('/src/lib.rs')).toBe('rust');
      });
    });

    describe('Java', () => {
      it('should detect Java', () => {
        expect(getLanguageFromPath('Main.java')).toBe('java');
        expect(getLanguageFromPath('/src/App.java')).toBe('java');
      });
    });

    describe('Data formats', () => {
      it('should detect JSON', () => {
        expect(getLanguageFromPath('package.json')).toBe('json');
        expect(getLanguageFromPath('tsconfig.json')).toBe('json');
      });

      it('should detect YAML', () => {
        expect(getLanguageFromPath('config.yaml')).toBe('yaml');
        expect(getLanguageFromPath('docker-compose.yml')).toBe('yaml');
      });

      it('should detect XML', () => {
        expect(getLanguageFromPath('file.xml')).toBe('xml');
      });
    });

    describe('Markdown/Text', () => {
      it('should detect Markdown', () => {
        expect(getLanguageFromPath('README.md')).toBe('markdown');
        expect(getLanguageFromPath('docs.md')).toBe('markdown');
      });

      it('should detect text as fallback', () => {
        expect(getLanguageFromPath('README.txt')).toBe('text');
        expect(getLanguageFromPath('unknown.xyz')).toBe('text');
      });
    });

    describe('Styles', () => {
      it('should detect CSS variants', () => {
        expect(getLanguageFromPath('style.css')).toBe('css');
        expect(getLanguageFromPath('style.scss')).toBe('scss');
        expect(getLanguageFromPath('style.sass')).toBe('sass');
        expect(getLanguageFromPath('style.less')).toBe('less');
      });
    });

    describe('Shell scripts', () => {
      it('should detect shell scripts', () => {
        expect(getLanguageFromPath('script.sh')).toBe('bash');
        // .bashrc and .zshrc have no extension after the dot, so they return 'text'
        expect(getLanguageFromPath('.bashrc')).toBe('text');
        expect(getLanguageFromPath('.zshrc')).toBe('text');
      });
    });

    describe('Special files', () => {
      it('should detect Dockerfile', () => {
        expect(getLanguageFromPath('Dockerfile')).toBe('docker');
        expect(getLanguageFromPath('/path/to/Dockerfile')).toBe('docker');
      });

      it('should detect ignore files', () => {
        expect(getLanguageFromPath('.gitignore')).toBe('ignore');
        expect(getLanguageFromPath('.dockerignore')).toBe('ignore');
      });
    });

    describe('Edge cases', () => {
      it('should handle empty string', () => {
        expect(getLanguageFromPath('')).toBe('text');
      });

      it('should handle paths without extension', () => {
        expect(getLanguageFromPath('Makefile')).toBe('text');
        expect(getLanguageFromPath('/path/to/README')).toBe('text');
      });

      it('should be case insensitive', () => {
        expect(getLanguageFromPath('FILE.TS')).toBe('typescript');
        expect(getLanguageFromPath('File.Py')).toBe('python');
        // DOCKERFILE uppercase is detected as Dockerfile (special file)
        expect(getLanguageFromPath('DOCKERFILE')).toBe('docker');
      });
    });
  });
});
