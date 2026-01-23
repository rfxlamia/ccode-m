import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Todo } from '@shared/types';
import { TodoItem } from './TodoItem';

describe('TodoItem', () => {
  it('renders pending content and icon', () => {
    const todo: Todo = {
      id: 'todo-1',
      content: 'Read docs',
      status: 'pending',
      activeForm: 'Reading docs...',
    };

    const { container } = render(<TodoItem todo={todo} />);

    expect(screen.getByText('Read docs')).toBeInTheDocument();
    const item = screen.getByLabelText('Read docs: pending');
    const icon = item.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-muted-foreground');
    expect(icon).not.toHaveClass('animate-spin');
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('renders activeForm when in progress with spinner icon', () => {
    const todo: Todo = {
      id: 'todo-2',
      content: 'Parse output',
      status: 'in_progress',
      activeForm: 'Parsing output...',
    };

    const { container } = render(<TodoItem todo={todo} />);

    expect(screen.getByText('Parsing output...')).toBeInTheDocument();
    expect(screen.queryByText('Parse output')).not.toBeInTheDocument();
    const item = screen.getByLabelText('Parse output: in_progress');
    const icon = item.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('animate-spin');
    expect(icon).toHaveClass('text-blue-500');
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('renders completed content with strikethrough and check icon', () => {
    const todo: Todo = {
      id: 'todo-3',
      content: 'Render panel',
      status: 'completed',
      activeForm: 'Rendering panel...',
    };

    const { container } = render(<TodoItem todo={todo} />);

    const text = screen.getByText('Render panel');
    expect(text).toHaveClass('line-through');
    expect(text).toHaveClass('text-muted-foreground');
    const item = screen.getByLabelText('Render panel: completed');
    const icon = item.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-green-500');
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('falls back to content when in_progress has empty activeForm', () => {
    const todo: Todo = {
      id: 'todo-4',
      content: 'Fallback content',
      status: 'in_progress',
      activeForm: '',
    };

    render(<TodoItem todo={todo} />);

    // Should show content as fallback when activeForm is empty
    expect(screen.getByText('Fallback content')).toBeInTheDocument();
    // Verify the spinner icon is still shown for in_progress
    const item = screen.getByLabelText('Fallback content: in_progress');
    const icon = item.querySelector('svg');
    expect(icon).toHaveClass('animate-spin');
  });
});
