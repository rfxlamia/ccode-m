import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { forwardRef } from 'react';
import type { VirtuosoProps, VirtuosoHandle } from 'react-virtuoso';
import { VirtualizedMessageList } from './VirtualizedMessageList';
import type { ChatMessage, ToolInvocation } from '@shared/types';
import type { StreamItem } from '@/hooks/useUnifiedStream';

vi.mock('react-virtuoso', () => {
  const Virtuoso = forwardRef<VirtuosoHandle, VirtuosoProps<unknown, unknown>>(
    (props, ref) => {
      const items = props.data ?? [];
      // Expose mock ref methods for testing
      if (ref && typeof ref === 'object') {
        (ref).current = {
          scrollToIndex: vi.fn(),
          scrollTo: vi.fn(),
          scrollBy: vi.fn(),
          scrollIntoView: vi.fn(),
          getState: vi.fn(),
          autoscrollToBottom: vi.fn(),
        };
      }
      return (
        <div data-testid="virtuoso-container">
          {(items as unknown[]).map((item, index) => (
            <div key={String(index)} data-testid={`virtuoso-item-${String(index)}`}>
              {props.itemContent ? props.itemContent(index, item, undefined) : null}
            </div>
          ))}
        </div>
      );
    }
  );
  Virtuoso.displayName = 'Virtuoso';

  return { Virtuoso };
});

// Mock chatStore with controllable isAtBottom state
let mockIsAtBottom = true;
const mockSetIsAtBottom = vi.fn();
vi.mock('@/stores/chatStore', () => ({
  useChatStore: () => ({
    isAtBottom: mockIsAtBottom,
    setIsAtBottom: mockSetIsAtBottom,
  }),
}));

vi.mock('./MessageBubble', () => ({
  MessageBubble: ({ message }: { message: ChatMessage }) => (
    <div data-testid={`message-${message.role}`}>{message.content}</div>
  ),
}));

vi.mock('./ToolCard', () => ({
  ToolCard: ({ tool }: { tool: ToolInvocation }) => (
    <div data-testid={`tool-${tool.toolName}`}>{tool.toolName}</div>
  ),
}));

describe('src/client/components/chat/VirtualizedMessageList.tsx', () => {
  const createMessage = (
    id: string,
    role: 'user' | 'assistant',
    content: string
  ): ChatMessage => ({
    id,
    role,
    content,
    timestamp: new Date(),
    isStreaming: false,
  });

  const createTool = (id: string, toolName: string): ToolInvocation => ({
    id,
    toolName,
    toolInput: { command: 'ls' },
    status: 'pending',
    timestamp: new Date(),
    isExpanded: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAtBottom = true; // Reset to default
  });

  it('renders messages in order', () => {
    const messages = [
      createMessage('1', 'user', 'Hello'),
      createMessage('2', 'assistant', 'Hi there!'),
      createMessage('3', 'user', 'How are you?'),
    ];
    const items: StreamItem[] = messages.map((message) => ({ type: 'message', data: message }));

    render(<VirtualizedMessageList items={items} />);

    expect(screen.getByTestId('virtuoso-container')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(screen.getByText('How are you?')).toBeInTheDocument();
  });

  it('does not show jump-to-bottom when at bottom', () => {
    mockIsAtBottom = true;
    const messages = [createMessage('1', 'user', 'Hello')];
    const items: StreamItem[] = messages.map((message) => ({ type: 'message', data: message }));
    render(<VirtualizedMessageList items={items} />);
    expect(screen.queryByTestId('jump-to-bottom')).not.toBeInTheDocument();
  });

  it('shows jump-to-bottom button when not at bottom', () => {
    mockIsAtBottom = false;
    const messages = [createMessage('1', 'user', 'Hello')];
    const items: StreamItem[] = messages.map((message) => ({ type: 'message', data: message }));
    render(<VirtualizedMessageList items={items} />);
    expect(screen.getByTestId('jump-to-bottom')).toBeInTheDocument();
  });

  it('does not show jump-to-bottom when no messages', () => {
    mockIsAtBottom = false;
    render(<VirtualizedMessageList items={[]} />);
    expect(screen.queryByTestId('jump-to-bottom')).not.toBeInTheDocument();
  });

  it('jump-to-bottom button has correct accessibility attributes', () => {
    mockIsAtBottom = false;
    const messages = [createMessage('1', 'user', 'Hello')];
    const items: StreamItem[] = messages.map((message) => ({ type: 'message', data: message }));
    render(<VirtualizedMessageList items={items} />);
    const button = screen.getByTestId('jump-to-bottom');
    expect(button).toHaveAttribute('aria-label', 'Jump to bottom');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('jump-to-bottom button is clickable', async () => {
    mockIsAtBottom = false;
    const user = userEvent.setup();
    const messages = [createMessage('1', 'user', 'Hello')];
    const items: StreamItem[] = messages.map((message) => ({ type: 'message', data: message }));
    render(<VirtualizedMessageList items={items} />);
    const button = screen.getByTestId('jump-to-bottom');
    await user.click(button);
    // Button click should not throw - interaction is handled by scrollToBottom
    expect(button).toBeInTheDocument();
  });

  it('renders container with proper accessibility attributes', () => {
    render(<VirtualizedMessageList items={[]} />);
    const container = screen.getByTestId('message-list-container');
    expect(container).toHaveAttribute('role', 'log');
    expect(container).toHaveAttribute('aria-label', 'Message history');
  });

  it('renders empty container when no messages', () => {
    render(<VirtualizedMessageList items={[]} />);
    expect(screen.getByTestId('virtuoso-container')).toBeInTheDocument();
  });

  it('renders interleaved tools and messages', () => {
    const items: StreamItem[] = [
      { type: 'message', data: createMessage('1', 'user', 'Hello') },
      { type: 'tool', data: createTool('tool-1', 'Read') },
      { type: 'message', data: createMessage('2', 'assistant', 'Done') },
    ];

    render(<VirtualizedMessageList items={items} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByTestId('tool-Read')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});
