/**
 * Shared constants for Claude Code GUI
 */

// ============================================
// PERMISSION TIERS
// ============================================

/**
 * Safe tools that can be auto-allowed without user confirmation.
 * These are read-only operations with no side effects.
 */
export const SAFE_TOOLS = new Set([
  'Read',
  'Glob',
  'Grep',
  'Task',
  'WebFetch',
  'WebSearch',
]);

/**
 * All known tools for validation.
 * Union of safe and risky tools - used to validate allowedTools input.
 */
export const ALL_KNOWN_TOOLS = new Set([
  // Safe tools (read-only)
  'Read',
  'Glob',
  'Grep',
  'Task',
  'WebFetch',
  'WebSearch',
  // Risky tools (can modify system)
  'Write',
  'Edit',
  'Bash',
  'NotebookEdit',
]);

/**
 * Check if a tool is safe (can be auto-allowed).
 * Unknown tools are treated as risky (deny-unknown-default).
 *
 * @param toolName - Name of the tool to check
 * @returns true if the tool is in the safe tier
 */
export function isToolSafe(toolName: string): boolean {
  return SAFE_TOOLS.has(toolName);
}

/**
 * Validate that a tool name is known (for input sanitization).
 * Rejects unknown tools to prevent injection attacks.
 *
 * @param toolName - Name of the tool to validate
 * @returns true if the tool is known (safe or risky)
 */
export function isKnownTool(toolName: string): boolean {
  return ALL_KNOWN_TOOLS.has(toolName);
}

/**
 * Maximum length for tool names (prevents DoS via huge strings).
 */
export const MAX_TOOL_NAME_LENGTH = 50;
