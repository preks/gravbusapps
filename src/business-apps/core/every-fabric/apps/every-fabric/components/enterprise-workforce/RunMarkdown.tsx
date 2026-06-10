// Compact markdown renderer for Workforce run input / output / drafts.
//
// Wraps `react-markdown` (already a project dep, used by Nexus / Every AI)
// with a minimal "prose" style that matches the rest of the drawer chrome.
// Kept local to the workforce module so we don't pull in the
// StreamingMarkdown heavy variants — the drawer never deals with partial
// tokens, only finalised text.

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { markdownUrlTransform } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'

export interface RunMarkdownProps {
  content: string
  className?: string
  // When true, links open in a new tab (drafts and outputs often
  // include policy / claim references that should not steal the drawer).
  externalLinks?: boolean
}

const components = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="gba:my-2 gba:text-xs gba:leading-relaxed gba:text-foreground">{children}</p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="gba:mt-4 gba:mb-2 gba:text-base gba:font-semibold gba:text-foreground">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="gba:mt-4 gba:mb-2 gba:text-sm gba:font-semibold gba:text-foreground">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="gba:mt-3 gba:mb-1.5 gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
      {children}
    </h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="gba:my-2 gba:list-disc gba:space-y-1 gba:pl-4 gba:text-xs gba:text-foreground">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="gba:my-2 gba:list-decimal gba:space-y-1 gba:pl-4 gba:text-xs gba:text-foreground">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li className="gba:text-xs gba:leading-relaxed">{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="gba:font-semibold gba:text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em className="gba:italic">{children}</em>,
  code: ({ className: codeClass, children }: { className?: string; children?: React.ReactNode }) => {
    const isBlock = codeClass?.includes('language-')
    if (isBlock) {
      return (
        <code className="gba:block gba:overflow-x-auto gba:rounded-md gba:bg-muted gba:px-3 gba:py-2 gba:font-mono gba:text-[11px] gba:text-foreground">
          {children}
        </code>
      )
    }
    return (
      <code className="gba:rounded gba:bg-muted gba:px-1 gba:py-0.5 gba:font-mono gba:text-[11px] gba:text-foreground">
        {children}
      </code>
    )
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="gba:my-2 gba:overflow-x-auto gba:rounded-md gba:border gba:border-border/60 gba:bg-muted/40 gba:p-2 gba:text-[11px] gba:text-foreground">
      {children}
    </pre>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="gba:my-2 gba:border-l-2 gba:border-border gba:pl-3 gba:text-xs gba:italic gba:text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="gba:my-3 gba:border-border/60" />,
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="gba:my-2 gba:overflow-x-auto">
      <table className="gba:w-full gba:border-collapse gba:text-[11px]">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="gba:border gba:border-border/60 gba:bg-muted/40 gba:px-2 gba:py-1 gba:text-left gba:font-semibold">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="gba:border gba:border-border/60 gba:px-2 gba:py-1 gba:align-top">{children}</td>
  ),
  a: ({
    href,
    children,
    target,
    rel
  }: {
    href?: string
    children?: React.ReactNode
    target?: string
    rel?: string
  }) => (
    <a href={href} target={target} rel={rel} className="gba:text-primary gba:underline gba:hover:text-primary/80">
      {children}
    </a>
  )
}

export const RunMarkdown: React.FC<RunMarkdownProps> = ({ content, className, externalLinks = false }) => {
  if (!content) {
    return <p className="gba:text-xs gba:italic gba:text-muted-foreground">(empty)</p>
  }
  return (
    <div className={`gba:max-w-none ${className ?? ''}`} data-testid="workforce-run-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={markdownUrlTransform}
        components={
          externalLinks
            ? {
                ...components,
                a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gba:text-primary gba:underline gba:hover:text-primary/80"
                  >
                    {children}
                  </a>
                )
              }
            : components
        }
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
