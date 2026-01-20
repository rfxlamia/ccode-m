import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '@shared/types';

describe('src/client/components/chat/MessageBubble.tsx', () => {
  it('renders user message without typewriter', () => {
    const msg: ChatMessage = {
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date(),
    };
    render(<MessageBubble message={msg} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders completed assistant message fully', () => {
    const msg: ChatMessage = {
      id: '2',
      role: 'assistant',
      content: 'Hi!',
      timestamp: new Date(),
      isStreaming: false,
    };
    render(<MessageBubble message={msg} />);
    expect(screen.getByText('Hi!')).toBeInTheDocument();
  });

  it('shows cursor for streaming messages', () => {
    const msg: ChatMessage = {
      id: '3',
      role: 'assistant',
      content: 'Typing...',
      timestamp: new Date(),
      isStreaming: true,
    };
    render(<MessageBubble message={msg} />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays token usage when available', () => {
    const msg: ChatMessage = {
      id: '4',
      role: 'assistant',
      content: 'Done',
      timestamp: new Date(),
      isStreaming: false,
      usage: { input_tokens: 100, output_tokens: 50 },
    };
    render(<MessageBubble message={msg} />);
    expect(screen.getByText('150 tokens')).toBeInTheDocument();
  });

  it('hides cursor after skip click', () => {
    const msg: ChatMessage = {
      id: '5',
      role: 'assistant',
      content: 'Typing...',
      timestamp: new Date(),
      isStreaming: true,
    };

    render(<MessageBubble message={msg} />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
  });
});
