import { Check, Circle, Loader2 } from 'lucide-react';
import type { Todo } from '@shared/types';

interface TodoItemProps {
  todo: Todo;
}

export function TodoItem({ todo }: TodoItemProps): JSX.Element {
  const isCompleted = todo.status === 'completed';
  const isInProgress = todo.status === 'in_progress';

  return (
    <li className="flex items-start gap-2" aria-label={`${todo.content}: ${todo.status}`}>
      <span className="mt-0.5 flex-shrink-0" aria-hidden="true">
        {isCompleted && <Check className="h-4 w-4 text-green-500" />}
        {isInProgress && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
        {todo.status === 'pending' && <Circle className="h-4 w-4 text-muted-foreground" />}
      </span>
      <span
        className={`text-sm ${
          isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
        }`}
      >
        {isInProgress ? (todo.activeForm || todo.content) : todo.content}
      </span>
    </li>
  );
}
