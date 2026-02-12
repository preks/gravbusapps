import { Loader2 } from 'lucide-react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import type { DocumentContent } from '../../types/nexus.types'

interface DocumentRendererProps {
  content: DocumentContent
  isStreaming?: boolean
  streamContent?: string
  accessToken: string
  testId?: string
}

export const DocumentRenderer = ({
  content,
  isStreaming = false,
  streamContent,
  accessToken,
  testId = 'nexus-doc-renderer'
}: DocumentRendererProps) => {
  const markdown = isStreaming && streamContent ? streamContent : content.markdown

  return (
    <div className="gba:max-w-3xl gba:mx-auto gba:px-6 gba:py-8" data-testid={testId}>
      {/* Document surface */}
      <div className="gba:bg-card gba:border gba:border-border gba:rounded-xl gba:px-10 gba:py-10 gba:min-h-[600px]">
        {markdown ? (
          <article className="gba:prose-sm gba:leading-relaxed">
            <MarkdownWithChipsRenderer content={markdown} accessToken={accessToken} variant="default" />
          </article>
        ) : (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground">
              <Loader2 className="gba:h-5 gba:w-5 gba:animate-spin" />
              <span className="gba:text-sm">Generating document...</span>
            </div>
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && markdown && (
          <div className="gba:mt-6 gba:flex gba:items-center gba:gap-1.5 gba:text-muted-foreground gba:border-t gba:border-border gba:pt-3">
            <Loader2 className="gba:h-3 gba:w-3 gba:animate-spin" />
            <span className="gba:text-xs">Writing...</span>
          </div>
        )}
      </div>
    </div>
  )
}
