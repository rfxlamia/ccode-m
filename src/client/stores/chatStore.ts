import { create } from 'zustand';
import type { ChatMessage, PermissionDenial } from '@shared/types';
import { resetSession } from '@/services/sse';
import { restartSessionWithPermissions } from '@/services/sse';
import { sendAndStream } from '@/services/sse';
import type { SSEEvent } from '@shared/types';

interface PendingRetry {
  message: string;
  denials: PermissionDenial[];
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  isResetting: boolean;
  sessionId: string | null;
  error: string | null;
  isAtBottom: boolean;

  // Permission retry state
  allowedTools: Set<string>;
  lastMessage: string | null;
  pendingRetry: PendingRetry | null;
  retryCount: number;
  readonly MAX_RETRIES: number;

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

  // Permission actions
  addAllowedTools: (tools: string[]) => void;
  setLastMessage: (msg: string) => void;
  setPendingRetry: (message: string, denials: PermissionDenial[]) => void;
  clearPendingRetry: () => void;
  resetRetryCount: () => void;
  incrementRetryCount: () => number;

  // Retry with permission - complex action that uses other services
  retryWithPermission: (
    message: string,
    allowedTools: string[],
    options: {
      signal: AbortSignal;
      onEvent: (event: SSEEvent) => void;
      onError: (err: Error) => void;
      onComplete: () => void;
    }
  ) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  isResetting: false,
  sessionId: null,
  error: null,
  isAtBottom: true,

  // Permission retry state
  allowedTools: new Set<string>(),
  lastMessage: null,
  pendingRetry: null,
  retryCount: 0,
  MAX_RETRIES: 3,

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
        // Reset permission state on clear session
        allowedTools: new Set<string>(),
        lastMessage: null,
        pendingRetry: null,
        retryCount: 0,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset session';
      set({ error: errorMessage, isResetting: false });
    }
  },

  // Permission actions
  addAllowedTools: (tools) => {
    set((state) => {
      const newAllowedTools = new Set(state.allowedTools);
      for (const tool of tools) {
        newAllowedTools.add(tool);
      }
      return { allowedTools: newAllowedTools };
    });
  },

  setLastMessage: (msg) => {
    set({ lastMessage: msg });
  },

  setPendingRetry: (message, denials) => {
    set({ pendingRetry: { message, denials } });
  },

  clearPendingRetry: () => {
    set({ pendingRetry: null });
  },

  resetRetryCount: () => {
    set({ retryCount: 0 });
  },

  incrementRetryCount: () => {
    const currentCount = get().retryCount;
    set({ retryCount: currentCount + 1 });
    return currentCount + 1;
  },

  retryWithPermission: async (message, allowedTools, options) => {
    const { sessionId, retryCount, MAX_RETRIES } = get();

    // Check retry limit to prevent infinite loops
    if (retryCount >= MAX_RETRIES) {
      const error = `Max retries exceeded (${String(MAX_RETRIES)}). Tool permission issue persists.`;
      set({ error: error, retryCount: 0 });
      throw new Error(error);
    }

    if (!sessionId) {
      throw new Error('No active session to retry');
    }

    // Increment retry count
    get().incrementRetryCount();

    try {
      // 1. Restart session with resume + allowedTools
      const newSessionId = await restartSessionWithPermissions(
        sessionId,
        allowedTools,
        options.signal
      );

      // 2. Update session state
      set({
        sessionId: newSessionId,
        isStreaming: true,
        error: null,
        pendingRetry: null,  // Clear pending retry since we're now retrying
      });

      // 3. Re-send the message via sendAndStream
      await sendAndStream(newSessionId, message, {
        signal: options.signal,
        onEvent: options.onEvent,
        onError: options.onError,
        onComplete: () => {
          // Reset retry count on successful completion
          set({ retryCount: 0, isStreaming: false });
          options.onComplete();
        },
      });
    } catch (error) {
      // Reset retry count on error and propagate
      set({ retryCount: 0, isStreaming: false });
      throw error;
    }
  },
}));
