import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system'
import EntityLink, {
  markdownUrlTransform,
  SUPPORTED_PROTOCOLS
} from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { buildMarkdownTableCellBody } from './markdownTableCellUtils'

// Match bare entity URLs (e.g. `employee://uuid` or `account://uuid#fragment`) in raw text.
// We sort protocols by length (longest first) so longer prefixes like `employee_asset` win over `employee`.
const SORTED_PROTOCOLS = [...SUPPORTED_PROTOCOLS].sort((a, b) => b.length - a.length)
const ENTITY_URL_REGEX = new RegExp(`\\b(${SORTED_PROTOCOLS.join('|')})://([\\w-]+(?:#[A-Za-z0-9+/=_-]+)?)`, 'g')

/**
 * Wrap bare entity URLs in markdown link syntax so they render as chips.
 *
 * - Skips URLs already inside a markdown link `[text](url)`.
 * - Skips URLs inside inline code or fenced code blocks.
 * - Uses a short fallback label (the entity id, truncated) so the chip still
 *   renders nicely when the author dropped the URL alone into a sentence.
 */
function autoLinkEntityUrls(content: string): string {
  if (!content || !content.includes('://')) return content

  const codeBlocks: string[] = []
  let withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, match => {
    codeBlocks.push(match)
    return `\u0000CODE_BLOCK_${codeBlocks.length - 1}\u0000`
  })

  const inlineCode: string[] = []
  withoutCodeBlocks = withoutCodeBlocks.replace(/`[^`\n]+`/g, match => {
    inlineCode.push(match)
    return `\u0000INLINE_CODE_${inlineCode.length - 1}\u0000`
  })

  const linked = withoutCodeBlocks.replace(ENTITY_URL_REGEX, (match, _protocol, idAndFragment, offset, full) => {
    const before = full.slice(0, offset)
    const lastOpenParen = before.lastIndexOf('(')
    const lastCloseParen = before.lastIndexOf(')')
    if (lastOpenParen > lastCloseParen) {
      const beforeParen = before.slice(0, lastOpenParen)
      if (/\]\s*$/.test(beforeParen)) return match
    }
    const idOnly = String(idAndFragment).split('#')[0]
    const shortId = idOnly.length > 12 ? `${idOnly.slice(0, 8)}…` : idOnly
    return `[${shortId}](${match})`
  })

  return linked
    .replace(/\u0000INLINE_CODE_(\d+)\u0000/g, (_, i) => inlineCode[Number(i)] ?? '')
    .replace(/\u0000CODE_BLOCK_(\d+)\u0000/g, (_, i) => codeBlocks[Number(i)] ?? '')
}

export interface MarkdownWithChipsRendererProps {
  content: string
  accessToken?: string
  variant?: 'chat' | 'ai' | 'default' | 'enterprise'
  renderHttpLinksAsChips?: boolean // Default: false (render as regular links)
  className?: string
  'data-testid'?: string
}

interface MarkdownRenderContextValue {
  accessToken: string
  variant: 'chat' | 'ai' | 'default' | 'enterprise'
  renderHttpLinksAsChips: boolean
}

const MarkdownRenderContext = React.createContext<MarkdownRenderContextValue>({
  accessToken: '',
  variant: 'default',
  renderHttpLinksAsChips: false
})

const MarkdownTableWrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="gba:overflow-x-auto gba:my-4 gba:rounded-lg gba:border gba:border-border gba:shadow-sm">
    <Table className="gba:w-full">{children}</Table>
  </div>
)

const MarkdownTableRowRenderer: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <TableRow className="gba:hover:bg-muted/30">{children}</TableRow>
)

const MarkdownTableHeadRenderer: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <TableHead className="gba:bg-muted/50 gba:font-semibold gba:text-muted-foreground gba:py-3 gba:px-4 gba:whitespace-nowrap gba:align-top gba:min-w-[120px]">
    {children}
  </TableHead>
)

const MarkdownEnterpriseStrong: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <strong className="gba:font-semibold gba:text-foreground gba:tracking-[0.01em]">{children}</strong>
)

const MarkdownDefaultStrong: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <strong className="gba:font-semibold gba:text-foreground">{children}</strong>
)

const MarkdownEnterpriseParagraph: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <p className="gba:mb-0 gba:leading-7 gba:text-[15px] gba:text-foreground [&+p]:gba:mt-3">{children}</p>
)

const MarkdownDefaultParagraph: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <p className="gba:mb-0 gba:leading-relaxed gba:text-foreground [&+p]:gba:mt-2">{children}</p>
)

const MarkdownEnterpriseH1: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <h1 className="gba:text-[1.85rem] gba:leading-tight gba:font-bold gba:mb-5 gba:mt-7 gba:text-foreground gba:border-b gba:border-border gba:pb-3">
    {children}
  </h1>
)

const MarkdownDefaultH1: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <h1 className="gba:text-2xl gba:font-bold gba:mb-4 gba:mt-6 gba:text-foreground gba:border-b gba:border-border gba:pb-2">
    {children}
  </h1>
)

const MarkdownEnterpriseH2: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <h2 className="gba:text-[1.35rem] gba:leading-tight gba:font-semibold gba:mb-3 gba:mt-7 gba:text-foreground">
    {children}
  </h2>
)

const MarkdownDefaultH2: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <h2 className="gba:text-xl gba:font-semibold gba:mb-3 gba:mt-5 gba:text-foreground">{children}</h2>
)

const MarkdownEnterpriseH3: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <h3 className="gba:text-[1.05rem] gba:leading-6 gba:font-semibold gba:mb-2 gba:mt-5 gba:text-foreground">
    {children}
  </h3>
)

const MarkdownDefaultH3: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <h3 className="gba:text-lg gba:font-semibold gba:mb-2 gba:mt-4 gba:text-foreground">{children}</h3>
)

const MarkdownEnterpriseUnorderedList: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ul className="gba:list-disc gba:list-outside gba:mb-5 gba:space-y-1.5 gba:pl-[1.35rem]">{children}</ul>
)

const MarkdownDefaultUnorderedList: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ul className="gba:list-disc gba:list-outside gba:mb-4 gba:space-y-1 gba:pl-5">{children}</ul>
)

const MarkdownEnterpriseOrderedList: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ol className="gba:list-decimal gba:list-outside gba:mb-5 gba:space-y-1.5 gba:pl-[1.35rem]">{children}</ol>
)

const MarkdownDefaultOrderedList: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ol className="gba:list-decimal gba:list-outside gba:mb-4 gba:space-y-1 gba:pl-5">{children}</ol>
)

const MarkdownEnterpriseListItem: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <li className="gba:text-[15px] gba:leading-7 gba:text-foreground">{children}</li>
)

const MarkdownDefaultListItem: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <li className="gba:text-foreground">{children}</li>
)

const MarkdownEnterpriseCode: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className,
  children
}) => {
  if (className?.includes('language-')) {
    return (
      <code className="gba:block gba:bg-slate-950 gba:text-slate-50 gba:p-4 gba:rounded-xl gba:text-[13px] gba:leading-6 gba:font-mono gba:overflow-x-auto gba:my-5">
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

const MarkdownDefaultCode: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className, children }) => {
  if (className?.includes('language-')) {
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
}

const MarkdownEnterprisePre: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <pre className="gba:bg-slate-950 gba:text-slate-50 gba:p-4 gba:rounded-xl gba:overflow-x-auto gba:my-5 gba:border gba:border-slate-800">
    {children}
  </pre>
)

const MarkdownDefaultPre: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <pre className="gba:bg-muted gba:p-4 gba:rounded-lg gba:overflow-x-auto gba:my-4 gba:border gba:border-border">
    {children}
  </pre>
)

const MarkdownEnterpriseBlockquote: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <blockquote className="gba:border-l-4 gba:border-primary gba:pl-4 gba:pr-3 gba:py-3 gba:my-5 gba:bg-muted/35 gba:italic gba:rounded-r-xl">
    {children}
  </blockquote>
)

const MarkdownDefaultBlockquote: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <blockquote className="gba:border-l-4 gba:border-primary gba:pl-4 gba:py-2 gba:my-4 gba:bg-muted/30 gba:italic gba:rounded-r">
    {children}
  </blockquote>
)

const MarkdownHorizontalRule: React.FC = () => <hr className="gba:my-6 gba:border-border" />

const MarkdownEmphasis: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <em className="gba:italic">{children}</em>
)

const renderMarkdownLink = (
  href: string | undefined,
  children: React.ReactNode,
  accessToken: string,
  renderHttpLinksAsChips: boolean,
  props: Record<string, unknown>
) => {
  if (!href) {
    return <span>{children || ''}</span>
  }

  if (href.startsWith('/')) {
    return (
      <a
        href={href}
        className="gba:text-primary gba:underline hover:gba:opacity-80"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="markdown-platform-link"
        {...props}
      >
        {children}
      </a>
    )
  }

  if (href.startsWith('http://') || href.startsWith('https://')) {
    if (renderHttpLinksAsChips) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={event => event.stopPropagation()}
          className="gba:inline-flex gba:items-center gba:gap-1 gba:text-primary gba:underline gba:hover:text-primary/80 gba:transition-colors"
          title={href}
          data-testid="markdown-http-link-chip"
          {...props}
        >
          {children}
          <ArrowSquareOutIcon className="gba:w-3 gba:h-3" />
        </a>
      )
    }

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

  const isEntityLink = /^\w+:\/\//.test(href)
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

const MarkdownLinkRenderer: React.FC<{ href?: string; children?: React.ReactNode }> = ({
  href,
  children,
  ...props
}) => {
  const { accessToken, renderHttpLinksAsChips } = React.useContext(MarkdownRenderContext)
  return renderMarkdownLink(href, children, accessToken, renderHttpLinksAsChips, props)
}

const MarkdownTableCellRenderer: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { cellContent, isEmpty, isLong, cellBody } = buildMarkdownTableCellBody({ children })
  const cellClassName = `gba:py-3 gba:px-4 gba:align-top gba:min-w-[120px] gba:max-w-sm gba:whitespace-normal gba:wrap-break-word ${
    isEmpty ? 'gba:text-muted-foreground/50 gba:italic' : 'gba:text-foreground'
  }`

  return (
    <TableCell className={cellClassName} title={isLong ? cellContent : undefined}>
      {cellBody}
    </TableCell>
  )
}

const MarkdownStrongRenderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(MarkdownRenderContext)
  return variant === 'enterprise' ? <MarkdownEnterpriseStrong {...props} /> : <MarkdownDefaultStrong {...props} />
}

const MarkdownParagraphRenderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(MarkdownRenderContext)
  return variant === 'enterprise' ? <MarkdownEnterpriseParagraph {...props} /> : <MarkdownDefaultParagraph {...props} />
}

const MarkdownH1Renderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(MarkdownRenderContext)
  return variant === 'enterprise' ? <MarkdownEnterpriseH1 {...props} /> : <MarkdownDefaultH1 {...props} />
}

const MarkdownH2Renderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(MarkdownRenderContext)
  return variant === 'enterprise' ? <MarkdownEnterpriseH2 {...props} /> : <MarkdownDefaultH2 {...props} />
}

const MarkdownH3Renderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(MarkdownRenderContext)
  return variant === 'enterprise' ? <MarkdownEnterpriseH3 {...props} /> : <MarkdownDefaultH3 {...props} />
}

const MarkdownUnorderedListRenderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(MarkdownRenderContext)
  return variant === 'enterprise' ? (
    <MarkdownEnterpriseUnorderedList {...props} />
  ) : (
    <MarkdownDefaultUnorderedList {...props} />
  )
}

const MarkdownOrderedListRenderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(MarkdownRenderContext)
  return variant === 'enterprise' ? (
    <MarkdownEnterpriseOrderedList {...props} />
  ) : (
    <MarkdownDefaultOrderedList {...props} />
  )
}

const MarkdownListItemRenderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(MarkdownRenderContext)
  return variant === 'enterprise' ? <MarkdownEnterpriseListItem {...props} /> : <MarkdownDefaultListItem {...props} />
}

const MarkdownCodeRenderer: React.FC<{ className?: string; children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(MarkdownRenderContext)
  return variant === 'enterprise' ? <MarkdownEnterpriseCode {...props} /> : <MarkdownDefaultCode {...props} />
}

const MarkdownPreRenderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(MarkdownRenderContext)
  return variant === 'enterprise' ? <MarkdownEnterprisePre {...props} /> : <MarkdownDefaultPre {...props} />
}

const MarkdownBlockquoteRenderer: React.FC<{ children?: React.ReactNode }> = props => {
  const { variant } = React.useContext(MarkdownRenderContext)
  return variant === 'enterprise' ? (
    <MarkdownEnterpriseBlockquote {...props} />
  ) : (
    <MarkdownDefaultBlockquote {...props} />
  )
}

const MARKDOWN_COMPONENTS = {
  a: MarkdownLinkRenderer,
  table: MarkdownTableWrapper,
  thead: TableHeader,
  tbody: TableBody,
  tr: MarkdownTableRowRenderer,
  th: MarkdownTableHeadRenderer,
  td: MarkdownTableCellRenderer,
  strong: MarkdownStrongRenderer,
  em: MarkdownEmphasis,
  p: MarkdownParagraphRenderer,
  h1: MarkdownH1Renderer,
  h2: MarkdownH2Renderer,
  h3: MarkdownH3Renderer,
  ul: MarkdownUnorderedListRenderer,
  ol: MarkdownOrderedListRenderer,
  li: MarkdownListItemRenderer,
  code: MarkdownCodeRenderer,
  pre: MarkdownPreRenderer,
  blockquote: MarkdownBlockquoteRenderer,
  hr: MarkdownHorizontalRule
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
  const markdownContextValue = useMemo(
    () => ({ accessToken, variant, renderHttpLinksAsChips }),
    [accessToken, variant, renderHttpLinksAsChips]
  )

  // Auto-link bare entity URLs (e.g. `employee://uuid`) so they render as chips.
  const processedContent = useMemo(() => autoLinkEntityUrls(content), [content])

  // Variant-specific prose classes
  const proseClasses = useMemo(() => {
    const baseClasses = 'gba:prose gba:max-w-none gba:text-foreground'
    switch (variant) {
      case 'enterprise':
        return `${baseClasses} gba:prose-sm gba:[&_table]:gba:text-[14px] gba:[&>*:last-child]:gba:mb-0`
      case 'chat':
        return `${baseClasses} gba:text-sm [&>*:last-child]:gba:mb-0`
      case 'ai':
        return `${baseClasses} gba:prose-sm [&>*:last-child]:gba:mb-0`
      default:
        return `${baseClasses} gba:prose-sm [&>*:last-child]:gba:mb-0`
    }
  }, [variant])

  return (
    <MarkdownRenderContext.Provider value={markdownContextValue}>
      <div className={`${proseClasses} ${className}`} data-testid={testId || 'markdown-with-chips-renderer'}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={markdownUrlTransform} components={MARKDOWN_COMPONENTS}>
          {processedContent}
        </ReactMarkdown>
      </div>
    </MarkdownRenderContext.Provider>
  )
}

export default MarkdownWithChipsRenderer
