/**
 * CLI Output Parser
 *
 * Parses JSON lines from Claude CLI stdout and maps them to SSEEvent types.
 * Single source of truth for per-session line buffering.
 */

import type { SSEEvent } from '@shared/types.js';
import { SSEEventSchema } from '@shared/types.js';

// ============================================
// LOGGING
// ============================================

/**
 * Simple structured logger following Fastify/pino pattern.
 */
const log = {
  warn: (data: Record<string, unknown>, msg: string): void => {
    console.warn(JSON.stringify({ level: 'warn', ...data, msg }));
  },
  error: (data: Record<string, unknown>, msg: string): void => {
    console.error(JSON.stringify({ level: 'error', ...data, msg }));
  },
};

// ============================================
// PER-SESSION BUFFERS
// ============================================

/**
 * Per-session line buffers - NOT global state.
 * Each session gets its own buffer to handle partial lines.
 */
const sessionBuffers = new Map<string, string>();

// ============================================
// PARSE
// ============================================

/**
 * Parse CLI output data for a specific session into SSE events.
 *
 * Handles newline-delimited JSON streaming with stateful buffering for partial lines.
 * Each session maintains its own buffer to handle multi-chunk data correctly.
 *
 * The parser:
 * - Splits buffer into lines (newline-delimited)
 * - Keeps incomplete last line in session buffer for next chunk
 * - Parses each complete line as JSON
 * - Maps CLI event format to SSEEvent via mapCLIEventToSSE()
 * - Skips empty lines and logs parse errors
 *
 * @param sessionId - The session this data belongs to (for buffer isolation)
 * @param data - Raw buffer from CLI stdout
 *
 * @returns Array of successfully parsed and mapped SSE events (may be empty)
 *
 * @example
 * ```ts
 * // First chunk with partial line
 * const events1 = parseCLIOutput('session-1', Buffer.from('{"type":"mess'));
 * // Returns: [] (incomplete line buffered)
 *
 * // Second chunk completes the line
 * const events2 = parseCLIOutput('session-1', Buffer.from('age"}\n'));
 * // Returns: [{ type: 'message', content: '...' }]
 * ```
 */
export function parseCLIOutput(sessionId: string, data: Buffer): SSEEvent[] {
  // Get or create buffer for this session
  const existing = sessionBuffers.get(sessionId) || '';
  const text = existing + data.toString('utf8');

  // Split into lines
  const lines = text.split('\n');

  // Keep last line (may be incomplete) in buffer
  sessionBuffers.set(sessionId, lines.pop() || '');

  const events: SSEEvent[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const parsed: unknown = JSON.parse(line);
      const event = mapCLIEventToSSE(parsed, sessionId);
      if (event) {
        events.push(event);
      }
    } catch {
      log.error({ sessionId, line: line.slice(0, 100) }, 'Parse error');
    }
  }

  return events;
}

// ============================================
// MAP TO SSE EVENT TYPES
// ============================================

/**
 * Map raw CLI event JSON to typed SSEEvent.
 *
 * Handles multiple CLI event formats and transforms them into our standardized
 * SSEEvent types defined in shared/types.ts. Validates output against Zod schema.
 *
 * Supported event types:
 * - `assistant`/`message` → SSEEvent type: 'message' or 'tool_use'
 * - `result`/`complete` → SSEEvent type: 'complete' (with token usage)
 * - `tool_use`/`tool_use_calls` → SSEEvent type: 'tool_use'
 * - `tool_result`/`tool_results` → SSEEvent type: 'tool_result'
 * - `progress`/`todo` → SSEEvent type: 'progress' (TodoWrite events)
 * - `artifact`/`file` → SSEEvent type: 'artifact' (file changes)
 * - `system`/`init` → Skipped (internal CLI events)
 *
 * @param cliEvent - Raw parsed JSON object from CLI stdout
 * @param sessionId - Session ID for error logging context
 *
 * @returns Mapped SSEEvent if successful, null if unmappable or validation fails
 *
 * @example
 * ```ts
 * const cliEvent = {
 *   type: 'assistant',
 *   message: {
 *     role: 'assistant',
 *     content: [{ type: 'text', text: 'Hello!' }]
 *   }
 * };
 *
 * const sseEvent = mapCLIEventToSSE(cliEvent, 'session-123');
 * // Returns: { type: 'message', content: 'Hello!' }
 * ```
 */
export function mapCLIEventToSSE(cliEvent: unknown, sessionId: string): SSEEvent | null {
  // Validate basic structure
  if (!cliEvent || typeof cliEvent !== 'object') {
    log.warn({ sessionId }, 'Invalid event structure');
    return null;
  }

  const event = cliEvent as Record<string, unknown>;
  const eventType = event.type;

  let mappedEvent: SSEEvent | null = null;

  // Handle message events
  if (eventType === 'assistant' || eventType === 'message') {
    mappedEvent = mapMessageEvent(event, sessionId);
  }
  // Handle result/completion
  else if (eventType === 'result' || eventType === 'complete') {
    mappedEvent = mapResultEvent(event);
  }
  // Handle tool use
  else if (eventType === 'tool_use' || eventType === 'tool_use_calls') {
    mappedEvent = mapToolUseEvent(event);
  }
  // Handle tool result
  else if (eventType === 'tool_result' || eventType === 'tool_results') {
    mappedEvent = mapToolResultEvent(event);
  }
  // Handle progress (TodoWrite) events
  else if (eventType === 'progress' || eventType === 'todo') {
    mappedEvent = mapProgressEvent(event);
  }
  // Handle artifact (file changes) events
  else if (eventType === 'artifact' || eventType === 'file') {
    mappedEvent = mapArtifactEvent(event);
  }
  // Handle system/init events (skip, not user-facing)
  else if (eventType === 'system' || eventType === 'init') {
    return null;
  }
  // Handle unknown types
  else {
    log.warn({ sessionId, eventType: String(eventType) }, 'Unknown event type');
    return null;
  }

  // Validate against Zod schema per AC #3
  if (mappedEvent) {
    const validation = SSEEventSchema.safeParse(mappedEvent);
    if (!validation.success) {
      log.warn({ sessionId, error: validation.error.message }, 'SSE event validation failed');
      return null;
    }
    return validation.data;
  }

  return null;
}

// ============================================
// EVENT MAPPERS
// ============================================

function mapMessageEvent(event: Record<string, unknown>, sessionId: string): SSEEvent | null {
  const message = event.message as Record<string, unknown> | undefined;
  if (!message) {
    log.warn({ sessionId }, 'Missing message object');
    return null;
  }

  const content = message.content;

  // If content is an array, check for tool_use blocks first
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block && typeof block === 'object') {
        const b = block as Record<string, unknown>;
        if (b.type === 'tool_use') {
          return {
            type: 'tool_use',
            tool_name: (b.name as string) || (b.tool as string) || 'unknown',
            tool_input: b.input,
          };
        }
      }
    }

    // No tool_use found, extract text content
    const textParts: string[] = [];
    for (const block of content) {
      if (block && typeof block === 'object') {
        const b = block as Record<string, unknown>;
        if (b.type === 'text' && typeof b.text === 'string') {
          textParts.push(b.text);
        } else if (b.type === 'thinking' && typeof b.thinking === 'string') {
          textParts.push(`[thinking]\n${b.thinking}`);
        }
      }
    }
    return {
      type: 'message',
      content: textParts.join('\n'),
    };
  }

  // Handle string content
  if (typeof content === 'string') {
    return {
      type: 'message',
      content,
    };
  }

  log.warn({ sessionId }, 'Unknown content type');
  return null;
}

function mapResultEvent(event: Record<string, unknown>): SSEEvent {
  const usage = event.usage as Record<string, number> | undefined;

  // Extract token counts from usage
  const inputTokens = usage?.input_tokens ?? (event.input_tokens as number | undefined) ?? 0;
  const outputTokens = usage?.output_tokens ?? (event.output_tokens as number | undefined) ?? 0;

  return {
    type: 'complete',
    input_tokens: inputTokens,
    output_tokens: outputTokens,
  };
}

function mapToolUseEvent(event: Record<string, unknown>): SSEEvent | null {
  const message = event.message as Record<string, unknown> | undefined;
  if (!message) return null;

  const content = message.content as unknown[];
  if (!Array.isArray(content)) return null;

  // Find tool_use block
  for (const block of content) {
    if (block && typeof block === 'object') {
      const b = block as Record<string, unknown>;
      if (b.type === 'tool_use') {
        return {
          type: 'tool_use',
          tool_name: (b.name as string) || (b.tool as string) || 'unknown',
          tool_input: b.input,
        };
      }
    }
  }

  return null;
}

function mapToolResultEvent(event: Record<string, unknown>): SSEEvent {
  const toolOutput = event.result as string | undefined;
  const isCached = event.is_cached as boolean | undefined;

  return {
    type: 'tool_result',
    tool_output: toolOutput || '',
    is_cached: isCached,
  };
}

/**
 * Map progress/todo events to SSE progress type.
 * CLI emits TodoWrite events as progress updates.
 */
function mapProgressEvent(event: Record<string, unknown>): SSEEvent | null {
  const todos = event.todos as unknown[];
  if (!Array.isArray(todos)) {
    return null;
  }

  const mappedTodos = todos
    .filter((t): t is Record<string, unknown> => t !== null && typeof t === 'object')
    .map((t) => {
      const rawStatus = t.status;
      const status: 'pending' | 'in_progress' | 'completed' =
        rawStatus === 'pending' || rawStatus === 'in_progress' || rawStatus === 'completed'
          ? rawStatus
          : 'pending';
      return {
        content: (t.content as string) || '',
        status,
        active_form: (t.active_form as string) || (t.activeForm as string) || '',
      };
    });

  return {
    type: 'progress',
    todos: mappedTodos,
  };
}

/**
 * Map artifact/file events to SSE artifact type.
 * CLI emits file changes (Write, Edit) as artifact events.
 */
function mapArtifactEvent(event: Record<string, unknown>): SSEEvent | null {
  const filePath = (event.file_path as string | undefined) ?? (event.path as string | undefined);
  const fileContent = (event.file_content as string | undefined) ?? (event.content as string | undefined) ?? '';
  const actionType = (event.action_type as 'create' | 'update' | undefined) ??
    (event.action as 'create' | 'update' | undefined) ?? 'update';

  if (!filePath) {
    return null;
  }

  return {
    type: 'artifact',
    file_path: filePath,
    file_content: fileContent,
    action_type: actionType,
  };
}

// ============================================
// BUFFER MANAGEMENT
// ============================================

/**
 * Clear a session's line buffer.
 * Called by cli-process.ts when terminating a session.
 */
export function clearSessionBuffer(sessionId: string): void {
  sessionBuffers.delete(sessionId);
}

/**
 * Get the current buffer content for a session (for debugging).
 */
export function getSessionBuffer(sessionId: string): string {
  return sessionBuffers.get(sessionId) || '';
}

/**
 * Get all active session IDs that have buffers.
 */
export function getBufferedSessionIds(): string[] {
  return Array.from(sessionBuffers.keys());
}
