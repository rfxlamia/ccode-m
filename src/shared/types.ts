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
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

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
