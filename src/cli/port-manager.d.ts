/**
 * Type declarations for port-manager.js imports
 *
 * These declarations allow the CLI module to import from the compiled
 * port-manager.js file without including the source TypeScript file.
 */

declare module '../server/services/port-manager.js' {
  export function getPidFilePath(): string;
  export function getPortFilePath(): string;
}
