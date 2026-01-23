import { FileIcon, ListTodoIcon } from 'lucide-react';
import { useProgressStore } from '@/stores/progressStore';
import { TodoItem } from './TodoItem';

export function ProgressPanel(): React.ReactElement {
  const todos = useProgressStore((state) => state.todos);
  const hasTodos = todos.length > 0;

  return (
    <aside
      role="complementary"
      aria-label="Progress and artifacts"
      className="h-full bg-sidebar p-6"
    >
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
        PROGRESS
      </h2>
      {hasTodos ? (
        <ul aria-live="polite" className="max-h-48 space-y-2 overflow-y-auto">
          {todos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ListTodoIcon
            className="mb-3 h-12 w-12 text-muted-foreground/50"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">No tasks in progress</p>
        </div>
      )}

      <h2 className="mb-4 mt-8 text-sm font-semibold text-muted-foreground">
        ARTIFACTS
      </h2>
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileIcon
          className="mb-2 h-8 w-8 text-muted-foreground/50"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">No artifacts yet</p>
      </div>
    </aside>
  );
}
