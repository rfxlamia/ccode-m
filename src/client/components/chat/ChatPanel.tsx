import { MessageCircleIcon } from 'lucide-react';

/** Props for example prompt buttons */
export type ExamplePromptProps = {
  /** The prompt text to display and use when clicked */
  text: string;
  /** Callback when the prompt is clicked (Story 2.2 will provide real implementation) */
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
  // Story 2.2 will provide real click handler
  const handlePromptClick = (text: string): void => {
    console.log('Prompt clicked (handler coming in Story 2.2):', text);
  };

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

      <div className="border-t p-4">
        <div className="flex h-12 items-center rounded-lg bg-muted px-4 text-muted-foreground">
          Chat input coming in Story 2.2...
        </div>
      </div>
    </main>
  );
}
