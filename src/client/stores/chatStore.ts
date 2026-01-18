import { create } from 'zustand';
import type { ChatMessage } from '@shared/types';

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  sessionId: string | null;
  error: string | null;

  // Actions (verb prefix per architecture)
  addMessage: (message: ChatMessage) => void;
  appendToLastMessage: (content: string) => void;
  finalizeLastMessage: (usage?: ChatMessage['usage']) => void;
  setStreaming: (streaming: boolean) => void;
  setSessionId: (id: string) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  sessionId: null,
  error: null,

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  appendToLastMessage: (content) => {
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = { ...last, content: last.content + content };
      }
      return { messages };
    });
  },

  finalizeLastMessage: (usage) => {
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last) {
        messages[messages.length - 1] = { ...last, isStreaming: false, usage };
      }
      return { messages };
    });
  },

  setStreaming: (isStreaming) => {
    set({ isStreaming });
  },
  setSessionId: (sessionId) => {
    set({ sessionId });
  },
  setError: (error) => {
    set({ error });
  },
  clearMessages: () => {
    set({ messages: [] });
  },
}));
