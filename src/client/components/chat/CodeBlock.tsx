import { memo, useState, useEffect, type ComponentType, type CSSProperties } from 'react';
import type { SyntaxHighlighterProps as RSHProps } from 'react-syntax-highlighter';

type SyntaxTheme = Record<string, CSSProperties>;
type SyntaxHighlighterComponent = ComponentType<RSHProps>;

interface CodeBlockProps {
  language: string;
  children: string;
}

export const CodeBlock = memo(function CodeBlock({
  language,
  children,
}: CodeBlockProps): React.ReactElement {
  const [Highlighter, setHighlighter] = useState<SyntaxHighlighterComponent | null>(null);
  const [style, setStyle] = useState<SyntaxTheme | null>(null);

  useEffect(() => {
    let isActive = true;

    void Promise.all([
      import('react-syntax-highlighter/dist/esm/prism'),
      import('react-syntax-highlighter/dist/esm/styles/prism/one-dark'),
    ]).then(([prismModule, styleModule]) => {
      if (!isActive) return;
      setHighlighter(() => prismModule.default as SyntaxHighlighterComponent);
      setStyle(styleModule.default as SyntaxTheme);
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
});
