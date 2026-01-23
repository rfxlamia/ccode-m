import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageCircleIcon, Trash2Icon, Loader2Icon } from 'lucide-react';
import { ChatInput, type ChatInputHandle } from './ChatInput';
import { VirtualizedMessageList } from './VirtualizedMessageList';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useUnifiedStream } from '@/hooks/useUnifiedStream';
import { useChatStore } from '@/stores/chatStore';
import { useProgressStore } from '@/stores/progressStore';
import { useToolStore } from '@/stores/toolStore';
import { sendAndStream, getSessionId } from '@/services/sse';

/** Props for example prompt buttons */
export type ExamplePromptProps = {
  /** The prompt text to display and use when clicked */
  text: string;
  /** Callback when the prompt is clicked */
  onClick?: (text: string) => void;
};

/** Example prompt button that users can click to start a conversation */
export function ExamplePrompt({ text, onClick }: ExamplePromptProps): React.ReactElement {
  return (
    <button
      type="button"
      className="rounded-lg border border-border bg-card p-4 text-left text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={() => onClick?.(text)}
      aria-label={`Use prompt: ${text}`}
    >
      {text}
    </button>
  );
}

export function ChatPanel(): React.ReactElement {
  const [inputValue, setInputValue] = useState('');
  const chatInputRef = useRef<ChatInputHandle>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Chat store state and actions
  const {
    messages,
    isStreaming,
    isResetting,
    sessionId,
    error,
    addMessage,
    appendToLastMessage,
    finalizeLastMessage,
    setStreaming,
    setSessionId,
    setError,
    clearSession,
  } = useChatStore();
  const setTodos = useProgressStore((state) => state.setTodos);
  const clearTodos = useProgressStore((state) => state.clearTodos);
  const tools = useToolStore((state) => state.tools);
  const addToolUse = useToolStore((state) => state.addToolUse);
  const updateToolResult = useToolStore((state) => state.updateToolResult);
  const setToolError = useToolStore((state) => state.setToolError);
  const clearTools = useToolStore((state) => state.clearTools);

  const items = useUnifiedStream(messages, tools);

  // Focus helper for keyboard shortcut
  const focusInput = useCallback(() => {
    chatInputRef.current?.focus();
  }, []);

  // Enable global keyboard shortcuts
  useKeyboard({
    focusChat: focusInput,
  });

  // Initialize session on mount with cleanup
  useEffect(() => {
    const abortController = new AbortController();

    getSessionId(abortController.signal)
      .then(setSessionId)
      .catch((err: unknown) => {
        // Ignore abort errors (expected on unmount)
        if (err instanceof Error && err.name === 'AbortError') return;
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
      });

    return () => {
      abortController.abort();
    };
  }, [setSessionId, setError]);

  // Cleanup streaming on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSend = useCallback(
    (message: string) => {
      if (!sessionId || isStreaming) return;

      // Cancel any previous streaming
      abortControllerRef.current?.abort();

      // Create new abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Add user message
      addMessage({
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      // Add placeholder assistant message
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      });

      setStreaming(true);
      setError(null);

      // Start streaming with abort signal
      void sendAndStream(sessionId, message, {
        signal: abortController.signal,
        onEvent: (event) => {
          if (event.type === 'message') {
            appendToLastMessage(event.content);
          } else if (event.type === 'tool_use') {
            const toolInput =
              typeof event.tool_input === 'object' && event.tool_input !== null
                ? (event.tool_input as Record<string, unknown>)
                : {};
            addToolUse({
              toolName: event.tool_name,
              toolInput,
              timestamp: new Date(),
            });
          } else if (event.type === 'tool_result') {
            if (event.tool_output.startsWith('Error:')) {
              setToolError(event.tool_output);
            } else {
              updateToolResult(event.tool_output, event.is_cached);
            }
          } else if (event.type === 'complete') {
            finalizeLastMessage({
              input_tokens: event.input_tokens,
              output_tokens: event.output_tokens,
            });
            clearTodos();
            clearTools();
          } else if (event.type === 'progress') {
            const todosWithIds = event.todos.map((todo, index) => ({
              id: `todo-${String(index)}`,
              content: todo.content,
              status: todo.status,
              activeForm: todo.active_form,
            }));
            setTodos(todosWithIds);
          } else if (event.type === 'error') {
            setError(event.error_message);
            finalizeLastMessage();
          }
        },
        onError: (err: Error) => {
          setError(err.message);
          finalizeLastMessage();
        },
        onComplete: () => {
          setStreaming(false);
          abortControllerRef.current = null;
        },
      });
    },
    [
      sessionId,
      isStreaming,
      addMessage,
      appendToLastMessage,
      finalizeLastMessage,
      setStreaming,
      setError,
      setTodos,
      clearTodos,
      addToolUse,
      updateToolResult,
      setToolError,
      clearTools,
    ]
  );

  // Example prompt click → populate input + focus
  const handlePromptClick = useCallback(
    (text: string) => {
      setInputValue(text);
      // Focus after React processes the state update (next frame)
      requestAnimationFrame(() => {
        focusInput();
      });
    },
    [focusInput]
  );

  const handleClearConversation = useCallback(() => {
    if (isStreaming || isResetting) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

      clearTodos();
      clearTools();
      void clearSession();
    }, [isStreaming, isResetting, clearTodos, clearTools, clearSession]);

  return (
    <main
      id="main-content"
      role="main"
      aria-label="Chat"
      className="flex h-full flex-col bg-background"
    >
      {items.length > 0 && (
        <header className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-sm font-medium text-muted-foreground">Chat</span>
          <button
            type="button"
            onClick={handleClearConversation}
            disabled={isStreaming || isResetting}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            title="Clear conversation and start fresh"
            aria-label="Clear conversation"
          >
            {isResetting ? (
              <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2Icon className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="sr-only sm:not-sr-only">Clear</span>
          </button>
        </header>
      )}

      {/* Messages area - WITH VIRTUALIZATION */}
      {items.length > 0 ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <VirtualizedMessageList items={items} className="flex-1" />
          {error && (
            <div className="p-3 mx-4 mb-2 rounded-lg bg-destructive/10 text-destructive">
              Error: {error}
            </div>
          )}
        </div>
      ) : (
        /* Empty state with example prompts */
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <MessageCircleIcon
            className="mb-4 h-16 w-16 text-muted-foreground/30"
            aria-hidden="true"
          />
          <h2 className="mb-2 text-xl font-semibold">
            Start a conversation with Claude
          </h2>
          <p className="mb-6 text-muted-foreground">Try one of these examples:</p>

          <section
            className="grid w-full max-w-md gap-3"
            aria-label="Example prompts"
          >
            <ExamplePrompt
              text="Refactor this component to use React hooks"
              onClick={handlePromptClick}
            />
            <ExamplePrompt
              text="Add error handling to the API calls"
              onClick={handlePromptClick}
            />
            <ExamplePrompt
              text="Write tests for the authentication flow"
              onClick={handlePromptClick}
            />
          </section>
        </div>
      )}

      {/* Chat input */}
      <ChatInput
        ref={chatInputRef}
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
      />
    </main>
  );
}
