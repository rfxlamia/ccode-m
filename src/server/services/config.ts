import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

// ============================================
// EXPORTED CONSTANTS (for other services)
// ============================================
export const CLAUDE_DIR = path.join(os.homedir(), '.claude');
export const GUI_VERSION = '0.1.0-beta';
export const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

// Internal paths
const CONFIG_PATH = path.join(CLAUDE_DIR, 'config.json');
const SETTINGS_PATH = path.join(CLAUDE_DIR, 'settings.json');
const CLAUDE_JSON_PATH = path.join(os.homedir(), '.claude.json');

// ============================================
// UTILITY: Project Path Encoding
// CLI uses this pattern for session directories
// ============================================
export function encodeProjectPath(absolutePath: string): string {
  return absolutePath.replace(/\//g, '-');
}

export function getProjectDirectory(projectPath: string): string {
  const projectKey = encodeProjectPath(projectPath);
  return path.join(CLAUDE_DIR, 'projects', projectKey);
}

// ============================================
// UTILITY: Deep Merge for Settings
// ============================================
function deepMerge<T extends Record<string, unknown>>(...objects: (T | undefined)[]): T {
  const result = {} as T;

  for (const obj of objects) {
    if (!obj) continue;

    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key as keyof T] = deepMerge(
          result[key as keyof T] as Record<string, unknown> | undefined,
          value as Record<string, unknown>
        ) as T[keyof T];
      } else if (Array.isArray(value) && Array.isArray(result[key as keyof T])) {
        // Merge arrays by concatenating and removing duplicates
        const existingArray = result[key as keyof T] as unknown[];
        const newArray = value as unknown[];
        const combinedArray = [...existingArray, ...newArray];
        result[key as keyof T] = [
          ...new Set(combinedArray)
        ] as T[keyof T];
      } else {
        result[key as keyof T] = value as T[keyof T];
      }
    }
  }

  return result;
}

// ============================================
// UTILITY: Safe JSON Reader
// ============================================
async function readJSON<T>(filePath: string): Promise<T | undefined> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return undefined;
  }
}

// ============================================
// CONFIG SERVICE: Display-Only Functions
// ============================================

interface ApiConfig {
  primaryApiKey?: string;
}

interface Settings {
  model?: string;
  permissions?: {
    allow?: string[];
    deny?: string[];
    defaultMode?: 'plan' | 'execute';
  };
  env?: Record<string, string>;
  enabledPlugins?: Record<string, boolean>;
  [key: string]: unknown; // Index signature for deepMerge compatibility
}

/**
 * Check if API key is configured (BOOLEAN ONLY)
 * NEVER returns the actual key value!
 */
export async function hasApiKey(): Promise<boolean> {
  const config = await readJSON<ApiConfig>(CONFIG_PATH);
  const keyFromFile = config?.primaryApiKey;
  const keyFromEnv = process.env.ANTHROPIC_API_KEY;

  return Boolean(keyFromFile || keyFromEnv);
}

/**
 * Load and merge settings from multiple sources with precedence hierarchy.
 *
 * Settings are loaded from three locations and deep-merged with this precedence:
 * 1. User settings: `~/.claude/settings.json` (lowest priority)
 * 2. Project settings: `./.claude/settings.json` (medium priority)
 * 3. Local settings: `./.claude/settings.local.json` (highest priority)
 *
 * The deep merge handles:
 * - Nested objects: recursively merged
 * - Arrays: concatenated and deduplicated
 * - Primitives: later values override earlier ones
 *
 * @returns Merged settings object (empty object if no settings files exist)
 *
 * @example
 * ```ts
 * // Load settings to get model preference
 * const settings = await loadSettings();
 * console.log(settings.model); // 'claude-sonnet-4-20250514'
 *
 * // Check permissions config
 * if (settings.permissions?.defaultMode === 'plan') {
 *   console.log('Running in plan mode');
 * }
 * ```
 */
export async function loadSettings(): Promise<Settings> {
  const userSettings = await readJSON<Settings>(SETTINGS_PATH);

  const projectSettingsPath = path.join(process.cwd(), '.claude', 'settings.json');
  const projectSettings = await readJSON<Settings>(projectSettingsPath);

  const localSettingsPath = path.join(process.cwd(), '.claude', 'settings.local.json');
  const localSettings = await readJSON<Settings>(localSettingsPath);

  return deepMerge(userSettings ?? {}, projectSettings ?? {}, localSettings ?? {});
}

/**
 * Get current model for display
 */
export async function getModel(): Promise<string> {
  const settings = await loadSettings();
  return settings.model ?? DEFAULT_MODEL;
}

/**
 * Check if Claude CLI is available in system
 */
export function checkCliAvailable(): boolean {
  try {
    execSync('which claude', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get MCP servers list for display
 */
export async function getMcpServers(): Promise<string[]> {
  const claudeJson = await readJSON<{ mcpServers?: Record<string, unknown> }>(CLAUDE_JSON_PATH);
  return Object.keys(claudeJson?.mcpServers ?? {});
}
