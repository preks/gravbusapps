import { useMemo, useState, useCallback, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage, Badge } from '@newwork/nw-design-system'
import {
  Bot,
  FileText,
  BarChart3,
  Presentation,
  StickyNote,
  Table,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe
} from 'lucide-react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { parseSourceCitations } from '../../utils/cleanSourceCitations'
import type { InlineWebCitation } from '../../utils/cleanSourceCitations'
import type { NexusMessage, NexusSource, ArtifactType } from '../../types/nexus.types'

interface WebSource {
  title: string
  url: string
}

interface NexusChatMessageProps {
  message: NexusMessage
  userName?: string
  userAvatarUrl?: string
  accessToken: string
  isStreaming?: boolean
  streamingContent?: string
  thinkingStatus?: string | null
  thinkingSources?: WebSource[]
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
  userAvatarUrl,
  accessToken,
  isStreaming = false,
  streamingContent,
  thinkingStatus,
  thinkingSources = [],
  artifactType,
  onViewArtifact,
  testId = 'nexus-chat-message'
}: NexusChatMessageProps) => {
  const isUser = message.role === 'user'
  const rawContent = isStreaming && streamingContent ? streamingContent : message.content
  const { content, webCitations } = useMemo(
    () => (isUser ? { content: rawContent, webCitations: [] } : parseSourceCitations(rawContent)),
    [rawContent, isUser]
  )

  // Filter out irrelevant document sources when web search was used
  const relevantSources = useMemo(() => {
    if (!message.sources?.length) return []
    const webSearchUsed = thinkingSources.length > 0
    if (!webSearchUsed) return message.sources
    // Web search was used — exclude web sources (already shown in WebSearchSources)
    // and exclude low-similarity non-web sources that weren't actually used
    return message.sources.filter(s => s.contentType !== 'web' && s.similarity >= 0.5)
  }, [message.sources, thinkingSources])

  if (isUser) {
    return (
      <div className="gba:flex gba:justify-end gba:gap-2.5 gba:mb-4" data-testid={`${testId}-user`}>
        <div className="gba:max-w-[80%] gba:rounded-2xl gba:rounded-br-sm gba:bg-primary gba:text-primary-foreground gba:px-4 gba:py-3">
          <p className="gba:text-sm gba:leading-relaxed gba:whitespace-pre-wrap">{message.content}</p>
        </div>
        <Avatar className="gba:h-7 gba:w-7 gba:flex-shrink-0 gba:mt-0.5">
          {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt={userName || 'User'} />}
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
        {/* Web sources — persistent section, stays visible during and after streaming */}
        {thinkingSources.length > 0 && (
          <WebSearchSources sources={thinkingSources} testId={testId} animate={isStreaming} />
        )}

        <div className="gba:rounded-2xl gba:rounded-bl-sm gba:bg-muted/60 gba:px-4 gba:py-3 gba:overflow-hidden gba:[word-break:break-word]">
          {content ? (
            <>
              <MarkdownWithChipsRenderer content={content} accessToken={accessToken} variant="chat" />
              {webCitations.length > 0 && <InlineWebCitations citations={webCitations} testId={testId} />}
              {/* Show thinking status below content during streaming (e.g. deep research progress) */}
              {isStreaming && thinkingStatus && (
                <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2 gba:pt-2 gba:border-t gba:border-border/50">
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-bounce" />
                    <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-bounce gba:[animation-delay:150ms]" />
                    <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-bounce gba:[animation-delay:300ms]" />
                  </div>
                  <span className="gba:text-xs gba:text-muted-foreground gba:animate-pulse">{thinkingStatus}</span>
                </div>
              )}
            </>
          ) : isStreaming ? (
            <div className="gba:flex gba:items-center gba:gap-2 gba:py-0.5">
              <div className="gba:flex gba:items-center gba:gap-1">
                <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-bounce" />
                <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-bounce gba:[animation-delay:150ms]" />
                <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-bounce gba:[animation-delay:300ms]" />
              </div>
              {thinkingStatus && (
                <span className="gba:text-xs gba:text-muted-foreground gba:animate-pulse">{thinkingStatus}</span>
              )}
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

        {/* Sources — filtered to exclude low-relevance docs when web search was used */}
        {relevantSources.length > 0 && <SourceCitation sources={relevantSources} testId={testId} />}
      </div>
    </div>
  )
}

const InlineWebCitations = ({ citations, testId }: { citations: InlineWebCitation[]; testId: string }) => (
  <div className="gba:mt-3 gba:space-y-1.5" data-testid={`${testId}-inline-citations`}>
    {citations.map((citation, i) => (
      <div
        key={`${citation.title}-${i}`}
        className="gba:flex gba:items-center gba:gap-2 gba:px-2.5 gba:py-1.5 gba:rounded-lg gba:bg-muted/60 gba:border gba:border-border/40"
        data-testid={`${testId}-inline-citation-${i}`}
      >
        <Globe className="gba:h-3 gba:w-3 gba:flex-shrink-0 gba:text-info" />
        <span className="gba:text-[11px] gba:text-muted-foreground gba:leading-snug gba:truncate">
          {citation.title}
        </span>
        {citation.site && (
          <Badge
            variant="secondary"
            className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:h-4 gba:flex-shrink-0 gba:ml-auto"
          >
            {citation.site}
          </Badge>
        )}
      </div>
    ))}
  </div>
)

const WebSearchSources = ({
  sources,
  testId,
  animate = true
}: {
  sources: WebSource[]
  testId: string
  animate?: boolean
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [visibleCount, setVisibleCount] = useState(animate ? 0 : sources.length)

  const uniqueSources = useMemo(() => {
    const seen = new Map<string, WebSource>()
    for (const s of sources) {
      try {
        const key = new URL(s.url).origin + new URL(s.url).pathname
        if (!seen.has(key)) seen.set(key, s)
      } catch {
        seen.set(s.url, s)
      }
    }
    return Array.from(seen.values())
  }, [sources])

  // Progressively reveal sources one by one with a staggered delay (only when animating)
  useEffect(() => {
    if (animate && visibleCount < uniqueSources.length) {
      const timer = setTimeout(() => setVisibleCount(prev => prev + 1), 180)
      return () => clearTimeout(timer)
    }
    // When not animating, show all sources immediately
    if (!animate && visibleCount < uniqueSources.length) {
      setVisibleCount(uniqueSources.length)
    }
  }, [animate, visibleCount, uniqueSources.length])

  const getDomain = useCallback((url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }, [])

  const visibleSources = uniqueSources.slice(0, visibleCount)

  return (
    <div
      className="gba:rounded-xl gba:border gba:border-border/50 gba:bg-muted/30 gba:px-3 gba:py-2"
      data-testid={`${testId}-web-sources`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:flex gba:items-center gba:gap-1.5 gba:w-full gba:text-left"
        data-testid={`${testId}-web-sources-toggle`}
      >
        <Globe className="gba:h-3.5 gba:w-3.5 gba:text-info" />
        <span className="gba:text-xs gba:font-semibold gba:text-foreground">
          {visibleCount < uniqueSources.length
            ? 'Searching the web...'
            : `Searched ${uniqueSources.length} site${uniqueSources.length > 1 ? 's' : ''}`}
        </span>
        {isExpanded ? (
          <ChevronUp className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:ml-auto" />
        ) : (
          <ChevronDown className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:ml-auto" />
        )}
      </button>
      {isExpanded && visibleSources.length > 0 && (
        <div className="gba:mt-1.5 gba:space-y-1">
          {visibleSources.map((source, i) => (
            <a
              key={`${source.url}-${i}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:group"
              data-testid={`${testId}-web-source-${i}`}
            >
              <ExternalLink className="gba:h-3 gba:w-3 gba:flex-shrink-0 gba:text-info gba:group-hover:text-primary" />
              <span className="gba:truncate">{source.title}</span>
              <span className="gba:text-muted-foreground/50 gba:flex-shrink-0">({getDomain(source.url)})</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

const sourceIcons: Record<string, typeof FileText> = {
  document: FileText,
  note: StickyNote,
  spreadsheet: Table,
  web: Globe
}

const SourceCitation = ({ sources, testId }: { sources: NexusSource[]; testId: string }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const uniqueSources = useMemo(() => {
    const byKey = new Map<string, NexusSource>()
    for (const source of sources) {
      // Web sources are keyed by URL, internal sources by contentType:contentId
      const key =
        source.contentType === 'web' ? `web:${source.url || source.title}` : `${source.contentType}:${source.contentId}`
      const existing = byKey.get(key)
      if (!existing || source.similarity > existing.similarity) {
        byKey.set(key, source)
      }
    }
    // If sources have sourceNo, sort by that; otherwise by similarity
    const arr = Array.from(byKey.values())
    if (arr.some(s => s.sourceNo)) {
      return arr.sort((a, b) => (a.sourceNo ?? 999) - (b.sourceNo ?? 999))
    }
    return arr.sort((a, b) => b.similarity - a.similarity)
  }, [sources])

  const getDomain = useCallback((url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }, [])

  const openSource = (source: NexusSource) => {
    // Web sources open in a new tab
    if (source.contentType === 'web' && source.url) {
      window.open(source.url, '_blank', 'noopener,noreferrer')
      return
    }

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
            const isWeb = source.contentType === 'web'
            return (
              <button
                key={isWeb ? `web:${source.url || index}` : `${source.contentType}:${source.contentId}`}
                type="button"
                onClick={() => openSource(source)}
                className="gba:w-full gba:text-left gba:group"
                data-testid={`${testId}-source-${index}`}
              >
                <div className="gba:p-2.5 gba:rounded-lg gba:border gba:border-border/50 gba:bg-muted/30 gba:hover:bg-muted/50 gba:transition-colors">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                    {source.sourceNo != null && (
                      <span className="gba:text-[10px] gba:font-bold gba:text-muted-foreground gba:flex-shrink-0 gba:min-w-[18px]">
                        [{source.sourceNo}]
                      </span>
                    )}
                    <Icon
                      className={`gba:h-3.5 gba:w-3.5 gba:flex-shrink-0 ${isWeb ? 'gba:text-info' : 'gba:text-muted-foreground'}`}
                    />
                    <span className="gba:font-medium gba:text-xs gba:text-foreground gba:group-hover:text-primary gba:transition-colors gba:truncate">
                      {source.title}
                    </span>
                    <Badge
                      variant="secondary"
                      className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:h-4 gba:capitalize gba:flex-shrink-0"
                    >
                      {isWeb ? 'web' : source.contentType}
                    </Badge>
                    {isWeb && source.url ? (
                      <span className="gba:text-[10px] gba:text-muted-foreground/50 gba:ml-auto gba:flex-shrink-0">
                        {getDomain(source.url)}
                      </span>
                    ) : source.similarity > 0 ? (
                      <span className="gba:text-[10px] gba:text-muted-foreground gba:ml-auto gba:flex-shrink-0">
                        {Math.round(source.similarity * 100)}%
                      </span>
                    ) : null}
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
