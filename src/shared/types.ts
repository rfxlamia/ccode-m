/**
 * Shared TypeScript types - SINGLE SOURCE OF TRUTH
 *
 * Naming conventions:
 * - API/SSE responses: snake_case (session_id, input_tokens)
 * - TypeScript internals: camelCase (sessionId, inputTokens)
 * - Use Zod .transform() for conversion
 */

import { z } from 'zod';

// ============================================
// SSE Event Types (7 types per architecture)
// ============================================

export const SSEEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('message'), content: z.string() }),
  z.object({ type: z.literal('tool_use'), tool_name: z.string(), tool_input: z.unknown() }),
  z.object({
    type: z.literal('tool_result'),
    tool_output: z.string(),
    is_cached: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('progress'),
    todos: z.array(
      z.object({
        content: z.string(),
        status: z.enum(['pending', 'in_progress', 'completed']),
        active_form: z.string(),
      })
    ),
  }),
  z.object({
    type: z.literal('artifact'),
    file_path: z.string(),
    file_content: z.string(),
    action_type: z.enum(['create', 'update']),
  }),
  z.object({
    type: z.literal('complete'),
    input_tokens: z.number(),
    output_tokens: z.number(),
  }),
  z.object({ type: z.literal('error'), error_message: z.string(), error_code: z.string() }),
]);

export type SSEEvent = z.infer<typeof SSEEventSchema>;

// ============================================
// API Response Types
// ============================================

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  cli_available: z.boolean(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ConfigResponseSchema = z.object({
  model: z.string(),
  has_api_key: z.boolean(),
  cli_available: z.boolean(),
  mcp_servers: z.array(z.string()),
  version: z.string(),
});

export type ConfigResponse = z.infer<typeof ConfigResponseSchema>;

// ============================================
// Error Types (RFC 7807)
// ============================================

export const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string().optional(),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

// ============================================
// CLI Subprocess Types
// ============================================

import { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';

/**
 * CLI Session - tracks a spawned Claude CLI subprocess
 */
export interface CLISession {
  process: ChildProcess;
  sessionId: string;
  projectPath: string;
  emitter: EventEmitter;
  createdAt: Date;
  mode: 'streaming' | 'per-message';
}

/**
 * Options for spawning CLI session
 */
export interface SpawnOptions {
  continue?: boolean;  // Use --continue flag for session continuity
  resume?: string;     // Use --resume <id> for specific session
}

// ============================================
// Chat Message Types (Frontend State)
// ============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean | undefined;
  usage?:
    | {
        input_tokens: number;
        output_tokens: number;
      }
    | undefined;
}

// ============================================
// Tool Invocation Types (Frontend State)
// ============================================

export type ToolStatus = 'pending' | 'complete' | 'error';

export interface ToolInvocation {
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  status: ToolStatus;
  result?: string | undefined;
  errorMessage?: string | undefined;
  isCached?: boolean | undefined;
  timestamp: Date;
  isExpanded: boolean;
}

// ============================================
// Progress Todo Types (Frontend State)
// ============================================

export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface Todo {
  id: string;
  content: string;
  status: TodoStatus;
  activeForm: string;
}
