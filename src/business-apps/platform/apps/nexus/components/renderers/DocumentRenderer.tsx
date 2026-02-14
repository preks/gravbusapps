import { Loader2, FileText } from 'lucide-react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { InlineEditableMarkdownBlock } from '../editing/InlineEditableMarkdownBlock'
import { InlineEditableTitle } from '../editing/InlineEditableTitle'
import type { DocumentContent } from '../../types/nexus.types'
import { normalizeNexusMarkdown } from '../../utils/normalizeNexusMarkdown'

interface DocumentRendererProps {
  content: DocumentContent
  isStreaming?: boolean
  streamContent?: string
  accessToken: string
  editable?: boolean
  onContentChange?: (updates: Partial<DocumentContent>) => void
  testId?: string
}

export const DocumentRenderer = ({
  content,
  isStreaming = false,
  streamContent,
  accessToken,
  editable = false,
  onContentChange,
  testId = 'nexus-doc-renderer'
}: DocumentRendererProps) => {
  const markdown = isStreaming && streamContent ? streamContent : content.markdown
  const normalizedMarkdown = normalizeNexusMarkdown(markdown || '')
  const normalizedValue = normalizeNexusMarkdown(content.markdown || '')
  const canEdit = editable && !isStreaming

  return (
    <div className="gba:max-w-3xl gba:mx-auto gba:px-8 gba:py-10" data-testid={testId}>
      {/* Document surface */}
      <div className="gba:bg-card gba:border gba:border-border gba:rounded-2xl gba:px-12 gba:py-12 gba:min-h-[600px] gba:ring-1 gba:ring-border/30">
        {markdown ? (
          <>
            {content.title && (
              <header className="gba:mb-8 gba:pb-6 gba:border-b gba:border-border">
                {canEdit ? (
                  <InlineEditableTitle
                    value={content.title}
                    onChange={title => onContentChange?.({ title })}
                    as="h1"
                    className="gba:text-2xl gba:font-bold gba:text-foreground gba:tracking-tight gba:leading-tight"
                    testId={`${testId}-title`}
                  />
                ) : (
                  <h1 className="gba:text-2xl gba:font-bold gba:text-foreground gba:tracking-tight gba:leading-tight">
                    {content.title}
                  </h1>
                )}
              </header>
            )}
            <article className="gba:prose-sm gba:leading-relaxed">
              {canEdit ? (
                <InlineEditableMarkdownBlock
                  value={normalizedValue}
                  onChange={md => onContentChange?.({ markdown: md })}
                  accessToken={accessToken}
                  testId={`${testId}-body`}
                />
              ) : (
                <MarkdownWithChipsRenderer content={normalizedMarkdown} accessToken={accessToken} variant="default" />
              )}
            </article>
          </>
        ) : (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-64 gba:space-y-3">
            <div className="gba:h-10 gba:w-10 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
              <FileText className="gba:h-5 gba:w-5 gba:text-primary gba:animate-pulse" />
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground">
              <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
              <span className="gba:text-sm">Generating document...</span>
            </div>
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && markdown && (
          <div className="gba:mt-8 gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground gba:border-t gba:border-border gba:pt-4">
            <Loader2 className="gba:h-3.5 gba:w-3.5 gba:animate-spin gba:text-primary" />
            <span className="gba:text-xs gba:font-medium">Writing...</span>
          </div>
        )}
      </div>
    </div>
  )
}
