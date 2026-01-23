import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import type { Todo } from '@shared/types';
import { useProgressStore } from '@/stores/progressStore';
import { ProgressPanel } from './ProgressPanel';

describe('ProgressPanel', () => {
  beforeEach(() => {
    act(() => {
      useProgressStore.setState({ todos: [] });
    });
  });

  it('renders with the correct aria label', () => {
    render(<ProgressPanel />);

    expect(
      screen.getByLabelText(/progress and artifacts/i, { selector: 'aside' })
    ).toBeInTheDocument();
  });

  it('shows the empty state', () => {
    render(<ProgressPanel />);

    expect(
      screen.getByRole('heading', { name: /progress/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/no tasks in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/no artifacts yet/i)).toBeInTheDocument();
  });

  it('renders the todo list when progress items exist', () => {
    const todos: Todo[] = [
      {
        id: 'todo-1',
        content: 'Read config',
        status: 'pending',
        activeForm: 'Reading config...',
      },
      {
        id: 'todo-2',
        content: 'Stream output',
        status: 'in_progress',
        activeForm: 'Streaming output...',
      },
    ];

    act(() => {
      useProgressStore.setState({ todos });
    });

    render(<ProgressPanel />);

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText('Read config')).toBeInTheDocument();
    expect(screen.getByText('Streaming output...')).toBeInTheDocument();
    expect(screen.queryByText(/no tasks in progress/i)).not.toBeInTheDocument();
  });
});
