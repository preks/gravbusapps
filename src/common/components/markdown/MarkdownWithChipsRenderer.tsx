import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ExternalLink } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system'
import EntityLink, { markdownUrlTransform } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'

export interface MarkdownWithChipsRendererProps {
  content: string
  accessToken?: string
  variant?: 'chat' | 'ai' | 'default'
  renderHttpLinksAsChips?: boolean // Default: false (render as regular links)
  className?: string
  'data-testid'?: string
}

/**
 * Unified markdown renderer component that supports:
 * - Full GitHub Flavored Markdown (tables, strikethrough, task lists, etc.)
 * - Entity links rendered as chips (employee://, account://, lead://, etc.)
 * - HTTP links rendered as chips or regular links (configurable)
 * - Consistent styling using design system components
 *
 * Used across AI and chat contexts for unified markdown rendering.
 */
export const MarkdownWithChipsRenderer: React.FC<MarkdownWithChipsRendererProps> = ({
  content,
  accessToken = '',
  variant = 'default',
  renderHttpLinksAsChips = false,
  className = '',
  'data-testid': testId
}) => {
  // Memoize components to prevent re-creating them on every render
  // This is critical to prevent infinite re-renders of EntityLink/EmployeeLinkChip
  const components = useMemo(
    () => ({
      // Links: entity links as chips, HTTP links as chips or regular links
      a: ({ href, children, ...props }: { href?: string; children?: React.ReactNode }) => {
        if (!href) {
          return <span>{children || ''}</span>
        }

        // HTTP/HTTPS links
        if (href.startsWith('http://') || href.startsWith('https://')) {
          if (renderHttpLinksAsChips) {
            // Render as chip (like Chat app)
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="gba:inline-flex gba:items-center gba:gap-1 gba:text-primary gba:underline gba:hover:text-primary/80 gba:transition-colors"
                title={href}
                data-testid="markdown-http-link-chip"
                {...props}
              >
                {children}
                <ExternalLink className="gba:w-3 gba:h-3" />
              </a>
            )
          } else {
            // Render as regular link (like Every-AI)
            return (
              <a
                href={href}
                className="gba:text-primary gba:underline hover:gba:opacity-80"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="markdown-http-link"
                {...props}
              >
                {children}
              </a>
            )
          }
        }

        // Entity links (type://id) - always render as chips via EntityLink
        // EntityLink handles employee:// specially via EmployeeLinkChip
        // Check if it's an entity link (has :// and not http/https)
        const isEntityLink = /^[a-zA-Z0-9_]+:\/\//.test(href)
        if (isEntityLink) {
          return (
            <EntityLink href={href} accessToken={accessToken} {...props}>
              {children}
            </EntityLink>
          )
        }

        // Fallback: use EntityLink for any other protocol or unrecognized links
        return (
          <EntityLink href={href} accessToken={accessToken} {...props}>
            {children}
          </EntityLink>
        )
      },

      // Tables using design system components
      table: ({ children }: { children?: React.ReactNode }) => (
        <div className="gba:overflow-x-auto gba:my-4 gba:rounded-lg gba:border gba:border-border gba:shadow-sm">
          <Table className="gba:w-full">{children}</Table>
        </div>
      ),
      thead: ({ children }: { children?: React.ReactNode }) => <TableHeader>{children}</TableHeader>,
      tbody: ({ children }: { children?: React.ReactNode }) => <TableBody>{children}</TableBody>,
      tr: ({ children }: { children?: React.ReactNode }) => (
        <TableRow className="gba:hover:bg-muted/30">{children}</TableRow>
      ),
      th: ({ children }: { children?: React.ReactNode }) => (
        <TableHead className="gba:bg-muted/50 gba:font-semibold gba:text-muted-foreground gba:py-3 gba:px-4 gba:whitespace-nowrap gba:align-top gba:min-w-[120px]">
          {children}
        </TableHead>
      ),
      td: ({ children }: { children?: React.ReactNode }) => {
        const cellContent = String(children || '').trim()
        const isEmpty = !cellContent || cellContent === ''
        const isLong = cellContent.length > 200

        return (
          <TableCell
            className={`gba:py-3 gba:px-4 gba:align-top gba:min-w-[120px] ${
              isEmpty ? 'gba:text-muted-foreground/50 gba:italic' : 'gba:text-foreground'
            }`}
            style={{
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'normal',
              maxWidth: '400px'
            }}
            title={isLong ? cellContent : undefined}
          >
            {isEmpty ? (
              <span className="gba:text-xs">—</span>
            ) : isLong ? (
              <div
                style={{
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  maxHeight: '128px',
                  overflowY: 'auto'
                }}
              >
                {children}
              </div>
            ) : (
              <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{children}</div>
            )}
          </TableCell>
        )
      },

      // Text formatting
      strong: ({ children }: { children?: React.ReactNode }) => (
        <strong className="gba:font-semibold gba:text-foreground">{children}</strong>
      ),
      em: ({ children }: { children?: React.ReactNode }) => <em className="gba:italic">{children}</em>,

      // Paragraphs - no bottom margin, spacing handled by gap in parent or sibling selector
      p: ({ children }: { children?: React.ReactNode }) => (
        <p className="gba:mb-0 gba:leading-relaxed gba:text-foreground [&+p]:gba:mt-2">{children}</p>
      ),

      // Headers
      h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 className="gba:text-2xl gba:font-bold gba:mb-4 gba:mt-6 gba:text-foreground gba:border-b gba:border-border gba:pb-2">
          {children}
        </h1>
      ),
      h2: ({ children }: { children?: React.ReactNode }) => (
        <h2 className="gba:text-xl gba:font-semibold gba:mb-3 gba:mt-5 gba:text-foreground">{children}</h2>
      ),
      h3: ({ children }: { children?: React.ReactNode }) => (
        <h3 className="gba:text-lg gba:font-semibold gba:mb-2 gba:mt-4 gba:text-foreground">{children}</h3>
      ),

      // Lists
      ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className="gba:list-disc gba:list-inside gba:mb-4 gba:space-y-1 gba:pl-2">{children}</ul>
      ),
      ol: ({ children }: { children?: React.ReactNode }) => (
        <ol className="gba:list-decimal gba:list-inside gba:mb-4 gba:space-y-1 gba:pl-2">{children}</ol>
      ),
      li: ({ children }: { children?: React.ReactNode }) => <li className="gba:text-foreground">{children}</li>,

      // Code
      code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
        // Check if this is a code block (has language class) or inline code
        const isCodeBlock = className?.includes('language-')

        if (isCodeBlock) {
          return (
            <code className="gba:block gba:bg-muted gba:p-4 gba:rounded-lg gba:text-sm gba:font-mono gba:overflow-x-auto gba:my-4">
              {children}
            </code>
          )
        }

        return (
          <code className="gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded gba:text-sm gba:font-mono gba:text-foreground">
            {children}
          </code>
        )
      },

      pre: ({ children }: { children?: React.ReactNode }) => (
        <pre className="gba:bg-muted gba:p-4 gba:rounded-lg gba:overflow-x-auto gba:my-4 gba:border gba:border-border">
          {children}
        </pre>
      ),

      // Blockquotes
      blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="gba:border-l-4 gba:border-primary gba:pl-4 gba:py-2 gba:my-4 gba:bg-muted/30 gba:italic gba:rounded-r">
          {children}
        </blockquote>
      ),

      // Horizontal rule
      hr: () => <hr className="gba:my-6 gba:border-border" />
    }),
    [accessToken, renderHttpLinksAsChips]
  )

  // Variant-specific prose classes
  const proseClasses = useMemo(() => {
    const baseClasses = 'gba:prose gba:max-w-none gba:text-foreground'
    switch (variant) {
      case 'chat':
        return `${baseClasses} gba:text-sm [&>*:last-child]:gba:mb-0`
      case 'ai':
        return `${baseClasses} gba:prose-sm [&>*:last-child]:gba:mb-0`
      default:
        return `${baseClasses} gba:prose-sm [&>*:last-child]:gba:mb-0`
    }
  }, [variant])

  return (
    <div className={`${proseClasses} ${className}`} data-testid={testId || 'markdown-with-chips-renderer'}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={markdownUrlTransform} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownWithChipsRenderer
