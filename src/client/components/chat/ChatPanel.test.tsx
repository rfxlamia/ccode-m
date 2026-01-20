import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
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
  sessionId: null as string | null,
  error: null as string | null,
};

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
  })),
}));

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockStoreState = {
      messages: [],
      isStreaming: false,
      sessionId: null,
      error: null,
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
