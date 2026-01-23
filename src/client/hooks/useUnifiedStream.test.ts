import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useUnifiedStream } from './useUnifiedStream';
import type { ChatMessage, ToolInvocation } from '@shared/types';

describe('src/client/hooks/useUnifiedStream.ts', () => {
  it('merges messages and tools by timestamp', () => {
    const messages: ChatMessage[] = [
      { id: 'm1', role: 'user', content: 'hi', timestamp: new Date('2026-01-23T10:00:00Z') },
      { id: 'm2', role: 'assistant', content: 'hello', timestamp: new Date('2026-01-23T10:00:02Z') },
    ];
    const tools: ToolInvocation[] = [
      {
        id: 't1',
        toolName: 'Read',
        toolInput: { file_path: '/tmp/a' },
        status: 'pending',
        timestamp: new Date('2026-01-23T10:00:01Z'),
        isExpanded: false,
      },
    ];

    const { result } = renderHook(() => useUnifiedStream(messages, tools));
    const items = result.current;
    expect(items).toHaveLength(3);
    expect(items[0]?.type).toBe('message');
    expect(items[1]?.type).toBe('tool');
    expect(items[2]?.type).toBe('message');
  });

  it('prefers messages before tools when timestamps match', () => {
    const timestamp = new Date('2026-01-23T10:00:00Z');
    const messages: ChatMessage[] = [
      { id: 'm1', role: 'user', content: 'hi', timestamp },
    ];
    const tools: ToolInvocation[] = [
      {
        id: 't1',
        toolName: 'Bash',
        toolInput: { command: 'ls' },
        status: 'pending',
        timestamp,
        isExpanded: false,
      },
    ];

    const { result } = renderHook(() => useUnifiedStream(messages, tools));
    const items = result.current;
    expect(items[0]?.type).toBe('message');
    expect(items[1]?.type).toBe('tool');
  });
});
