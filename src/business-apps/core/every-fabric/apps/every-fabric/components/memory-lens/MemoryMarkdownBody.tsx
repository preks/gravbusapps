import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import EntityLink, { markdownUrlTransform } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { extractReferences, sanitizeMemoryBody } from './memoryReferences'
import translations from '../../_i18n'

/**
 * Shared react-markdown renderers for memory bodies. Object links
 * (`[label](employee://…)`, `account://`, `document://`, `chat_conversation://`)
 * are rendered through `EntityLink` so they resolve to real platform
 * destinations — the same clickable behaviour used in the Mind map detail.
 */
export const memoryMarkdownComponents = (accessToken: string) => ({
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="gba:my-1.5 gba:text-[13px] gba:leading-relaxed gba:text-foreground/90">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="gba:my-1.5 gba:list-disc gba:space-y-1 gba:pl-4 gba:text-[13px] gba:text-foreground/90">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="gba:my-1.5 gba:list-decimal gba:space-y-1 gba:pl-4 gba:text-[13px] gba:text-foreground/90">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="gba:text-[13px] gba:leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="gba:font-semibold gba:text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em className="gba:italic">{children}</em>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="gba:rounded gba:bg-muted gba:px-1 gba:py-0.5 gba:font-mono gba:text-[11px] gba:text-foreground">
      {children}
    </code>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <EntityLink href={href} accessToken={accessToken} appearance="inline" openInNewTab>
      {children}
    </EntityLink>
  )
})

interface MemoryMarkdownBodyProps {
  body?: string
  accessToken: string
  /** Render the de-duplicated "Open" reference chips below the prose. */
  showReferences?: boolean
}

export const MemoryMarkdownBody: React.FC<MemoryMarkdownBodyProps> = ({ body, accessToken, showReferences = true }) => {
  const { t } = useTranslation(translations)
  const clean = useMemo(() => sanitizeMemoryBody(body), [body])
  const references = useMemo(() => extractReferences(body), [body])

  if (!clean) return null

  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={markdownUrlTransform}
        components={memoryMarkdownComponents(accessToken)}
      >
        {clean}
      </ReactMarkdown>

      {showReferences && references.length > 0 && (
        <div className="gba:mt-3">
          <p className="gba:mb-1.5 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground/70">
            {t('memory-lens-references-open')}
          </p>
          <div className="gba:flex gba:flex-col gba:gap-1.5">
            {references.map(ref => (
              <EntityLink key={ref.id} href={ref.href} accessToken={accessToken} appearance="chip" openInNewTab>
                {ref.label}
              </EntityLink>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
