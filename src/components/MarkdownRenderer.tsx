import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Reusable Markdown renderer with themed prose styling.
 * Supports bold, italic, code (inline + blocks), lists, links, headings, and blockquotes.
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const { theme } = useTheme();
  const syntaxTheme = theme === 'dark' ? oneDark : oneLight;

  return (
    <div className={cn('markdown-prose', className)}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className='text-lg font-bold text-foreground mb-2 mt-3 first:mt-0'>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className='text-base font-semibold text-foreground mb-1.5 mt-2.5 first:mt-0'>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className='text-sm font-semibold text-foreground mb-1 mt-2 first:mt-0'>
              {children}
            </h3>
          ),
          p: ({ children }) => <p className='mb-2 last:mb-0 leading-relaxed'>{children}</p>,
          strong: ({ children }) => <strong className='font-semibold'>{children}</strong>,
          em: ({ children }) => <em className='italic'>{children}</em>,
          ul: ({ children }) => (
            <ul className='mb-2 ml-4 list-disc space-y-0.5 last:mb-0'>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className='mb-2 ml-4 list-decimal space-y-0.5 last:mb-0'>{children}</ol>
          ),
          li: ({ children }) => <li className='leading-relaxed'>{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary underline underline-offset-2 hover:text-primary/80 transition-colors'
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className='border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic'>
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const isInline = !codeClassName;
            if (isInline) {
              return (
                <code className='rounded bg-muted px-1 py-0.5 text-[0.85em] font-mono text-foreground'>
                  {children}
                </code>
              );
            }
            return (
              <SyntaxHighlighter
                style={syntaxTheme}
                language={match?.[1] || 'text'}
                PreTag='div'
                customStyle={{ margin: '0.5rem 0', borderRadius: '0.375rem', fontSize: '0.85em' }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          },
          pre: ({ children }) => <>{children}</>,
          hr: () => <hr className='my-3 border-border' />,
          table: ({ children }) => (
            <div className='my-2 overflow-x-auto'>
              <table className='w-full border-collapse text-sm'>{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className='border border-border bg-muted px-2 py-1 text-left font-semibold'>
              {children}
            </th>
          ),
          td: ({ children }) => <td className='border border-border px-2 py-1'>{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
