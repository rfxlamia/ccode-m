import { useState, useCallback, useRef } from 'react';
import { MessageCircleIcon } from 'lucide-react';
import { ChatInput, type ChatInputHandle } from './ChatInput';
import { useKeyboard } from '@/hooks/useKeyboard';

/** Props for example prompt buttons */
export type ExamplePromptProps = {
  /** The prompt text to display and use when clicked */
  text: string;
  /** Callback when the prompt is clicked */
  onClick?: (text: string) => void;
};

/** Example prompt button that users can click to start a conversation */
export function ExamplePrompt({ text, onClick }: ExamplePromptProps): JSX.Element {
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

export function ChatPanel(): JSX.Element {
  const [inputValue, setInputValue] = useState('');
  const chatInputRef = useRef<ChatInputHandle>(null);

  // Focus helper for keyboard shortcut
  const focusInput = useCallback(() => {
    chatInputRef.current?.focus();
  }, []);

  // Enable global keyboard shortcuts
  useKeyboard({
    focusChat: focusInput,
  });

  const handleSend = useCallback((message: string) => {
    // TODO: Story 2.3 - Send to SSE endpoint
    console.log('Message to send:', message);
  }, []);

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

  return (
    <main
      id="main-content"
      role="main"
      aria-label="Chat"
      className="flex h-full flex-col bg-background"
    >
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
