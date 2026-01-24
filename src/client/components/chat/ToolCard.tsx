import { memo, useCallback } from 'react';
import {
  FileText,
  FilePlus,
  FileEdit,
  Terminal,
  Search,
  FolderSearch,
  Loader2,
  Wrench,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import type { ToolInvocation } from '@shared/types';
import { useToolStore } from '@/stores/toolStore';
import { cn } from '@/lib/utils';
import { getStringInput } from '@/lib/languageDetection';
import { ToolResult } from './ToolResult';

const TOOL_ICONS: Record<string, LucideIcon> = {
  read: FileText,
  write: FilePlus,
  edit: FileEdit,
  bash: Terminal,
  glob: FolderSearch,
  grep: Search,
};

const TOOL_COLORS: Record<string, string> = {
  read: 'border-l-blue-500',
  write: 'border-l-green-500',
  edit: 'border-l-yellow-500',
  bash: 'border-l-slate-500',
  glob: 'border-l-cyan-500',
  grep: 'border-l-orange-500',
};

function normalizeToolName(toolName: string): string {
  return toolName.trim().toLowerCase();
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function formatUnknownValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `array(${String(value.length)})`;
  if (typeof value === 'object') return 'object';
  return 'unknown';
}

function formatToolParams(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case 'read':
      return `Reading: ${getStringInput(input, 'file_path', 'unknown file')}`;
    case 'write':
      return `Writing: ${getStringInput(input, 'file_path', 'unknown file')}`;
    case 'edit':
      return `Editing: ${getStringInput(input, 'file_path', 'unknown file')}`;
    case 'bash':
      return `$ ${getStringInput(input, 'command', 'command')}`;
    case 'glob':
      return `Finding: ${getStringInput(input, 'pattern', '*')} in ${getStringInput(
        input,
        'path',
        '.'
      )}`;
    case 'grep':
      return `Searching: "${getStringInput(input, 'pattern', '')}" in ${getStringInput(
        input,
        'path',
        '.'
      )}`;
    default: {
      const entries = Object.entries(input);
      if (entries.length === 0) {
        return 'No parameters';
      }
      const summary = entries
        .map(([key, value]) => `${key}=${formatUnknownValue(value)}`)
        .join(', ');
      return truncateText(summary, 50);
    }
  }
}

function StatusIcon({ status }: { status: ToolInvocation['status'] }): React.ReactElement {
  switch (status) {
    case 'pending':
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Running" />;
    case 'complete':
      return <Check className="h-4 w-4 text-green-600" aria-label="Complete" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" aria-label="Error" />;
  }
}

interface ToolCardProps {
  tool: ToolInvocation;
}

export const ToolCard = memo(function ToolCard({ tool }: ToolCardProps): React.ReactElement {
  const toggleExpanded = useToolStore((state) => state.toggleExpanded);
  const normalizedName = normalizeToolName(tool.toolName);
  const Icon = TOOL_ICONS[normalizedName] ?? Wrench;
  const borderColor = TOOL_COLORS[normalizedName] ?? 'border-l-border';
  const formattedParams = formatToolParams(normalizedName, tool.toolInput);
  const previewLine = formattedParams.split('\n')[0] ?? formattedParams;
  const iconTestId = TOOL_ICONS[normalizedName] ? `tool-icon-${normalizedName}` : 'tool-icon-unknown';

  const handleToggle = useCallback(() => {
    toggleExpanded(tool.id);
  }, [toggleExpanded, tool.id]);

  return (
    <div
      className={cn(
        'my-2 rounded-md border border-border border-l-4 bg-muted/50',
        borderColor,
        tool.status === 'error' && 'border-l-destructive bg-destructive/10'
      )}
      role="status"
      aria-label={`Tool: ${tool.toolName}, Status: ${tool.status}`}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-2 p-3 text-left hover:bg-muted/80"
        aria-expanded={tool.isExpanded}
      >
        {tool.isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
        <Icon
          className="h-4 w-4 text-muted-foreground"
          aria-hidden="true"
          data-testid={iconTestId}
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{tool.toolName}</div>
          <div
            className="truncate text-xs text-muted-foreground"
            data-testid="tool-params-preview"
          >
            {previewLine}
          </div>
        </div>
        <StatusIcon status={tool.status} />
        {tool.isCached && (
          <span className="rounded bg-secondary px-1 text-xs text-secondary-foreground">
            cached
          </span>
        )}
      </button>

      {tool.isExpanded && (
        <div className="border-t border-border px-3 pb-3 pt-2" data-testid="tool-params-expanded">
          <p className="font-mono text-sm text-muted-foreground">{formattedParams}</p>
          {tool.status === 'error' && tool.errorMessage && (
            <p className="mt-2 text-sm text-destructive">{tool.errorMessage}</p>
          )}
          {tool.status === 'complete' && tool.result && (
            <ToolResult
              result={tool.result}
              toolName={tool.toolName}
              toolInput={tool.toolInput}
            />
          )}
        </div>
      )}
    </div>
  );
});
