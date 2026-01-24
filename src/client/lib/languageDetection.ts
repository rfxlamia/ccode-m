/**
 * Language detection utility for syntax highlighting
 * Maps file extensions to syntax highlighter languages
 */

/**
 * Safely extracts string value from tool input record
 * @param input - Tool input record from ToolInvocation
 * @param key - Key to extract
 * @param fallback - Default value if key not found or not a string
 * @returns String value or fallback
 */
export function getStringInput(
  input: Record<string, unknown>,
  key: string,
  fallback: string
): string {
  const value = input[key];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return fallback;
}

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // TypeScript/JavaScript
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',

  // Python
  py: 'python',
  pyi: 'python',

  // Go
  go: 'go',

  // Rust
  rs: 'rust',

  // Java
  java: 'java',

  // C/C++
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',

  // C#
  cs: 'csharp',

  // Data formats
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  toml: 'toml',

  // Markdown/Text
  md: 'markdown',
  markdown: 'markdown',
  txt: 'text',

  // Styles
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',

  // Templates
  html: 'html',
  htm: 'html',
  vue: 'vue',
  svelte: 'svelte',

  // Shell
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'bash',

  // Other
  sql: 'sql',
  dockerfile: 'docker',
  gitignore: 'ignore',
  env: 'bash',
};

/**
 * Extracts file extension from file path
 * @param filePath - Full or relative file path
 * @returns File extension without dot, or empty string if no extension
 */
export function getFileExtension(filePath: string): string {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1] ?? '';
  const extParts = fileName.split('.');

  // Handle files like `.gitignore` (no name, only extension)
  if (extParts.length === 2 && extParts[0] === '' && extParts[1]) {
    return extParts[1].toLowerCase();
  }

  // Handle files like `package.json` (name + extension)
  if (extParts.length > 1) {
    return extParts[extParts.length - 1]?.toLowerCase() ?? '';
  }

  return '';
}

/**
 * Detects syntax highlighter language from file path
 * @param filePath - Full or relative file path
 * @returns Syntax highlighter language identifier
 */
export function getLanguageFromPath(filePath: string): string {
  const ext = getFileExtension(filePath);

  // Check for special files without extension
  const fileName = filePath.split('/').pop()?.toLowerCase() ?? '';
  if (fileName === 'dockerfile') {
    return 'docker';
  }
  if (fileName === '.gitignore' || fileName === '.dockerignore') {
    return 'ignore';
  }

  return EXTENSION_TO_LANGUAGE[ext] ?? 'text';
}
