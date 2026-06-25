import React, { useRef, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system'
import EntityLink, { markdownUrlTransform } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { buildMarkdownTableCellBody } from './markdownTableCellUtils'

export interface StreamingMarkdownProps {
  content: string
  isStreaming: boolean
  accessToken?: string
  variant?: 'default' | 'enterprise'
  className?: string
  /** Blinking caret at the end of streamed text. Defaults to `isStreaming`. */
  showCaret?: boolean
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
  // Render table rows progressively; hiding the current row until the closing
  // pipe makes streamed answers appear to freeze and then dump a full table.
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
  // Keep partial emphasis visible while streaming. ReactMarkdown renders the
  // raw markers until they close, which is less jarring than hiding sentences.
  return content
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

const MarkdownTableCell: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { cellContent, isEmpty, isLong, cellBody } = buildMarkdownTableCellBody({ children })
  return (
    <TableCell
      className={`gba:py-3 gba:px-4 gba:align-top gba:min-w-[120px] gba:max-w-sm gba:whitespace-normal gba:wrap-break-word gba:text-foreground ${
        isEmpty ? 'gba:text-muted-foreground/50 gba:italic' : ''
      }`}
      title={isLong ? cellContent : undefined}
    >
      {cellBody}
    </TableCell>
  )
}

const MarkdownStrong: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <strong className="gba:font-semibold gba:text-foreground">{children}</strong>
)

const EnterpriseMarkdownStrong: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <strong className="gba:font-semibold gba:text-foreground gba:tracking-[0.01em]">{children}</strong>
)

const EnterpriseMarkdownParagraph: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <p className="gba:mb-0 gba:leading-7 gba:text-[15px] gba:text-foreground [&+p]:gba:mt-3">{children}</p>
)

const EnterpriseMarkdownH1: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <h1 className="gba:text-[1.85rem] gba:leading-tight gba:font-bold gba:mb-5 gba:mt-7 gba:text-foreground gba:border-b gba:border-border gba:pb-3">
    {children}
  </h1>
)

const EnterpriseMarkdownH2: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <h2 className="gba:text-[1.35rem] gba:leading-tight gba:font-semibold gba:mb-3 gba:mt-7 gba:text-foreground">
    {children}
  </h2>
)

const EnterpriseMarkdownH3: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <h3 className="gba:text-[1.05rem] gba:leading-6 gba:font-semibold gba:mb-2 gba:mt-5 gba:text-foreground">
    {children}
  </h3>
)

const EnterpriseMarkdownUnorderedList: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ul className="gba:list-disc gba:list-outside gba:mb-5 gba:space-y-1.5 gba:pl-[1.35rem]">{children}</ul>
)

const EnterpriseMarkdownOrderedList: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ol className="gba:list-decimal gba:list-outside gba:mb-5 gba:space-y-1.5 gba:pl-[1.35rem]">{children}</ol>
)

const EnterpriseMarkdownListItem: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <li className="gba:text-[15px] gba:leading-7 gba:text-foreground">{children}</li>
)

const EnterpriseMarkdownCode: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className: codeClassName,
  children
}) => {
  const isCodeBlock = codeClassName?.includes('language-')
  if (isCodeBlock) {
    return (
      <code className="gba:block gba:bg-slate-950 gba:text-slate-50 gba:p-4 gba:rounded-xl gba:text-[13px] gba:leading-6 gba:font-mono gba:overflow-x-auto gba:my-5 gba:animate-in gba:fade-in gba:duration-200">
        {children}
      </code>
    )
  }
  return (
    <code className="gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded-md gba:text-[0.92em] gba:font-mono gba:text-foreground">
      {children}
    </code>
  )
}

const EnterpriseMarkdownPre: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <pre className="gba:bg-slate-950 gba:text-slate-50 gba:p-4 gba:rounded-xl gba:overflow-x-auto gba:my-5 gba:border gba:border-slate-800 gba:animate-in gba:fade-in gba:duration-200">
    {children}
  </pre>
)

const EnterpriseMarkdownBlockquote: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <blockquote className="gba:border-l-4 gba:border-primary gba:pl-4 gba:pr-3 gba:py-3 gba:my-5 gba:bg-muted/35 gba:italic gba:rounded-r-xl gba:animate-in gba:fade-in gba:slide-in-from-left-2 gba:duration-200">
    {children}
  </blockquote>
)

const EnterpriseMarkdownTableCell: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { cellContent, isEmpty, isLong, cellBody } = buildMarkdownTableCellBody({ children })
  return (
    <TableCell
      className={`gba:py-3 gba:px-4 gba:align-top gba:min-w-[120px] gba:max-w-sm gba:whitespace-normal gba:wrap-break-word gba:text-foreground gba:text-[14px] gba:leading-6 ${
        isEmpty ? 'gba:text-muted-foreground/50 gba:italic' : ''
      }`}
      title={isLong ? cellContent : undefined}
    >
      {cellBody}
    </TableCell>
  )
}

const EnterpriseMarkdownTableHeadCell: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <TableHead className="gba:bg-muted/50 gba:font-semibold gba:text-muted-foreground gba:py-3 gba:px-4 gba:whitespace-nowrap gba:align-top gba:min-w-[120px] gba:text-[13px] gba:tracking-[0.01em]">
    {children}
  </TableHead>
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

interface StreamingMarkdownContextValue {
  accessToken: string
  variant: 'default' | 'enterprise'
}

const StreamingMarkdownContext = React.createContext<StreamingMarkdownContextValue>({
  accessToken: '',
  variant: 'default'
})

const StreamingMarkdownAnchor: React.FC<{ href?: string; children?: React.ReactNode }> = props => {
  const { accessToken } = React.useContext(StreamingMarkdownContext)
  return <MarkdownLink {...props} accessToken={accessToken} />
}

const StreamingMarkdownTableHead: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(StreamingMarkdownContext)
  return variant === 'enterprise' ? (
    <EnterpriseMarkdownTableHeadCell {...props} />
  ) : (
    <MarkdownTableHeadCell {...props} />
  )
}

const StreamingMarkdownTableData: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(StreamingMarkdownContext)
  return variant === 'enterprise' ? <EnterpriseMarkdownTableCell {...props} /> : <MarkdownTableCell {...props} />
}

const StreamingMarkdownStrongText: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(StreamingMarkdownContext)
  return variant === 'enterprise' ? <EnterpriseMarkdownStrong {...props} /> : <MarkdownStrong {...props} />
}

const StreamingMarkdownParagraphRenderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(StreamingMarkdownContext)
  return variant === 'enterprise' ? <EnterpriseMarkdownParagraph {...props} /> : <MarkdownParagraph {...props} />
}

const StreamingMarkdownHeading1: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(StreamingMarkdownContext)
  return variant === 'enterprise' ? <EnterpriseMarkdownH1 {...props} /> : <MarkdownH1 {...props} />
}

const StreamingMarkdownHeading2: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(StreamingMarkdownContext)
  return variant === 'enterprise' ? <EnterpriseMarkdownH2 {...props} /> : <MarkdownH2 {...props} />
}

const StreamingMarkdownHeading3: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(StreamingMarkdownContext)
  return variant === 'enterprise' ? <EnterpriseMarkdownH3 {...props} /> : <MarkdownH3 {...props} />
}

const StreamingMarkdownUnorderedListRenderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(StreamingMarkdownContext)
  return variant === 'enterprise' ? (
    <EnterpriseMarkdownUnorderedList {...props} />
  ) : (
    <MarkdownUnorderedList {...props} />
  )
}

const StreamingMarkdownOrderedListRenderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(StreamingMarkdownContext)
  return variant === 'enterprise' ? <EnterpriseMarkdownOrderedList {...props} /> : <MarkdownOrderedList {...props} />
}

const StreamingMarkdownListItemRenderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(StreamingMarkdownContext)
  return variant === 'enterprise' ? <EnterpriseMarkdownListItem {...props} /> : <MarkdownListItem {...props} />
}

const StreamingMarkdownCodeRenderer: React.FC<{ className?: string; children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(StreamingMarkdownContext)
  return variant === 'enterprise' ? <EnterpriseMarkdownCode {...props} /> : <MarkdownCode {...props} />
}

const StreamingMarkdownPreRenderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(StreamingMarkdownContext)
  return variant === 'enterprise' ? <EnterpriseMarkdownPre {...props} /> : <MarkdownPre {...props} />
}

const StreamingMarkdownBlockquoteRenderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(StreamingMarkdownContext)
  return variant === 'enterprise' ? <EnterpriseMarkdownBlockquote {...props} /> : <MarkdownBlockquote {...props} />
}

const STREAMING_MARKDOWN_COMPONENTS = {
  a: StreamingMarkdownAnchor,
  table: MarkdownTable,
  thead: MarkdownTableHeader,
  tbody: MarkdownTableBody,
  tr: MarkdownTableRow,
  th: StreamingMarkdownTableHead,
  td: StreamingMarkdownTableData,
  strong: StreamingMarkdownStrongText,
  em: MarkdownEmphasis,
  p: StreamingMarkdownParagraphRenderer,
  h1: StreamingMarkdownHeading1,
  h2: StreamingMarkdownHeading2,
  h3: StreamingMarkdownHeading3,
  ul: StreamingMarkdownUnorderedListRenderer,
  ol: StreamingMarkdownOrderedListRenderer,
  li: StreamingMarkdownListItemRenderer,
  code: StreamingMarkdownCodeRenderer,
  pre: StreamingMarkdownPreRenderer,
  blockquote: StreamingMarkdownBlockquoteRenderer,
  hr: MarkdownHorizontalRule
}

export const StreamingMarkdown: React.FC<StreamingMarkdownProps> = ({
  content,
  isStreaming,
  accessToken = '',
  variant = 'default',
  className = '',
  showCaret
}) => {
  const [renderedContent, setRenderedContent] = useState('')
  const prevContentRef = useRef('')
  const rafRef = useRef<number | null>(null)
  const pendingContentRef = useRef(content)

  useEffect(() => {
    pendingContentRef.current = content

    const flush = () => {
      rafRef.current = null
      const completeContent = getCompleteContent(pendingContentRef.current, isStreaming)

      if (completeContent !== prevContentRef.current) {
        setRenderedContent(completeContent)
        prevContentRef.current = completeContent
      }

      const latestComplete = getCompleteContent(pendingContentRef.current, isStreaming)
      if (latestComplete !== prevContentRef.current) {
        rafRef.current = requestAnimationFrame(flush)
      }
    }

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flush)
    }

    return () => {
      if (rafRef.current !== null) {
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

  const streamingContextValue = useMemo(() => ({ accessToken, variant }), [accessToken, variant])

  const proseClasses =
    variant === 'enterprise'
      ? 'gba:prose gba:prose-sm gba:max-w-none gba:text-foreground gba:[&_table]:gba:text-[14px] [&>*:last-child]:gba:mb-0'
      : 'gba:prose gba:prose-sm gba:max-w-none gba:text-foreground [&>*:last-child]:gba:mb-0'

  const caretVisible = (showCaret ?? isStreaming) && renderedContent.length > 0

  return (
    <StreamingMarkdownContext.Provider value={streamingContextValue}>
      {caretVisible ? (
        <style>{`
          @keyframes streaming-markdown-caret-blink {
            0%, 45% { opacity: 1; }
            50%, 100% { opacity: 0; }
          }
        `}</style>
      ) : null}
      <div className={`${proseClasses} ${className}`} data-testid="streaming-markdown">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          urlTransform={markdownUrlTransform}
          components={STREAMING_MARKDOWN_COMPONENTS}
        >
          {renderedContent}
        </ReactMarkdown>
        {caretVisible ? (
          <span
            className="gba:inline-block gba:w-[2px] gba:h-[1.05em] gba:ml-0.5 gba:align-text-bottom gba:bg-primary gba:rounded-[1px]"
            style={{ animation: 'streaming-markdown-caret-blink 1s step-end infinite' }}
            aria-hidden
            data-testid="streaming-caret"
          />
        ) : null}
      </div>
    </StreamingMarkdownContext.Provider>
  )
}

export default StreamingMarkdown
