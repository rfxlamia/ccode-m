import { memo, useRef, useState, useCallback } from 'react';
import { TypewriterMarkdown } from './TypewriterMarkdown';
import { useTypewriter } from '@/hooks/useTypewriter';
import type { ChatMessage } from '@shared/types';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble = memo(function MessageBubble({
  message,
}: MessageBubbleProps): JSX.Element {
  const isAssistant = message.role === 'assistant';
  const hasStreamedRef = useRef(message.isStreaming === true);
  const [isSkipped, setIsSkipped] = useState(false);

  if (message.isStreaming) {
    hasStreamedRef.current = true;
  }

  const shouldAnimate = isAssistant && hasStreamedRef.current && !isSkipped;
  const { displayedText, isTyping, skipToEnd } = useTypewriter(message.content, {
    enabled: shouldAnimate,
    speed: 33,
  });

  const handleSkip = useCallback(() => {
    setIsSkipped(true);
    skipToEnd();
  }, [skipToEnd]);

  const showCursor = !isSkipped && (isTyping || message.isStreaming === true);
  const contentToShow =
    isAssistant && !isSkipped && (message.isStreaming || isTyping)
      ? displayedText
      : message.content;

  return (
    <div
      data-testid={`message-${message.role}`}
      className={cn(
        'p-4 rounded-lg',
        isAssistant ? 'bg-muted mr-12' : 'bg-primary text-primary-foreground ml-12'
      )}
    >
      {isAssistant ? (
        <TypewriterMarkdown
          content={contentToShow}
          isTyping={showCursor}
          onClick={
            !isSkipped && (message.isStreaming || isTyping) ? handleSkip : undefined
          }
        />
      ) : (
        <p className="whitespace-pre-wrap">{message.content}</p>
      )}

      {message.usage && (
        <div className="mt-2 text-xs text-muted-foreground">
          {message.usage.input_tokens + message.usage.output_tokens} tokens
        </div>
      )}
    </div>
  );
});
