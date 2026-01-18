import {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  /** Callback when message is sent */
  onSend: (message: string) => void;
  /** Disable input and send button */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Controlled value for populating from example prompts */
  value?: string;
  /** Callback when value changes */
  onChange?: (value: string) => void;
}

/** Exposed imperative handle for ChatInput */
export interface ChatInputHandle {
  /** Focus the textarea and move cursor to end */
  focus: () => void;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  function ChatInput(
    {
      onSend,
      disabled = false,
      placeholder = "What would you like Claude to do?",
      value: controlledValue,
      onChange: onControlledChange,
    },
    ref
  ): JSX.Element {
  // Support both controlled and uncontrolled modes
  const [internalValue, setInternalValue] = useState('');
  const message = controlledValue ?? internalValue;
  const setMessage = onControlledChange ?? setInternalValue;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = message.trim().length > 0 && !disabled;

  const handleSend = useCallback(() => {
    if (!canSend) return;

    onSend(message.trim());
    setMessage('');
    // Keep focus on input after sending
    textareaRef.current?.focus();
  }, [message, canSend, onSend, setMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to send (local handler for when textarea has focus)
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200).toString()}px`;
    }
  }, [message]);

  // Expose focus method via imperative handle
  useImperativeHandle(
    ref,
    () => ({
      focus: (): void => {
        textareaRef.current?.focus();
        const length = textareaRef.current?.value.length ?? 0;
        textareaRef.current?.setSelectionRange(length, length);
      },
    }),
    []
  );

  return (
    <div className="flex gap-2 items-end p-4 border-t bg-background">
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[48px] max-h-[200px] resize-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Chat message input"
        rows={1}
      />
      <Button
        onClick={handleSend}
        disabled={!canSend}
        size="icon"
        className="shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
  }
);
