import { useMemo, useState } from 'react'
import { Avatar, AvatarFallback, Badge } from '@newwork/nw-design-system'
import { Bot, FileText, BarChart3, Presentation, StickyNote, Table, ChevronDown, ChevronUp } from 'lucide-react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import type { NexusMessage, NexusSource, ArtifactType } from '../../types/nexus.types'

interface NexusChatMessageProps {
  message: NexusMessage
  userName?: string
  accessToken: string
  isStreaming?: boolean
  streamingContent?: string
  artifactType?: ArtifactType
  onViewArtifact?: () => void
  testId?: string
}

const artifactIcons: Record<ArtifactType, typeof FileText> = {
  document: FileText,
  analysis: BarChart3,
  slides: Presentation
}

const artifactLabels: Record<ArtifactType, string> = {
  document: 'Document',
  analysis: 'Analysis',
  slides: 'Presentation'
}

export const NexusChatMessage = ({
  message,
  userName,
  accessToken,
  isStreaming = false,
  streamingContent,
  artifactType,
  onViewArtifact,
  testId = 'nexus-chat-message'
}: NexusChatMessageProps) => {
  const isUser = message.role === 'user'
  const content = isStreaming && streamingContent ? streamingContent : message.content

  if (isUser) {
    return (
      <div className="gba:flex gba:justify-end gba:gap-2.5 gba:mb-4" data-testid={`${testId}-user`}>
        <div className="gba:max-w-[80%] gba:rounded-2xl gba:rounded-br-sm gba:bg-primary gba:text-primary-foreground gba:px-4 gba:py-3">
          <p className="gba:text-sm gba:leading-relaxed gba:whitespace-pre-wrap">{message.content}</p>
        </div>
        <Avatar className="gba:h-7 gba:w-7 gba:flex-shrink-0 gba:mt-0.5">
          <AvatarFallback className="gba:text-[10px] gba:font-semibold gba:bg-secondary gba:text-secondary-foreground">
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:gap-2.5 gba:mb-4" data-testid={`${testId}-assistant`}>
      <Avatar className="gba:h-7 gba:w-7 gba:flex-shrink-0 gba:mt-0.5">
        <AvatarFallback className="gba:bg-primary/10 gba:text-primary">
          <Bot className="gba:h-3.5 gba:w-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="gba:max-w-[85%] gba:space-y-2">
        <div className="gba:rounded-2xl gba:rounded-bl-sm gba:bg-muted/60 gba:px-4 gba:py-3">
          {content ? (
            <MarkdownWithChipsRenderer content={content} accessToken={accessToken} variant="chat" />
          ) : isStreaming ? (
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:py-0.5">
              <div className="gba:flex gba:items-center gba:gap-1">
                <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-bounce" />
                <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-bounce gba:[animation-delay:150ms]" />
                <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-bounce gba:[animation-delay:300ms]" />
              </div>
            </div>
          ) : null}
        </div>

        {/* Artifact indicator */}
        {message.artifactId && artifactType && (
          <button
            onClick={onViewArtifact}
            className="gba:flex gba:items-center gba:gap-2.5 gba:px-3.5 gba:py-2.5 gba:rounded-xl gba:border gba:border-border gba:bg-card gba:hover:bg-accent/50 gba:transition-all gba:duration-200 gba:cursor-pointer gba:w-full gba:group"
            data-testid={`${testId}-artifact-link`}
          >
            {(() => {
              const Icon = artifactIcons[artifactType]
              return (
                <div className="gba:h-8 gba:w-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                  <Icon className="gba:h-4 gba:w-4 gba:text-primary" />
                </div>
              )
            })()}
            <div className="gba:text-left">
              <span className="gba:text-xs gba:font-semibold gba:text-foreground">
                {artifactLabels[artifactType]} created
              </span>
              <span className="gba:text-[10px] gba:text-muted-foreground gba:block">Click to view on canvas</span>
            </div>
            <Badge variant="secondary" className="gba:ml-auto gba:text-[10px]">
              View
            </Badge>
          </button>
        )}

        {/* Sources */}
        {message.sources && message.sources.length > 0 && <SourceCitation sources={message.sources} testId={testId} />}
      </div>
    </div>
  )
}

const sourceIcons: Record<string, typeof FileText> = {
  document: FileText,
  note: StickyNote,
  spreadsheet: Table
}

const SourceCitation = ({ sources, testId }: { sources: NexusSource[]; testId: string }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const uniqueSources = useMemo(() => {
    const byKey = new Map<string, NexusSource>()
    for (const source of sources) {
      const key = `${source.contentType}:${source.contentId}`
      const existing = byKey.get(key)
      if (!existing || source.similarity > existing.similarity) {
        byKey.set(key, source)
      }
    }
    return Array.from(byKey.values()).sort((a, b) => b.similarity - a.similarity)
  }, [sources])

  const openSource = (source: NexusSource) => {
    const isProduction = process.env.NODE_ENV === 'production'
    if (source.contentType === 'document') {
      const url = isProduction ? '/platform/documents' : '/platform/apps/document-apps'
      navigateTo(buildPlatformUrl(url, { docId: source.contentId, view: 'editor', from: 'nexus' }))
      return
    }
    if (source.contentType === 'spreadsheet') {
      const url = isProduction ? '/platform/spreadsheets' : '/platform/apps/spreadsheet-apps'
      navigateTo(buildPlatformUrl(url, { appId: source.contentId, view: 'viewer', from: 'nexus' }))
      return
    }
    const url = isProduction ? '/platform/notes' : '/platform/apps/note-apps'
    navigateTo(buildPlatformUrl(url, { noteId: source.contentId, view: 'editor', from: 'nexus' }))
  }

  return (
    <div className="gba:mt-1" data-testid={`${testId}-sources`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
        data-testid={`${testId}-sources-toggle`}
      >
        <span className="gba:font-medium">Sources</span>
        <Badge variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:h-4">
          {uniqueSources.length}
        </Badge>
        {isExpanded ? <ChevronUp className="gba:h-3.5 gba:w-3.5" /> : <ChevronDown className="gba:h-3.5 gba:w-3.5" />}
      </button>

      {isExpanded && (
        <div className="gba:mt-2 gba:space-y-1.5">
          {uniqueSources.map((source, index) => {
            const Icon = sourceIcons[source.contentType] || FileText
            return (
              <button
                key={`${source.contentType}:${source.contentId}`}
                type="button"
                onClick={() => openSource(source)}
                className="gba:w-full gba:text-left gba:group"
                data-testid={`${testId}-source-${index}`}
              >
                <div className="gba:p-2.5 gba:rounded-lg gba:border gba:border-border/50 gba:bg-muted/30 gba:hover:bg-muted/50 gba:transition-colors">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                    <Icon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                    <span className="gba:font-medium gba:text-xs gba:text-foreground gba:group-hover:text-primary gba:transition-colors gba:truncate">
                      {source.title}
                    </span>
                    <Badge
                      variant="secondary"
                      className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:h-4 gba:capitalize gba:flex-shrink-0"
                    >
                      {source.contentType}
                    </Badge>
                    <span className="gba:text-[10px] gba:text-muted-foreground gba:ml-auto gba:flex-shrink-0">
                      {Math.round(source.similarity * 100)}%
                    </span>
                  </div>
                  {source.chunkText && (
                    <p className="gba:text-[11px] gba:text-muted-foreground gba:leading-relaxed gba:line-clamp-2">
                      {source.chunkText.replace(/\s+/g, ' ').trim()}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
