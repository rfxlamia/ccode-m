import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { forwardRef } from 'react';
import type { VirtuosoProps, VirtuosoHandle } from 'react-virtuoso';
import type { Todo } from '@shared/types';
import { ChatPanel, ExamplePrompt } from './ChatPanel';

const findMessageBubble = (element: HTMLElement): HTMLElement | null => {
  let current: HTMLElement | null = element;
  while (current) {
    if (current.classList.contains('rounded-lg')) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
};

// Create mock implementations
const mockAddMessage = vi.fn();
const mockAppendToLastMessage = vi.fn();
const mockFinalizeLastMessage = vi.fn();
const mockSetStreaming = vi.fn();
const mockSetSessionId = vi.fn();
const mockSetError = vi.fn();
const mockClearSession = vi.fn();
const mockSetTodos = vi.fn<(todos: Todo[]) => void>();
const mockClearTodos = vi.fn<() => void>();

// Default mock state
let mockStoreState = {
  messages: [] as Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
  }>,
  isStreaming: false,
  isResetting: false,
  sessionId: null as string | null,
  error: null as string | null,
  isAtBottom: true,
};

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

// Mock the SSE service
vi.mock('@/services/sse', () => ({
  sendAndStream: vi.fn(() => Promise.resolve()),
  getSessionId: vi.fn(() => Promise.resolve('test-session-123')),
}));

// Mock zustand store
vi.mock('@/stores/chatStore', () => ({
  useChatStore: vi.fn(() => ({
    ...mockStoreState,
    addMessage: mockAddMessage,
    appendToLastMessage: mockAppendToLastMessage,
    finalizeLastMessage: mockFinalizeLastMessage,
    setStreaming: mockSetStreaming,
    setSessionId: mockSetSessionId,
    setError: mockSetError,
    setIsAtBottom: vi.fn(),
    clearMessages: vi.fn(),
    clearSession: mockClearSession,
    setResetting: vi.fn(),
  })),
}));

// Mock progress store
vi.mock('@/stores/progressStore', () => ({
  useProgressStore: vi.fn(
    (
      selector?: (state: {
        todos: Todo[];
        setTodos: typeof mockSetTodos;
        clearTodos: typeof mockClearTodos;
      }) => unknown
    ) => {
      const state = {
        todos: [] as Todo[],
        setTodos: mockSetTodos,
        clearTodos: mockClearTodos,
      };
      return selector ? selector(state) : state;
    }
  ),
}));

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockStoreState = {
      messages: [],
      isStreaming: false,
      isResetting: false,
      sessionId: null,
      error: null,
      isAtBottom: true,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Empty State', () => {
    it('renders the empty state and prompts', () => {
      render(<ChatPanel />);

      expect(screen.getByRole('main', { name: /chat/i })).toBeInTheDocument();
      expect(
        screen.getByText(/start a conversation with claude/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', {
          name: /refactor this component to use react hooks/i,
        })
      ).toBeInTheDocument();
    });

    it('supports keyboard focus on example prompts', () => {
      render(<ChatPanel />);

      const prompt = screen.getByRole('button', {
        name: /add error handling to the api calls/i,
      });
      prompt.focus();

      expect(prompt).toHaveFocus();
    });

    it('renders visible focus indicators on prompts', () => {
      render(<ChatPanel />);

      const prompt = screen.getByRole('button', {
        name: /write tests for the authentication flow/i,
      });

      expect(prompt).not.toHaveAttribute('tabIndex', '-1');
      prompt.focus();
      expect(prompt).toHaveFocus();
    });

    it('populates input when example prompt clicked', async () => {
      const user = userEvent.setup();
      render(<ChatPanel />);

      await user.click(screen.getByText('Refactor this component to use React hooks'));

      expect(screen.getByRole('textbox')).toHaveValue('Refactor this component to use React hooks');
    });

    it('focuses input after example prompt click', async () => {
      const originalRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
        cb(0);
        return 0;
      };

      const user = userEvent.setup();
      render(<ChatPanel />);

      await user.click(screen.getByText('Add error handling to the API calls'));

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toHaveFocus();
      });

      window.requestAnimationFrame = originalRaf;
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('focuses input on Cmd+K keyboard shortcut', async () => {
      const user = userEvent.setup();
      render(<ChatPanel />);

      const prompt = screen.getByRole('button', {
        name: /refactor this component to use react hooks/i,
      });
      prompt.focus();
      expect(prompt).toHaveFocus();

      await user.keyboard('{Meta>}k{/Meta}');

      expect(screen.getByRole('textbox')).toHaveFocus();
    });

    it('focuses input on Ctrl+K keyboard shortcut (Windows)', async () => {
      const user = userEvent.setup();
      render(<ChatPanel />);

      const prompt = screen.getByRole('button', {
        name: /add error handling to the api calls/i,
      });
      prompt.focus();
      expect(prompt).toHaveFocus();

      await user.keyboard('{Control>}k{/Control}');

      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });

  describe('Message Display', () => {
    it('renders user messages with correct styling', () => {
      mockStoreState.messages = [
        {
          id: 'user-1',
          role: 'user',
          content: 'Hello Claude!',
          timestamp: new Date(),
        },
      ];

      render(<ChatPanel />);

      const messageText = screen.getByText('Hello Claude!');
      expect(messageText).toBeInTheDocument();
      // User messages have ml-12 (margin-left)
      const bubble = findMessageBubble(messageText);
      expect(bubble).not.toBeNull();
      expect(bubble).toHaveClass('ml-12');
    });

    it('renders assistant messages with correct styling', () => {
      mockStoreState.messages = [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Hello! How can I help you?',
          timestamp: new Date(),
        },
      ];

      render(<ChatPanel />);

      const messageText = screen.getByText('Hello! How can I help you?');
      expect(messageText).toBeInTheDocument();
      // Assistant messages have mr-12 (margin-right)
      const bubble = findMessageBubble(messageText);
      expect(bubble).not.toBeNull();
      expect(bubble).toHaveClass('mr-12');
    });

    it('shows streaming indicator when message is streaming', () => {
      mockStoreState.messages = [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'I am typing...',
          timestamp: new Date(),
          isStreaming: true,
        },
      ];

      render(<ChatPanel />);

      const streamingIndicator = document.querySelector('.animate-pulse');
      expect(streamingIndicator).toBeInTheDocument();
    });

    it('hides streaming indicator when message is complete', () => {
      mockStoreState.messages = [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Complete message',
          timestamp: new Date(),
          isStreaming: false,
        },
      ];

      render(<ChatPanel />);

      expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });

    it('renders multiple messages in order', () => {
      mockStoreState.messages = [
        { id: '1', role: 'user', content: 'First message', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'Second message', timestamp: new Date() },
        { id: '3', role: 'user', content: 'Third message', timestamp: new Date() },
      ];

      render(<ChatPanel />);

      const messages = screen.getAllByText(/message/i);
      expect(messages).toHaveLength(3);
      expect(messages[0]).toHaveTextContent('First message');
      expect(messages[1]).toHaveTextContent('Second message');
      expect(messages[2]).toHaveTextContent('Third message');
    });
  });

  describe('Progress Events', () => {
    it('maps progress event todos into progress store', async () => {
      const user = userEvent.setup();
      mockStoreState.sessionId = 'test-session';
      mockStoreState.isStreaming = false;

      const { sendAndStream } = await import('@/services/sse');
      vi.mocked(sendAndStream).mockImplementation((_sessionId, _message, options) => {
        options.onEvent({
          type: 'progress',
          todos: [
            {
              content: 'Read config',
              status: 'pending',
              active_form: 'Reading config...',
            },
          ],
        });
        options.onComplete();
        return Promise.resolve();
      });

      render(<ChatPanel />);

      await user.type(screen.getByRole('textbox'), 'Hello');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(mockSetTodos).toHaveBeenCalledTimes(1);
      });

      const firstCall = mockSetTodos.mock.calls[0];
      if (!firstCall) throw new Error('Expected mock to be called');
      const [todos] = firstCall as [Todo[]];
      expect(todos).toHaveLength(1);
      const firstTodo = todos[0];
      if (!firstTodo) throw new Error('Expected todo to exist');
      expect(firstTodo).toMatchObject({
        content: 'Read config',
        status: 'pending',
        activeForm: 'Reading config...',
      });
      expect(typeof firstTodo.id).toBe('string');
      expect(firstTodo.id.length).toBeGreaterThan(0);
    });

    it('clears todos when complete event is received', async () => {
      const user = userEvent.setup();
      mockStoreState.sessionId = 'test-session';
      mockStoreState.isStreaming = false;

      const { sendAndStream } = await import('@/services/sse');
      vi.mocked(sendAndStream).mockImplementation((_sessionId, _message, options) => {
        options.onEvent({
          type: 'complete',
          input_tokens: 100,
          output_tokens: 50,
        });
        options.onComplete();
        return Promise.resolve();
      });

      render(<ChatPanel />);

      await user.type(screen.getByRole('textbox'), 'Hello');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(mockClearTodos).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Display', () => {
    it('renders error message when error exists', () => {
      mockStoreState.messages = [
        { id: '1', role: 'user', content: 'Test', timestamp: new Date() },
      ];
      mockStoreState.error = 'Connection failed';

      render(<ChatPanel />);

      expect(screen.getByText(/Error: Connection failed/)).toBeInTheDocument();
    });

    it('hides error when error is null', () => {
      mockStoreState.messages = [
        { id: '1', role: 'user', content: 'Test', timestamp: new Date() },
      ];
      mockStoreState.error = null;

      render(<ChatPanel />);

      expect(screen.queryByText(/^Error:/)).not.toBeInTheDocument();
    });
  });

  describe('Empty State vs Messages', () => {
    it('hides empty state when messages exist', () => {
      mockStoreState.messages = [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
      ];

      render(<ChatPanel />);

      expect(screen.queryByText(/start a conversation with claude/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/try one of these examples/i)).not.toBeInTheDocument();
    });

    it('shows empty state when no messages', () => {
      mockStoreState.messages = [];

      render(<ChatPanel />);

      expect(screen.getByText(/start a conversation with claude/i)).toBeInTheDocument();
    });
  });

  describe('ChatPanel - Typewriter Integration', () => {
    it('renders a message bubble for each message', () => {
      mockStoreState.messages = [
        { id: '1', role: 'user', content: 'First message', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'Second message', timestamp: new Date() },
      ];

      render(<ChatPanel />);

      const messages = screen.getAllByText(/message/i);
      expect(messages).toHaveLength(2);

      messages.forEach((messageText) => {
        const bubble = findMessageBubble(messageText);
        expect(bubble).not.toBeNull();
        expect(bubble).toHaveClass('rounded-lg');
      });
    });

    it('preserves the empty state prompt layout', () => {
      mockStoreState.messages = [];
      render(<ChatPanel />);

      expect(screen.getByText(/start a conversation with claude/i)).toBeInTheDocument();
      expect(screen.getByText(/try one of these examples/i)).toBeInTheDocument();
    });
  });

  describe('Clear Conversation', () => {
    beforeEach(() => {
      mockStoreState.messages = [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
      ];
      mockStoreState.sessionId = 'test-session';
      mockStoreState.isResetting = false;
      mockStoreState.isStreaming = false;
    });

    it('shows Clear button when messages exist', () => {
      render(<ChatPanel />);
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('hides Clear button when no messages', () => {
      mockStoreState.messages = [];
      render(<ChatPanel />);
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    });

    it('disables Clear button during streaming', () => {
      mockStoreState.isStreaming = true;
      render(<ChatPanel />);
      expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled();
    });

    it('disables Clear button during reset', () => {
      mockStoreState.isResetting = true;
      render(<ChatPanel />);
      expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled();
    });

    it('shows loading spinner during reset', () => {
      mockStoreState.isResetting = true;
      render(<ChatPanel />);
      expect(
        screen.getByRole('button', { name: /clear/i }).querySelector('.animate-spin')
      ).toBeInTheDocument();
    });

    it('clears progress todos when clearing conversation', async () => {
      const user = userEvent.setup();
      render(<ChatPanel />);

      await user.click(screen.getByRole('button', { name: /clear/i }));

      expect(mockClearTodos).toHaveBeenCalledTimes(1);
      expect(mockClearSession).toHaveBeenCalledTimes(1);
    });
  });
});

describe('ExamplePrompt', () => {
  it('renders with correct text', () => {
    render(<ExamplePrompt text="Test prompt" />);

    expect(
      screen.getByRole('button', { name: /test prompt/i })
    ).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<ExamplePrompt text="Clickable prompt" onClick={handleClick} />);

    const button = screen.getByRole('button', { name: /clickable prompt/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledWith('Clickable prompt');
  });

  it('has proper aria-label for accessibility', () => {
    render(<ExamplePrompt text="My prompt" />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Use prompt: My prompt');
  });
});
