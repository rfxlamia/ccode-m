import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CodeBlock } from './CodeBlock';

// Mock react-syntax-highlighter to avoid async import issues in tests
vi.mock('react-syntax-highlighter/dist/esm/prism', () => ({
  default: ({ language, children }: { language: string; children: string }) => (
    <pre data-testid="syntax-highlighter" data-language={language}>
      {children}
    </pre>
  ),
}));
vi.mock('react-syntax-highlighter/dist/esm/styles/prism/one-dark', () => ({
  default: {},
}));

describe('CodeBlock', () => {
  it('should render fallback pre element before lazy loading completes', () => {
    render(
      <CodeBlock language="typescript">
        const x = 42;
      </CodeBlock>
    );

    // Initially shows fallback pre
    const preElement = screen.getByText('const x = 42;');
    expect(preElement).toBeInTheDocument();
    expect(preElement.tagName.toLowerCase()).toBe('pre');
  });

  it('should render with provided language prop', () => {
    render(
      <CodeBlock language="python">
        print("hello")
      </CodeBlock>
    );

    const codeElement = screen.getByText('print("hello")');
    expect(codeElement).toBeInTheDocument();
  });

  it('should handle empty code', () => {
    render(
      <CodeBlock language="typescript">{''}</CodeBlock>
    );

    // Empty content should still render pre element (self-closing)
    const preElement = document.querySelector('pre.bg-muted');
    expect(preElement).toBeInTheDocument();
  });

  it('should handle multi-line code', () => {
    const multiLineCode = `function hello() {
  console.log("world");
  return true;
}`;

    render(
      <CodeBlock language="javascript">{multiLineCode}</CodeBlock>
    );

    // Use partial text matching for multi-line content
    expect(screen.getByText((content) => content.includes('function hello()'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('console.log("world");'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('return true;'))).toBeInTheDocument();
  });

  it('should strip trailing newline from children', () => {
    render(
      <CodeBlock language="typescript">
        {`const x = 42;\n`}
      </CodeBlock>
    );

    expect(screen.getByText('const x = 42;')).toBeInTheDocument();
  });

  it('should preserve code formatting', () => {
    const formattedCode = `
      indented line
    another indented
    `.trim();

    render(
      <CodeBlock language="typescript">{formattedCode}</CodeBlock>
    );

    expect(screen.getByText(/indented line/)).toBeInTheDocument();
    expect(screen.getByText(/another indented/)).toBeInTheDocument();
  });
});
