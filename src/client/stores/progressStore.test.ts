import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Todo } from '@shared/types';
import { useProgressStore } from './progressStore';

describe('useProgressStore', () => {
  beforeEach(() => {
    act(() => {
      useProgressStore.setState({
        todos: [],
      });
    });
  });

  it('should have empty todos by default', () => {
    const { result } = renderHook(() => useProgressStore());
    expect(result.current.todos).toEqual([]);
  });

  it('should set todos', () => {
    const { result } = renderHook(() => useProgressStore());
    const sampleTodos: Todo[] = [
      { id: 'todo-1', content: 'Read config', status: 'pending', activeForm: 'Reading config...' },
      { id: 'todo-2', content: 'Parse output', status: 'in_progress', activeForm: 'Parsing output...' },
    ];

    act(() => {
      result.current.setTodos(sampleTodos);
    });

    expect(result.current.todos).toEqual(sampleTodos);
  });

  it('should clear todos', () => {
    const { result } = renderHook(() => useProgressStore());
    const sampleTodos: Todo[] = [
      { id: 'todo-1', content: 'Render panel', status: 'completed', activeForm: 'Rendering panel...' },
    ];

    act(() => {
      result.current.setTodos(sampleTodos);
    });

    expect(result.current.todos).toHaveLength(1);

    act(() => {
      result.current.clearTodos();
    });

    expect(result.current.todos).toEqual([]);
  });
});
