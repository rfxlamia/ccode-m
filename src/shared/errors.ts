/**
 * Error Message Catalog
 *
 * Centralized error messages for consistent error handling across the application.
 * All error codes and messages are defined here to ensure maintainability.
 */

// ============================================
// ERROR CODES
// ============================================

/**
 * Standardized error codes used throughout the application.
 * These codes are returned in SSEEvent error events and logged.
 */
export const ErrorCodes = {
  // CLI Process Errors (cli-process.ts)
  CLI_NOT_FOUND: 'CLI_NOT_FOUND',
  CLI_PERMISSION_DENIED: 'CLI_PERMISSION_DENIED',
  CLI_STDERR: 'CLI_STDERR',
  CLI_EXIT_ERROR: 'CLI_EXIT_ERROR',
  CLI_ERROR: 'CLI_ERROR',

  // Parser Errors (cli-parser.ts)
  PARSE_ERROR: 'PARSE_ERROR',
  INVALID_EVENT_STRUCTURE: 'INVALID_EVENT_STRUCTURE',

  // Config Errors (config.ts)
  CONFIG_READ_ERROR: 'CONFIG_READ_ERROR',
  SETTINGS_READ_ERROR: 'SETTINGS_READ_ERROR',
  INVALID_CONFIG: 'INVALID_CONFIG',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================
// ERROR MESSAGES
// ============================================

/**
 * Human-readable error messages mapped to error codes.
 * Use these for consistent error messages across the application.
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // CLI Process Errors
  [ErrorCodes.CLI_NOT_FOUND]: 'Claude CLI not available',
  [ErrorCodes.CLI_PERMISSION_DENIED]: 'Permission denied to execute Claude CLI',
  [ErrorCodes.CLI_STDERR]: 'CLI stderr output',
  [ErrorCodes.CLI_EXIT_ERROR]: 'CLI exited with non-zero code',
  [ErrorCodes.CLI_ERROR]: 'CLI process error',

  // Parser Errors
  [ErrorCodes.PARSE_ERROR]: 'Failed to parse CLI output',
  [ErrorCodes.INVALID_EVENT_STRUCTURE]: 'Invalid event structure',

  // Config Errors
  [ErrorCodes.CONFIG_READ_ERROR]: 'Failed to read configuration',
  [ErrorCodes.SETTINGS_READ_ERROR]: 'Failed to read settings',
  [ErrorCodes.INVALID_CONFIG]: 'Invalid configuration',
};

// ============================================
// ERROR HELPERS
// ============================================

/**
 * Create a standardized error message with code.
 *
 * @param code - Error code from ErrorCodes
 * @param details - Optional additional details to append
 * @returns Formatted error message
 *
 * @example
 * ```ts
 * const message = createErrorMessage(ErrorCodes.CLI_NOT_FOUND);
 * // Returns: "CLI_NOT_FOUND: Claude CLI not available"
 *
 * const detailedMessage = createErrorMessage(
 *   ErrorCodes.CLI_EXIT_ERROR,
 *   'Exit code: 1'
 * );
 * // Returns: "CLI_EXIT_ERROR: CLI exited with non-zero code - Exit code: 1"
 * ```
 */
export function createErrorMessage(code: ErrorCode, details?: string): string {
  const baseMessage = ErrorMessages[code];
  if (details) {
    return `${code}: ${baseMessage} - ${details}`;
  }
  return `${code}: ${baseMessage}`;
}

/**
 * Check if a value is a valid error code.
 *
 * @param code - Value to check
 * @returns True if the value is a valid ErrorCode
 */
export function isErrorCode(code: unknown): code is ErrorCode {
  return typeof code === 'string' && code in ErrorMessages;
}
