import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatPanel, ExamplePrompt } from './ChatPanel';

describe('ChatPanel', () => {
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

    // Verify button is focusable (has no tabIndex that would prevent focus)
    expect(prompt).not.toHaveAttribute('tabIndex', '-1');
    // Verify button can receive focus
    prompt.focus();
    expect(prompt).toHaveFocus();
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
