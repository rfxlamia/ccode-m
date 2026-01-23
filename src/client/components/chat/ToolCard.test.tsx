import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ToolCard } from './ToolCard';
import { useToolStore } from '@/stores/toolStore';
import type { ToolInvocation } from '@shared/types';

function createTool(overrides: Partial<ToolInvocation> = {}): ToolInvocation {
  return {
    id: 'tool-0',
    toolName: 'Read',
    toolInput: { file_path: '/tmp/example.txt' },
    status: 'pending',
    timestamp: new Date(),
    isExpanded: false,
    ...overrides,
  };
}

function ToolCardHarness({ id }: { id: string }): React.ReactElement | null {
  const tool = useToolStore((state) => state.tools.find((item) => item.id === id));
  if (!tool) return null;
  return <ToolCard tool={tool} />;
}

describe('src/client/components/chat/ToolCard.tsx', () => {
  beforeEach(() => {
    act(() => {
      useToolStore.setState({
        tools: [],
        nextId: 0,
      });
    });
  });

  it.each([
    ['Read', 'tool-icon-read'],
    ['Write', 'tool-icon-write'],
    ['Edit', 'tool-icon-edit'],
    ['Bash', 'tool-icon-bash'],
    ['Glob', 'tool-icon-glob'],
    ['Grep', 'tool-icon-grep'],
  ])('renders icon for %s', (toolName, testId) => {
    const tool = createTool({ toolName });
    render(<ToolCard tool={tool} />);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('renders status icons for pending, complete, and error', () => {
    const pendingTool = createTool({ status: 'pending' });
    const completeTool = createTool({ status: 'complete', id: 'tool-1' });
    const errorTool = createTool({ status: 'error', id: 'tool-2', errorMessage: 'boom' });

    render(
      <div>
        <ToolCard tool={pendingTool} />
        <ToolCard tool={completeTool} />
        <ToolCard tool={errorTool} />
      </div>
    );

    expect(screen.getByLabelText('Running')).toBeInTheDocument();
    expect(screen.getByLabelText('Complete')).toBeInTheDocument();
    expect(screen.getByLabelText('Error')).toBeInTheDocument();
  });

  it('formats parameters per tool type', () => {
    render(
      <div>
        <ToolCard tool={createTool({ toolName: 'Read', toolInput: { file_path: '/a.ts' } })} />
        <ToolCard tool={createTool({ toolName: 'Write', toolInput: { file_path: '/b.ts' } })} />
        <ToolCard tool={createTool({ toolName: 'Edit', toolInput: { file_path: '/c.ts' } })} />
        <ToolCard tool={createTool({ toolName: 'Bash', toolInput: { command: 'ls -la' } })} />
        <ToolCard tool={createTool({ toolName: 'Glob', toolInput: { pattern: '**/*.ts', path: '/src' } })} />
        <ToolCard tool={createTool({ toolName: 'Grep', toolInput: { pattern: 'foo', path: '/src' } })} />
      </div>
    );

    expect(screen.getByText('Reading: /a.ts')).toBeInTheDocument();
    expect(screen.getByText('Writing: /b.ts')).toBeInTheDocument();
    expect(screen.getByText('Editing: /c.ts')).toBeInTheDocument();
    expect(screen.getByText('$ ls -la')).toBeInTheDocument();
    expect(screen.getByText('Finding: **/*.ts in /src')).toBeInTheDocument();
    expect(screen.getByText('Searching: "foo" in /src')).toBeInTheDocument();
  });

  it('shows cached badge when tool result is cached', () => {
    const tool = createTool({ status: 'complete', isCached: true });
    render(<ToolCard tool={tool} />);
    expect(screen.getByText('cached')).toBeInTheDocument();
  });

  it('handles unknown tools gracefully with summary', () => {
    const tool = createTool({
      toolName: 'MagicTool',
      toolInput: { alpha: 'value', beta: 'extra-long-value-here' },
    });
    render(<ToolCard tool={tool} />);
    const preview = screen.getByTestId('tool-params-preview');
    // Preview should have text content with alpha key
    expect(preview).toHaveTextContent(/alpha=/);
    // Unknown tool summary should be truncated to max 50 chars + "..."
    expect(preview.textContent.length).toBeLessThanOrEqual(53);
  });

  it('toggles expanded state on click', () => {
    act(() => {
      useToolStore.setState({
        tools: [createTool({ id: 'tool-99', isExpanded: false })],
        nextId: 1,
      });
    });

    render(<ToolCardHarness id="tool-99" />);

    expect(screen.queryByTestId('tool-params-expanded')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('tool-params-expanded')).toBeInTheDocument();
  });
});
