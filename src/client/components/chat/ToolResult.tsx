import { memo, useState, useCallback } from 'react';
import { CodeBlock } from './CodeBlock';
import { getLanguageFromPath, getStringInput } from '@/lib/languageDetection';

const MAX_COLLAPSED_LINES = 15;

interface ToolResultProps {
  result: string;
  toolName: string;
  toolInput: Record<string, unknown>;
}

function normalizeToolName(toolName: string): string {
  return toolName.trim().toLowerCase();
}

function ReadToolResult({
  result,
  toolInput,
}: {
  result: string;
  toolInput: Record<string, unknown>;
}): React.ReactElement {
  const filePath = getStringInput(toolInput, 'file_path', 'unknown');
  const language = getLanguageFromPath(filePath);

  return <CodeBlock language={language}>{result}</CodeBlock>;
}

function WriteToolResult({
  toolInput,
}: {
  toolInput: Record<string, unknown>;
}): React.ReactElement {
  const filePath = getStringInput(toolInput, 'file_path', 'unknown');

  return (
    <div className="text-sm">
      <span className="text-green-600 dark:text-green-400 font-medium">File created:</span>{' '}
      <code className="bg-muted px-1 py-0.5 rounded">{filePath}</code>
    </div>
  );
}

function EditToolResult({
  toolInput,
}: {
  toolInput: Record<string, unknown>;
}): React.ReactElement {
  const filePath = getStringInput(toolInput, 'file_path', 'unknown');
  const oldString = getStringInput(toolInput, 'old_string', '');
  const newString = getStringInput(toolInput, 'new_string', '');

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">
        <span className="font-medium">File:</span>{' '}
        <code className="bg-muted px-1 py-0.5 rounded">{filePath}</code>
      </div>
      {oldString && (
        <div className="rounded bg-red-100 dark:bg-red-900/20 p-2">
          <span className="text-xs text-red-700 dark:text-red-300 font-medium">Removed:</span>
          <pre className="mt-1 text-sm overflow-x-auto">{oldString}</pre>
        </div>
      )}
      {newString && (
        <div className="rounded bg-green-100 dark:bg-green-900/20 p-2">
          <span className="text-xs text-green-700 dark:text-green-300 font-medium">Added:</span>
          <pre className="mt-1 text-sm overflow-x-auto">{newString}</pre>
        </div>
      )}
    </div>
  );
}

function BashToolResult({
  result,
}: {
  result: string;
}): React.ReactElement {
  return (
    <pre className="font-mono text-sm bg-muted p-2 rounded whitespace-pre-wrap break-words">
      {result}
    </pre>
  );
}

function GenericToolResult({
  result,
}: {
  result: string;
}): React.ReactElement {
  return (
    <pre className="text-sm bg-muted p-2 rounded whitespace-pre-wrap break-words overflow-x-auto">
      {result}
    </pre>
  );
}

export const ToolResult = memo(function ToolResult({
  result,
  toolName,
  toolInput,
}: ToolResultProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const normalizedName = normalizeToolName(toolName);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Don't render anything for empty results
  if (!result || result.trim().length === 0) {
    return <></>;
  }

  const lines = result.split('\n');
  const shouldShowCollapseButton = lines.length > MAX_COLLAPSED_LINES;
  const displayedContent = isExpanded || !shouldShowCollapseButton
    ? result
    : lines.slice(0, MAX_COLLAPSED_LINES).join('\n');

  const renderToolSpecificResult = (): React.ReactElement => {
    switch (normalizedName) {
      case 'read':
        return <ReadToolResult result={displayedContent} toolInput={toolInput} />;
      case 'write':
        return <WriteToolResult toolInput={toolInput} />;
      case 'edit':
        return <EditToolResult toolInput={toolInput} />;
      case 'bash':
        return <BashToolResult result={displayedContent} />;
      default:
        return <GenericToolResult result={displayedContent} />;
    }
  };

  return (
    <div className="mt-2" data-testid="tool-result-content">
      {renderToolSpecificResult()}
      {shouldShowCollapseButton && (
        <button
          type="button"
          onClick={handleToggle}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse tool result' : 'Expand tool result'}
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
});
