import React, { useMemo, useRef, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system'
import EntityLink, { markdownUrlTransform } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'

export interface StreamingMarkdownProps {
  content: string
  isStreaming: boolean
  accessToken?: string
  className?: string
}

function hasIncompleteCodeBlock(content: string): boolean {
  const lastCodeBlockStart = content.lastIndexOf('```')
  if (lastCodeBlockStart === -1) return false

  const afterBackticks = content.slice(lastCodeBlockStart + 3)
  return !afterBackticks.includes('```')
}

function hasIncompleteTable(content: string): boolean {
  const lastNewline = content.lastIndexOf('\n')
  const lastLine = lastNewline === -1 ? content : content.slice(lastNewline + 1)
  return lastLine.startsWith('|') && !lastLine.endsWith('|')
}

function hasIncompleteInlineCode(content: string): boolean {
  const lastBacktick = content.lastIndexOf('`')
  if (lastBacktick === -1) return false

  const afterBacktick = content.slice(lastBacktick + 1)
  return !afterBacktick.includes('`') && !afterBacktick.includes('\n')
}

function hasIncompleteBold(content: string): boolean {
  const lastDoubleStar = content.lastIndexOf('**')
  if (lastDoubleStar === -1) return false

  const afterStars = content.slice(lastDoubleStar + 2)
  return !afterStars.includes('**')
}

function removeIncompleteCodeBlock(content: string): string {
  const lastCodeBlockStart = content.lastIndexOf('```')
  if (lastCodeBlockStart === -1) return content

  const afterBackticks = content.slice(lastCodeBlockStart + 3)
  if (afterBackticks.includes('```')) return content

  return content.slice(0, lastCodeBlockStart)
}

function removeIncompleteTable(content: string): string {
  const lastNewline = content.lastIndexOf('\n')
  if (lastNewline === -1) return content

  const lastLine = content.slice(lastNewline + 1)
  if (lastLine.startsWith('|') && !lastLine.endsWith('|')) {
    return content.slice(0, lastNewline)
  }

  return content
}

function removeIncompleteInlineCode(content: string): string {
  const lastBacktick = content.lastIndexOf('`')
  if (lastBacktick === -1) return content

  const afterBacktick = content.slice(lastBacktick)
  if (afterBacktick.includes('`', 1)) return content

  return content.slice(0, lastBacktick)
}

function removeIncompleteBold(content: string): string {
  const lastDoubleStar = content.lastIndexOf('**')
  if (lastDoubleStar === -1) return content

  const afterStars = content.slice(lastDoubleStar + 2)
  if (afterStars.includes('**')) return content

  return content.slice(0, lastDoubleStar)
}

function getCompleteContent(content: string, isStreaming: boolean): string {
  if (!isStreaming) return content

  let result = content

  if (hasIncompleteCodeBlock(result)) {
    result = removeIncompleteCodeBlock(result)
  }

  if (hasIncompleteTable(result)) {
    result = removeIncompleteTable(result)
  }

  if (hasIncompleteInlineCode(result)) {
    result = removeIncompleteInlineCode(result)
  }

  if (hasIncompleteBold(result)) {
    result = removeIncompleteBold(result)
  }

  return result.trimEnd()
}

const MarkdownLink: React.FC<{ href?: string; children?: React.ReactNode; accessToken: string }> = ({
  href,
  children,
  accessToken,
  ...props
}) => {
  if (!href) return <span>{children || ''}</span>

  if (href.startsWith('http://') || href.startsWith('https://')) {
    return (
      <a
        href={href}
        className="gba:text-primary gba:underline hover:gba:opacity-80"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    )
  }

  const isEntityLink = /\w:\/\//.test(href)
  if (isEntityLink) {
    return (
      <EntityLink href={href} accessToken={accessToken} {...props}>
        {children}
      </EntityLink>
    )
  }

  return (
    <EntityLink href={href} accessToken={accessToken} {...props}>
      {children}
    </EntityLink>
  )
}

const MarkdownTable: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="gba:overflow-x-auto gba:my-4 gba:rounded-lg gba:border gba:border-border gba:shadow-sm gba:animate-in gba:fade-in gba:duration-200">
    <Table className="gba:w-full">{children}</Table>
  </div>
)

const MarkdownTableHeader: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <TableHeader>{children}</TableHeader>
)

const MarkdownTableBody: React.FC<{ children?: React.ReactNode }> = ({ children }) => <TableBody>{children}</TableBody>

const MarkdownTableRow: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <TableRow className="gba:hover:bg-muted/30">{children}</TableRow>
)

const MarkdownTableHeadCell: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <TableHead className="gba:bg-muted/50 gba:font-semibold gba:text-muted-foreground gba:py-3 gba:px-4 gba:whitespace-nowrap gba:align-top gba:min-w-[120px]">
    {children}
  </TableHead>
)

const MarkdownTableCell: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <TableCell className="gba:py-3 gba:px-4 gba:align-top gba:min-w-[120px] gba:text-foreground">{children}</TableCell>
)

const MarkdownStrong: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <strong className="gba:font-semibold gba:text-foreground">{children}</strong>
)

const MarkdownEmphasis: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <em className="gba:italic">{children}</em>
)

const MarkdownParagraph: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <p className="gba:mb-0 gba:leading-relaxed gba:text-foreground [&+p]:gba:mt-2">{children}</p>
)

const MarkdownH1: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <h1 className="gba:text-2xl gba:font-bold gba:mb-4 gba:mt-6 gba:text-foreground gba:border-b gba:border-border gba:pb-2 gba:animate-in gba:fade-in gba:duration-200">
    {children}
  </h1>
)

const MarkdownH2: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <h2 className="gba:text-xl gba:font-semibold gba:mb-3 gba:mt-5 gba:text-foreground gba:animate-in gba:fade-in gba:duration-200">
    {children}
  </h2>
)

const MarkdownH3: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <h3 className="gba:text-lg gba:font-semibold gba:mb-2 gba:mt-4 gba:text-foreground gba:animate-in gba:fade-in gba:duration-200">
    {children}
  </h3>
)

const MarkdownUnorderedList: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ul className="gba:list-disc gba:list-outside gba:mb-4 gba:space-y-1 gba:pl-5">{children}</ul>
)

const MarkdownOrderedList: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ol className="gba:list-decimal gba:list-outside gba:mb-4 gba:space-y-1 gba:pl-5">{children}</ol>
)

const MarkdownListItem: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <li className="gba:text-foreground gba:animate-in gba:fade-in gba:slide-in-from-left-1 gba:duration-150">
    {children}
  </li>
)

const MarkdownCode: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className: codeClassName,
  children
}) => {
  const isCodeBlock = codeClassName?.includes('language-')

  if (isCodeBlock) {
    return (
      <code className="gba:block gba:bg-muted gba:p-4 gba:rounded-lg gba:text-sm gba:font-mono gba:overflow-x-auto gba:my-4 gba:animate-in gba:fade-in gba:duration-200">
        {children}
      </code>
    )
  }

  return (
    <code className="gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded gba:text-sm gba:font-mono gba:text-foreground">
      {children}
    </code>
  )
}

const MarkdownPre: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <pre className="gba:bg-muted gba:p-4 gba:rounded-lg gba:overflow-x-auto gba:my-4 gba:border gba:border-border gba:animate-in gba:fade-in gba:duration-200">
    {children}
  </pre>
)

const MarkdownBlockquote: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <blockquote className="gba:border-l-4 gba:border-primary gba:pl-4 gba:py-2 gba:my-4 gba:bg-muted/30 gba:italic gba:rounded-r gba:animate-in gba:fade-in gba:slide-in-from-left-2 gba:duration-200">
    {children}
  </blockquote>
)

const MarkdownHorizontalRule: React.FC = () => <hr className="gba:my-6 gba:border-border" />

export const StreamingMarkdown: React.FC<StreamingMarkdownProps> = ({
  content,
  isStreaming,
  accessToken = '',
  className = ''
}) => {
  const [renderedContent, setRenderedContent] = useState('')
  const prevContentRef = useRef('')
  const rafRef = useRef<number | null>(null)
  const pendingContentRef = useRef(content)

  useEffect(() => {
    pendingContentRef.current = content

    if (rafRef.current) return

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const newContent = pendingContentRef.current
      const completeContent = getCompleteContent(newContent, isStreaming)

      if (completeContent !== prevContentRef.current) {
        setRenderedContent(completeContent)
        prevContentRef.current = completeContent
      }
    })

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [content, isStreaming])

  useEffect(() => {
    if (!isStreaming && content !== renderedContent) {
      setRenderedContent(content)
      prevContentRef.current = content
    }
  }, [isStreaming, content, renderedContent])

  const components = useMemo(
    () => ({
      a: (props: { href?: string; children?: React.ReactNode }) => (
        <MarkdownLink {...props} accessToken={accessToken} />
      ),
      table: MarkdownTable,
      thead: MarkdownTableHeader,
      tbody: MarkdownTableBody,
      tr: MarkdownTableRow,
      th: MarkdownTableHeadCell,
      td: MarkdownTableCell,
      strong: MarkdownStrong,
      em: MarkdownEmphasis,
      p: MarkdownParagraph,
      h1: MarkdownH1,
      h2: MarkdownH2,
      h3: MarkdownH3,
      ul: MarkdownUnorderedList,
      ol: MarkdownOrderedList,
      li: MarkdownListItem,
      code: MarkdownCode,
      pre: MarkdownPre,
      blockquote: MarkdownBlockquote,
      hr: MarkdownHorizontalRule
    }),
    [accessToken]
  )

  const proseClasses = 'gba:prose gba:prose-sm gba:max-w-none gba:text-foreground [&>*:last-child]:gba:mb-0'

  return (
    <div className={`${proseClasses} ${className}`} data-testid="streaming-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={markdownUrlTransform} components={components}>
        {renderedContent}
      </ReactMarkdown>
    </div>
  )
}

export default StreamingMarkdown
