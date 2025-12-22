import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import EntityLink, { markdownUrlTransform } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system'

interface MarkdownRendererProps {
  content: string
  accessToken?: string
}

/**
 * A markdown renderer component that supports:
 * - GitHub Flavored Markdown (tables, strikethrough, etc.)
 * - Entity links (lead://, contact://, account://, etc.)
 * - Beautiful table styling using design system components
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, accessToken = '' }) => {
  // Memoize components to prevent re-creating them on every render
  // This is critical to prevent infinite re-renders of EntityLink/EmployeeLinkChip
  const components = useMemo(
    () => ({
      // Entity links
      a: ({ href, children }) => (
        <EntityLink href={href} accessToken={accessToken}>
          {children}
        </EntityLink>
      ),

      // Tables using design system with better styling for scheduled tasks
      table: ({ children }) => (
        <div className="gba:overflow-x-auto gba:my-4 gba:rounded-lg gba:border gba:border-border gba:shadow-sm">
          <Table className="gba:w-full">{children}</Table>
        </div>
      ),
      thead: ({ children }) => <TableHeader>{children}</TableHeader>,
      tbody: ({ children }) => <TableBody>{children}</TableBody>,
      tr: ({ children }) => <TableRow className="gba:hover:bg-muted/30">{children}</TableRow>,
      th: ({ children }) => (
        <TableHead className="gba:bg-muted/50 gba:font-semibold gba:text-muted-foreground gba:py-3 gba:px-4 gba:whitespace-nowrap gba:align-top gba:min-w-[120px]">
          {children}
        </TableHead>
      ),
      td: ({ children }) => {
        const cellContent = String(children || '').trim()
        const isEmpty = !cellContent || cellContent === ''

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
            title={cellContent.length > 100 ? cellContent : undefined}
          >
            {isEmpty ? (
              <span className="gba:text-xs">—</span>
            ) : (
              <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{children}</div>
            )}
          </TableCell>
        )
      },

      // Text formatting
      strong: ({ children }) => <strong className="gba:font-semibold gba:text-foreground">{children}</strong>,
      em: ({ children }) => <em className="gba:italic">{children}</em>,

      // Paragraphs
      p: ({ children }) => <p className="gba:mb-3 gba:leading-relaxed gba:text-foreground">{children}</p>,

      // Headers
      h1: ({ children }) => (
        <h1 className="gba:text-2xl gba:font-bold gba:mb-4 gba:mt-6 gba:text-foreground gba:border-b gba:border-border gba:pb-2">
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="gba:text-xl gba:font-semibold gba:mb-3 gba:mt-5 gba:text-foreground">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="gba:text-lg gba:font-semibold gba:mb-2 gba:mt-4 gba:text-foreground">{children}</h3>
      ),

      // Lists
      ul: ({ children }) => (
        <ul className="gba:list-disc gba:list-inside gba:mb-4 gba:space-y-1 gba:pl-2">{children}</ul>
      ),
      ol: ({ children }) => (
        <ol className="gba:list-decimal gba:list-inside gba:mb-4 gba:space-y-1 gba:pl-2">{children}</ol>
      ),
      li: ({ children }) => <li className="gba:text-foreground">{children}</li>,

      // Code
      code: ({ className, children }) => {
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

      pre: ({ children }) => (
        <pre className="gba:bg-muted gba:p-4 gba:rounded-lg gba:overflow-x-auto gba:my-4 gba:border gba:border-border">
          {children}
        </pre>
      ),

      // Blockquotes
      blockquote: ({ children }) => (
        <blockquote className="gba:border-l-4 gba:border-primary gba:pl-4 gba:py-2 gba:my-4 gba:bg-muted/30 gba:italic gba:rounded-r">
          {children}
        </blockquote>
      ),

      // Horizontal rule
      hr: () => <hr className="gba:my-6 gba:border-border" />
    }),
    [accessToken]
  )

  return (
    <div className="gba:prose gba:prose-sm gba:max-w-none gba:text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={markdownUrlTransform} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer
