import {
  memo,
  useMemo,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ComponentType,
  type CSSProperties,
} from 'react';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import type { SyntaxHighlighterProps } from 'react-syntax-highlighter';

const ReactMarkdown = lazy(() => import('react-markdown'));

type SyntaxTheme = Record<string, CSSProperties>;

type TypewriterMarkdownProps = {
  content: string;
  isTyping?: boolean;
  onClick?: (() => void) | undefined;
};

export const TypewriterMarkdown = memo(function TypewriterMarkdown({
  content,
  isTyping = false,
  onClick,
}: TypewriterMarkdownProps): React.ReactElement {
  const sanitized = useMemo(() => sanitizePartialMarkdown(content), [content]);

  const markdownComponents: Components = {
    code({ className, children, ...props }) {
      // Detect inline vs block code by checking for language class
      const match = /language-(\w+)/.exec(className ?? '');
      const isInline = !match;
      const codeText = Array.isArray(children)
        ? children.join('')
        : typeof children === 'string' || typeof children === 'number'
          ? String(children)
          : '';

      if (!isInline) {
        const language = match[1] ?? 'text';
        return (
          <Suspense fallback={<pre className="bg-muted p-2">{codeText}</pre>}>
            <CodeBlock language={language}>{codeText}</CodeBlock>
          </Suspense>
        );
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={isTyping ? 0 : -1}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onClick?.();
        }
      }}
    >
      <Suspense fallback={<p className="whitespace-pre-wrap">{sanitized}</p>}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {sanitized}
        </ReactMarkdown>
      </Suspense>
      {isTyping && (
        <span className="inline-block w-2 h-4 bg-foreground animate-pulse ml-0.5" />
      )}
    </div>
  );
});

function CodeBlock({ language, children }: { language: string; children: string }): React.ReactElement {
  const [Highlighter, setHighlighter] = useState<ComponentType<SyntaxHighlighterProps> | null>(
    null
  );
  const [style, setStyle] = useState<SyntaxTheme | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadHighlighter = import('react-syntax-highlighter/dist/esm/prism').then(
      (mod) => mod.default as ComponentType<SyntaxHighlighterProps>
    );
    const loadStyle = import('react-syntax-highlighter/dist/esm/styles/prism/one-dark').then(
      (mod) => mod.default as SyntaxTheme
    );

    void Promise.all([loadHighlighter, loadStyle]).then(([highlighterComponent, styleTheme]) => {
      if (!isActive) return;
      setHighlighter(() => highlighterComponent);
      setStyle(styleTheme);
    });

    return () => {
      isActive = false;
    };
  }, []);

  if (!Highlighter || !style) {
    return <pre className="bg-muted p-2">{children}</pre>;
  }

  return (
    <Highlighter language={language} style={style} PreTag="div">
      {children.replace(/\n$/, '')}
    </Highlighter>
  );
}

function sanitizePartialMarkdown(text: string): string {
  let result = text;
  const codeBlocks = result.match(/```/g);
  if (codeBlocks && codeBlocks.length % 2 !== 0) {
    result += '\n```';
  }
  const inlineCode = result.match(/(?<!`)`(?!`)/g);
  if (inlineCode && inlineCode.length % 2 !== 0) {
    result += '`';
  }
  return result;
}
