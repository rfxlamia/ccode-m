import { ShieldAlertIcon } from 'lucide-react';
import type { PermissionDenial } from '@shared/types';
import { Button } from '@/components/ui/button';

interface PermissionDeniedProps {
  denials: PermissionDenial[];
  onAllow: () => void;
  onDeny: () => void;
}

/**
 * Maximum display length for tool input (prevents UI overflow).
 */
const MAX_DISPLAY_LENGTH = 200;

/**
 * Safely converts a value to string.
 */
function safeToString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '';
  return JSON.stringify(value);
}

/**
 * Format tool_input for user-friendly display.
 * Handles common tool input patterns.
 * F9 FIX: Truncates long values to prevent overflow/DoS.
 */
function formatToolInput(input: Record<string, unknown>): string {
  let result: string;
  if (input.file_path) {
    result = safeToString(input.file_path);
  } else if (input.command) {
    result = safeToString(input.command);
  } else if (input.pattern && input.path) {
    result = `${safeToString(input.pattern)} in ${safeToString(input.path)}`;
  } else if (input.pattern) {
    result = safeToString(input.pattern);
  } else if (input.url) {
    result = safeToString(input.url);
  } else if (input.query) {
    result = safeToString(input.query);
  } else {
    result = JSON.stringify(input);
  }

  // Truncate if too long
  if (result.length > MAX_DISPLAY_LENGTH) {
    return result.slice(0, MAX_DISPLAY_LENGTH) + '...';
  }
  return result;
}

/**
 * PermissionDenied component displays risky tool denials with Allow/Deny buttons.
 * Shows when tools require user confirmation before execution.
 */
export function PermissionDenied({ denials, onAllow, onDeny }: PermissionDeniedProps): React.ReactElement {
  return (
    <div className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded my-2">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlertIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
        <span className="font-medium text-yellow-900 dark:text-yellow-100">Permission Required</span>
      </div>

      <div className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
        {denials.length === 1
          ? 'Claude wants to use a tool that requires your permission:'
          : 'Claude wants to use these tools that require your permission:'}
      </div>

      <div className="space-y-2 mb-4">
        {denials.map((denial) => (
          <div key={denial.tool_use_id} className="text-sm">
            <div className="font-medium text-yellow-900 dark:text-yellow-100">
              {denial.tool_name}
            </div>
            <code className="ml-2 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded text-xs text-yellow-800 dark:text-yellow-200 break-all">
              {formatToolInput(denial.tool_input)}
            </code>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={onAllow} variant="default" size="sm">
          Allow & Retry
        </Button>
        <Button onClick={onDeny} variant="ghost" size="sm">
          Deny
        </Button>
      </div>
    </div>
  );
}
