import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThreePanelLayout } from './ThreePanelLayout';

describe('ThreePanelLayout', () => {
  it('renders three panels with correct roles', () => {
    render(<ThreePanelLayout />);

    const asides = screen.getAllByRole('complementary');
    expect(asides).toHaveLength(2);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('displays correct aria labels', () => {
    render(<ThreePanelLayout />);

    expect(screen.getByLabelText(/project files/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/chat/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/progress/i)).toBeInTheDocument();
  });

  it('shows empty state placeholders', () => {
    render(<ThreePanelLayout />);

    expect(screen.getByText(/no project loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/start a conversation/i)).toBeInTheDocument();
    expect(screen.getByText(/no tasks in progress/i)).toBeInTheDocument();
  });

  it('has skip link for keyboard users', () => {
    render(<ThreePanelLayout />);

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('has keyboard-navigable interactive elements in logical order', async () => {
    const user = userEvent.setup();
    render(<ThreePanelLayout />);

    // Get all interactive elements (buttons in example prompts)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Focus first button and verify focus moves through elements
    buttons[0].focus();
    expect(buttons[0]).toHaveFocus();

    // Tab to next button
    await user.tab();
    // Should move to next interactive element
    expect(document.activeElement).not.toBe(buttons[0]);
  });
});
