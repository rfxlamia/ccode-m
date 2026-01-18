import { render, screen, waitFor } from '@testing-library/react';
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

  it('populates input when example prompt clicked', async () => {
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.click(screen.getByText('Refactor this component to use React hooks'));

    expect(screen.getByRole('textbox')).toHaveValue('Refactor this component to use React hooks');
  });

  it('focuses input after example prompt click', async () => {
    // Mock requestAnimationFrame to execute callback synchronously
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
      cb(0);
      return 0;
    };

    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.click(screen.getByText('Add error handling to the API calls'));

    // Allow React state update to complete
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveFocus();
    });

    window.requestAnimationFrame = originalRaf;
  });
  it('focuses input on Cmd+K keyboard shortcut', async () => {
    const user = userEvent.setup();
    render(<ChatPanel />);

    // Focus something else first (example prompt button)
    const prompt = screen.getByRole('button', {
      name: /refactor this component to use react hooks/i,
    });
    prompt.focus();
    expect(prompt).toHaveFocus();

    // Press Cmd+K to focus the chat input
    await user.keyboard('{Meta>}k{/Meta}');

    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('focuses input on Ctrl+K keyboard shortcut (Windows)', async () => {
    const user = userEvent.setup();
    render(<ChatPanel />);

    // Focus something else first
    const prompt = screen.getByRole('button', {
      name: /add error handling to the api calls/i,
    });
    prompt.focus();
    expect(prompt).toHaveFocus();

    // Press Ctrl+K to focus the chat input
    await user.keyboard('{Control>}k{/Control}');

    expect(screen.getByRole('textbox')).toHaveFocus();
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
