import { FileIcon, ListTodoIcon } from 'lucide-react';

export function ProgressPanel(): JSX.Element {
  return (
    <aside
      role="complementary"
      aria-label="Progress and artifacts"
      className="h-full bg-sidebar p-6"
    >
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
        PROGRESS
      </h2>
      <div className="flex h-[calc(100%-4rem)] flex-col items-center justify-center text-center">
        <ListTodoIcon
          className="mb-3 h-12 w-12 text-muted-foreground/50"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">No tasks in progress</p>
      </div>

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
