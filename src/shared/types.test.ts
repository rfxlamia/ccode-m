import { describe, it, expect } from 'vitest';
import { SSEEventSchema, HealthResponseSchema, ProblemDetailsSchema } from './types';

describe('src/shared/types.ts', () => {
  describe('SSEEventSchema', () => {
    it('should validate message event', () => {
      const event = { type: 'message', content: 'Hello world' };
      const result = SSEEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate tool_use event', () => {
      const event = { type: 'tool_use', tool_name: 'Read', tool_input: { path: '/test' } };
      const result = SSEEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate tool_result event', () => {
      const event = { type: 'tool_result', tool_output: 'file content', is_cached: false };
      const result = SSEEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate progress event', () => {
      const event = {
        type: 'progress',
        todos: [{ content: 'Task 1', status: 'in_progress', active_form: 'Doing task' }],
      };
      const result = SSEEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate artifact event', () => {
      const event = {
        type: 'artifact',
        file_path: '/src/test.ts',
        file_content: 'export const x = 1;',
        action_type: 'create',
      };
      const result = SSEEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate complete event', () => {
      const event = { type: 'complete', input_tokens: 100, output_tokens: 200 };
      const result = SSEEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate error event', () => {
      const event = { type: 'error', error_message: 'Something failed', error_code: 'ERR001' };
      const result = SSEEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should reject invalid event type', () => {
      const event = { type: 'invalid', data: 'test' };
      const result = SSEEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('HealthResponseSchema', () => {
    it('should validate valid health response', () => {
      const response = { status: 'ok', version: '0.1.0-beta' };
      const result = HealthResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const response = { status: 'error', version: '0.1.0-beta' };
      const result = HealthResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe('ProblemDetailsSchema', () => {
    it('should validate RFC 7807 problem details', () => {
      const problem = {
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Resource not found',
      };
      const result = ProblemDetailsSchema.safeParse(problem);
      expect(result.success).toBe(true);
    });

    it('should allow optional detail', () => {
      const problem = {
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
      };
      const result = ProblemDetailsSchema.safeParse(problem);
      expect(result.success).toBe(true);
    });
  });
});
