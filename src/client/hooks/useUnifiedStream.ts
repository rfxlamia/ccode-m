import { useMemo } from 'react';
import type { ChatMessage, ToolInvocation } from '@shared/types';

export type StreamItem =
  | { type: 'message'; data: ChatMessage }
  | { type: 'tool'; data: ToolInvocation };

interface StreamItemWithOrder {
  type: 'message' | 'tool';
  data: ChatMessage | ToolInvocation;
  order: number;
}

export function useUnifiedStream(
  messages: ChatMessage[],
  tools: ToolInvocation[]
): StreamItem[] {
  return useMemo(() => {
    const messageItems: StreamItemWithOrder[] = messages.map((message, index) => ({
      type: 'message' as const,
      data: message,
      order: index,
    }));
    const toolItems: StreamItemWithOrder[] = tools.map((tool, index) => ({
      type: 'tool' as const,
      data: tool,
      order: messages.length + index,
    }));

    const merged = [...messageItems, ...toolItems];
    merged.sort((a, b) => {
      const timeA = a.data.timestamp.getTime();
      const timeB = b.data.timestamp.getTime();
      if (timeA !== timeB) return timeA - timeB;
      if (a.type !== b.type) return a.type === 'message' ? -1 : 1;
      return a.order - b.order;
    });

    return merged.map((item): StreamItem => {
      if (item.type === 'message') {
        return { type: 'message', data: item.data as ChatMessage };
      }
      return { type: 'tool', data: item.data as ToolInvocation };
    });
  }, [messages, tools]);
}
