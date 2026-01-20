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
  onClick?: () => void;
};

export const TypewriterMarkdown = memo(function TypewriterMarkdown({
  content,
  isTyping = false,
  onClick,
}: TypewriterMarkdownProps): JSX.Element {
  const sanitized = useMemo(() => sanitizePartialMarkdown(content), [content]);

  const markdownComponents: Components = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    code({ inline, className, children, node, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const codeText = Array.isArray(children)
        ? children.join('')
        : typeof children === 'string' || typeof children === 'number'
          ? String(children)
          : '';

      if (!inline && match) {
        return (
          <Suspense fallback={<pre className="bg-muted p-2">{codeText}</pre>}>
            <CodeBlock language={match[1]}>{codeText}</CodeBlock>
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

function CodeBlock({ language, children }: { language: string; children: string }): JSX.Element {
  const [Highlighter, setHighlighter] = useState<ComponentType<SyntaxHighlighterProps> | null>(
    null
  );
  const [style, setStyle] = useState<SyntaxTheme | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadHighlighter = import('react-syntax-highlighter/dist/esm/prism') as Promise<{
      Prism: ComponentType<SyntaxHighlighterProps>;
    }>;
    const loadStyle = import('react-syntax-highlighter/dist/esm/styles/prism/one-dark') as Promise<{
      default: SyntaxTheme;
    }>;

    void Promise.all([loadHighlighter, loadStyle]).then(([highlighterModule, styleModule]) => {
      if (!isActive) return;
      setHighlighter(() => highlighterModule.Prism);
      setStyle(styleModule.default);
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
