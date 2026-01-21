import { useCallback, useRef, type KeyboardEvent } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { MessageBubble } from './MessageBubble';
import { useChatStore } from '@/stores/chatStore';
import type { ChatMessage } from '@shared/types';
import { cn } from '@/lib/utils';

interface VirtualizedMessageListProps {
  messages: ChatMessage[];
  className?: string;
}

export function VirtualizedMessageList({
  messages,
  className,
}: VirtualizedMessageListProps): JSX.Element {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAtBottom, setIsAtBottom } = useChatStore();

  const handleFollowOutput = useCallback(
    (atBottom: boolean): 'smooth' | false => {
      if (atBottom) {
        return 'smooth';
      }
      return false;
    },
    []
  );

  const handleAtBottomStateChange = useCallback(
    (atBottom: boolean): void => {
      setIsAtBottom(atBottom);
    },
    [setIsAtBottom]
  );

  const scrollToBottom = useCallback((): void => {
    virtuosoRef.current?.scrollToIndex({
      index: 'LAST',
      align: 'end',
      behavior: 'smooth',
    });
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      const container = containerRef.current;
      if (!container) return;

      if (event.key === 'Home') {
        event.preventDefault();
        virtuosoRef.current?.scrollToIndex({ index: 0, behavior: 'smooth' });
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        scrollToBottom();
        return;
      }

      if (event.key === 'PageUp' || event.key === 'PageDown') {
        event.preventDefault();
        const direction = event.key === 'PageUp' ? -1 : 1;
        const delta = Math.max(container.clientHeight, 0);
        if (delta === 0) return;
        virtuosoRef.current?.scrollBy({
          top: direction * delta,
          behavior: 'smooth',
        });
      }
    },
    [scrollToBottom]
  );

  return (
    <div
      ref={containerRef}
      className={cn('relative h-full', className)}
      tabIndex={0}
      role="log"
      aria-label="Message history"
      data-testid="message-list-container"
      onKeyDown={handleKeyDown}
    >
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        followOutput={handleFollowOutput}
        atBottomStateChange={handleAtBottomStateChange}
        atBottomThreshold={100}
        initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
        itemContent={(_index, message) => (
          <div className="px-4 py-2">
            <MessageBubble message={message} />
          </div>
        )}
        style={{ height: '100%' }}
        overscan={200}
      />

      {!isAtBottom && messages.length > 0 && (
        <JumpToBottomButton onClick={scrollToBottom} />
      )}
    </div>
  );
}

interface JumpToBottomButtonProps {
  onClick: () => void;
}

function JumpToBottomButton({ onClick }: JumpToBottomButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute bottom-4 right-4 z-10',
        'flex items-center justify-center',
        'h-10 w-10 rounded-full',
        'bg-primary text-primary-foreground',
        'shadow-lg hover:shadow-xl',
        'transition-all duration-200',
        'hover:scale-105 active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
      )}
      aria-label="Jump to bottom"
      data-testid="jump-to-bottom"
    >
      <ChevronDownIcon className="h-5 w-5" />
    </button>
  );
}

function ChevronDownIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export type { VirtuosoHandle as VirtualizedMessageListHandle };
