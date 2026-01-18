import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  it('renders textarea with placeholder', () => {
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.getByPlaceholderText(/what would you like claude to do/i)).toBeInTheDocument();
  });

  it('renders send button', () => {
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('disables send button when input is empty', () => {
    render(<ChatInput onSend={vi.fn()} />);
    const button = screen.getByRole('button', { name: /send message/i });
    expect(button).toBeDisabled();
  });

  it('enables send button when input has text', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={vi.fn()} />);

    await user.type(screen.getByRole('textbox'), 'Hello Claude');

    const button = screen.getByRole('button', { name: /send message/i });
    expect(button).not.toBeDisabled();
  });

  it('calls onSend with message when button clicked', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    await user.type(screen.getByRole('textbox'), 'Hello Claude');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSend).toHaveBeenCalledWith('Hello Claude');
  });

  it('clears input after sending', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={vi.fn()} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Hello Claude');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(input).toHaveValue('');
  });

  it('sends message on Cmd+Enter', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Hello Claude');
    await user.keyboard('{Meta>}{Enter}{/Meta}');

    expect(onSend).toHaveBeenCalledWith('Hello Claude');
  });

  it('sends message on Ctrl+Enter (Windows)', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Hello Claude');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(onSend).toHaveBeenCalledWith('Hello Claude');
  });

  it('does not send empty messages', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not send whitespace-only messages', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    await user.type(screen.getByRole('textbox'), '   ');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it('trims whitespace from sent messages', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    await user.type(screen.getByRole('textbox'), '  Hello Claude  ');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSend).toHaveBeenCalledWith('Hello Claude');
  });

  it('accepts controlled value prop', () => {
    render(<ChatInput onSend={vi.fn()} value="Pre-filled text" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('Pre-filled text');
  });

  it('calls onChange when typing in controlled mode', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChatInput onSend={vi.fn()} value="" onChange={onChange} />);

    await user.type(screen.getByRole('textbox'), 'H');

    expect(onChange).toHaveBeenCalledWith('H');
  });
});
