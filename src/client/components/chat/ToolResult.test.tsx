import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ToolResult } from './ToolResult';

// Mock the CodeBlock component before importing
vi.mock('./CodeBlock', () => ({
  CodeBlock: ({ language, children }: { language: string; children: string }) => (
    <div data-testid="code-block" data-language={language}>
      <pre>{children}</pre>
    </div>
  ),
}));

describe('ToolResult', () => {
  const MAX_COLLAPSED_LINES = 15;

  describe('collapsible behavior', () => {
    it('should show "Show more" button when result exceeds MAX_COLLAPSED_LINES', () => {
      const longResult = Array.from({ length: 20 }, (_, i) => `Line ${String(i + 1)}`).join('\n');

      render(
        <ToolResult
          result={longResult}
          toolName="read"
          toolInput={{ file_path: '/test/file.ts' }}
        />
      );

      const showMoreButton = screen.queryByRole('button', { name: /expand tool result/i });
      expect(showMoreButton).toBeInTheDocument();
    });

    it('should NOT show "Show more" button when result is within limit', () => {
      const shortResult = Array.from({ length: 10 }, (_, i) => `Line ${String(i + 1)}`).join('\n');

      render(
        <ToolResult
          result={shortResult}
          toolName="read"
          toolInput={{ file_path: '/test/file.ts' }}
        />
      );

      const showMoreButton = screen.queryByRole('button', { name: /expand tool result/i });
      expect(showMoreButton).not.toBeInTheDocument();
    });

    it('should toggle between collapsed and expanded state', async () => {
      const user = userEvent.setup();
      const longResult = Array.from({ length: 20 }, (_, i) => `Line ${String(i + 1)}`).join('\n');

      render(
        <ToolResult
          result={longResult}
          toolName="read"
          toolInput={{ file_path: '/test/file.ts' }}
        />
      );

      const expandButton = screen.getByRole('button', { name: /expand tool result/i });
      const resultContainer = screen.getByTestId('tool-result-content');

      // Initially collapsed - should show only first MAX_COLLAPSED_LINES
      expect(resultContainer).toHaveTextContent('Line 1');
      expect(resultContainer).toHaveTextContent(`Line ${String(MAX_COLLAPSED_LINES)}`);
      expect(resultContainer).not.toHaveTextContent(`Line ${String(MAX_COLLAPSED_LINES + 1)}`);

      // Click to expand
      await user.click(expandButton);

      // Now expanded - should show all lines
      expect(resultContainer).toHaveTextContent('Line 1');
      expect(resultContainer).toHaveTextContent(`Line ${String(MAX_COLLAPSED_LINES + 1)}`);
      expect(resultContainer).toHaveTextContent('Line 20');
    });

    it('should show "Show less" button when expanded', async () => {
      const user = userEvent.setup();
      const longResult = Array.from({ length: 20 }, (_, i) => `Line ${String(i + 1)}`).join('\n');

      render(
        <ToolResult
          result={longResult}
          toolName="read"
          toolInput={{ file_path: '/test/file.ts' }}
        />
      );

      const expandButton = screen.getByRole('button', { name: /expand tool result/i });

      await user.click(expandButton);

      const collapseButton = screen.queryByRole('button', { name: /collapse tool result/i });
      expect(collapseButton).toBeInTheDocument();
    });
  });

  describe('rendering tool-specific results', () => {
    it('should render Read tool result with CodeBlock', () => {
      const fileContent = 'const x = 42;';

      render(
        <ToolResult
          result={fileContent}
          toolName="read"
          toolInput={{ file_path: '/test/file.ts' }}
        />
      );

      // CodeBlock is lazy-loaded, so initially shows fallback with pre tag
      const preElement = screen.getByText('const x = 42;');
      expect(preElement).toBeInTheDocument();
    });

    it('should render Write tool result with success message', () => {
      render(
        <ToolResult
          result="File created successfully at: /test/file.md"
          toolName="write"
          toolInput={{ file_path: '/test/file.md' }}
        />
      );

      expect(screen.getByText(/File created:/i)).toBeInTheDocument();
      expect(screen.getByText('/test/file.md')).toBeInTheDocument();
    });

    it('should render Edit tool result with diff preview and file path', () => {
      render(
        <ToolResult
          result="Edit completed"
          toolName="edit"
          toolInput={{
            file_path: '/test/file.ts',
            old_string: 'const old = true;',
            new_string: 'const new = false;',
          }}
        />
      );

      // Should show file path
      expect(screen.getByText('File:')).toBeInTheDocument();
      expect(screen.getByText('/test/file.ts')).toBeInTheDocument();
      // Should show diff
      expect(screen.getByText(/removed:/i)).toBeInTheDocument();
      expect(screen.getByText(/added:/i)).toBeInTheDocument();
      expect(screen.getByText('const old = true;')).toBeInTheDocument();
      expect(screen.getByText('const new = false;')).toBeInTheDocument();
    });

    it('should render Bash tool result with monospace output', () => {
      const bashOutput = `total 100
drwxr-xr-x  5 user  staff  160 Jan 24 10:00 .`;

      render(
        <ToolResult
          result={bashOutput}
          toolName="bash"
          toolInput={{ command: 'ls -la' }}
        />
      );

      // Find the pre element containing bash output
      const output = screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'pre' &&
          content.includes('total 100');
      });
      // Verify the monospace pre element is rendered
      expect(output).toBeInTheDocument();
      expect(output.tagName.toLowerCase()).toBe('pre');
    });

    it('should render generic tool result for unknown tools', () => {
      render(
        <ToolResult
          result="Some generic result"
          toolName="unknownTool"
          toolInput={{ param: 'value' }}
        />
      );

      expect(screen.getByText('Some generic result')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty result gracefully', () => {
      render(
        <ToolResult
          result=""
          toolName="read"
          toolInput={{ file_path: '/test/file.ts' }}
        />
      );

      const resultContainer = screen.queryByTestId('tool-result-content');
      // Empty results should not render the container
      expect(resultContainer).not.toBeInTheDocument();
    });

    it('should handle result with exactly MAX_COLLAPSED_LINES lines', () => {
      const exactResult = Array.from(
        { length: MAX_COLLAPSED_LINES },
        (_, i) => `Line ${String(i + 1)}`
      ).join('\n');

      render(
        <ToolResult
          result={exactResult}
          toolName="read"
          toolInput={{ file_path: '/test/file.ts' }}
        />
      );

      const showMoreButton = screen.queryByRole('button', { name: /expand tool result/i });
      expect(showMoreButton).not.toBeInTheDocument();
    });

    it('should handle single line result', () => {
      render(
        <ToolResult
          result="Single line result"
          toolName="read"
          toolInput={{ file_path: '/test/file.ts' }}
        />
      );

      expect(screen.getByText('Single line result')).toBeInTheDocument();
      const showMoreButton = screen.queryByRole('button', { name: /expand tool result/i });
      expect(showMoreButton).not.toBeInTheDocument();
    });
  });
});
