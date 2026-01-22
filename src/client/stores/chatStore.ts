import { create } from 'zustand';
import type { ChatMessage } from '@shared/types';
import { resetSession } from '@/services/sse';

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  isResetting: boolean;
  sessionId: string | null;
  error: string | null;
  isAtBottom: boolean;

  // Actions (verb prefix per architecture)
  addMessage: (message: ChatMessage) => void;
  appendToLastMessage: (content: string) => void;
  finalizeLastMessage: (usage?: ChatMessage['usage']) => void;
  setStreaming: (streaming: boolean) => void;
  setSessionId: (id: string) => void;
  setError: (error: string | null) => void;
  setIsAtBottom: (atBottom: boolean) => void;
  setResetting: (resetting: boolean) => void;
  clearMessages: () => void;
  clearSession: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  isResetting: false,
  sessionId: null,
  error: null,
  isAtBottom: true,

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
  setIsAtBottom: (atBottom) => {
    set({ isAtBottom: atBottom });
  },
  setResetting: (isResetting) => {
    set({ isResetting });
  },
  clearMessages: () => {
    set({ messages: [] });
  },
  clearSession: async () => {
    set({ isResetting: true, error: null });

    try {
      const newSessionId = await resetSession();

      set({
        messages: [],
        sessionId: newSessionId,
        isStreaming: false,
        isAtBottom: true,
        isResetting: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset session';
      set({ error: errorMessage, isResetting: false });
    }
  },
}));
