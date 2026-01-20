import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TypewriterMarkdown } from './TypewriterMarkdown';

describe('src/client/components/chat/TypewriterMarkdown.tsx', () => {
  it('renders plain text content', async () => {
    render(<TypewriterMarkdown content="Hello World" />);

    // Wait for lazy-loaded ReactMarkdown
    await vi.waitFor(() => {
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });

  it('shows cursor when isTyping is true', () => {
    render(<TypewriterMarkdown content="Typing..." isTyping={true} />);

    const cursor = document.querySelector('.animate-pulse');
    expect(cursor).toBeInTheDocument();
  });

  it('hides cursor when isTyping is false', () => {
    render(<TypewriterMarkdown content="Done" isTyping={false} />);

    const cursor = document.querySelector('.animate-pulse');
    expect(cursor).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<TypewriterMarkdown content="Clickable" onClick={handleClick} isTyping={true} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick on Enter keydown', () => {
    const handleClick = vi.fn();
    render(<TypewriterMarkdown content="Keyboard" onClick={handleClick} isTyping={true} />);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('has tabIndex 0 when typing, -1 when not', () => {
    const { rerender } = render(<TypewriterMarkdown content="Test" isTyping={true} />);

    expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');

    rerender(<TypewriterMarkdown content="Test" isTyping={false} />);

    expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '-1');
  });

  it('auto-closes unclosed code blocks', async () => {
    // Partial markdown with unclosed code block
    render(<TypewriterMarkdown content="```javascript\nconst x = 1" />);

    // Should render without errors (sanitizePartialMarkdown closes the block)
    await vi.waitFor(() => {
      expect(screen.getByText(/const x = 1/)).toBeInTheDocument();
    });
  });

  it('auto-closes unclosed inline code', async () => {
    render(<TypewriterMarkdown content="This is `inline" />);

    await vi.waitFor(() => {
      expect(screen.getByText(/inline/)).toBeInTheDocument();
    });
  });

  it('renders markdown bold text', async () => {
    render(<TypewriterMarkdown content="This is **bold** text" />);

    await vi.waitFor(() => {
      const boldElement = screen.getByText('bold');
      expect(boldElement.tagName).toBe('STRONG');
    });
  });

  it('applies prose styling classes', () => {
    render(<TypewriterMarkdown content="Styled content" />);

    const container = screen.getByRole('button');
    expect(container).toHaveClass('prose', 'prose-sm', 'dark:prose-invert');
  });
});
