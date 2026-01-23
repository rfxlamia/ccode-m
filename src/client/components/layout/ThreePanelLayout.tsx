import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ProjectFilesPanel } from '@/components/files/ProjectFilesPanel';
import { ProgressPanel } from '@/components/progress/ProgressPanel';

/** Default layout: 20% left, 60% center, 20% right */
const DEFAULT_LAYOUT = { files: 20, chat: 60, progress: 20 };

export function ThreePanelLayout(): React.ReactElement {
  return (
    <div className="h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Skip to main content
      </a>
      <h1 className="sr-only">Claude Code Modern</h1>

      <ResizablePanelGroup
        orientation="horizontal"
        className="h-full"
        defaultLayout={DEFAULT_LAYOUT}
      >
        <ResizablePanel
          id="files"
          defaultSize="20%"
          minSize="15%"
          maxSize="30%"
        >
          <ProjectFilesPanel />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel id="chat" defaultSize="60%" minSize="40%">
          <ChatPanel />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          id="progress"
          defaultSize="20%"
          minSize="15%"
          maxSize="30%"
        >
          <ProgressPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
