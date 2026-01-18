import { FolderIcon } from 'lucide-react';

export function ProjectFilesPanel(): JSX.Element {
  return (
    <aside
      role="complementary"
      aria-label="Project files"
      className="h-full bg-sidebar p-6"
    >
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
        PROJECT FILES
      </h2>
      <div className="flex h-[calc(100%-2rem)] flex-col items-center justify-center text-center">
        <FolderIcon
          className="mb-3 h-12 w-12 text-muted-foreground/50"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">No project loaded</p>
      </div>
    </aside>
  );
}
