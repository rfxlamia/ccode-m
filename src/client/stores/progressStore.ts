import { create } from 'zustand';
import type { Todo } from '@shared/types';

interface ProgressState {
  todos: Todo[];
  setTodos: (todos: Todo[]) => void;
  clearTodos: () => void;
}

export const useProgressStore = create<ProgressState>((set) => ({
  todos: [],
  setTodos: (todos) => {
    set({ todos });
  },
  clearTodos: () => {
    set({ todos: [] });
  },
}));
