import React, { useMemo, useState } from 'react'
import { Badge } from '@newwork/nw-design-system'
import { ChevronDown, ChevronUp, FileText, StickyNote, Table } from 'lucide-react'
import { ChatSource } from '../../types/chat.types'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'

interface SourceCitationProps {
  sources: ChatSource[]
}

export const SourceCitation: React.FC<SourceCitationProps> = ({ sources }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (sources.length === 0) {
    return null
  }

  const uniqueSources = useMemo(() => {
    const byKey = new Map<string, ChatSource>()

    for (const source of sources) {
      const key = `${source.contentType}:${source.contentId}`
      const existing = byKey.get(key)

      if (!existing || source.similarity > existing.similarity) {
        byKey.set(key, source)
      }
    }

    return Array.from(byKey.values()).sort((a, b) => b.similarity - a.similarity)
  }, [sources])

  const cleanText = (value: string): string => {
    return value.replace(/\s+/g, ' ').trim()
  }

  const openSource = (source: ChatSource) => {
    const isProduction = process.env.NODE_ENV === 'production'

    if (source.contentType === 'document') {
      const url = isProduction ? '/platform/documents' : '/platform/apps/document-apps'
      navigateTo(buildPlatformUrl(url, { docId: source.contentId, view: 'editor', from: 'desk-chat' }))
      return
    }

    if (source.contentType === 'spreadsheet') {
      const url = isProduction ? '/platform/spreadsheets' : '/platform/apps/spreadsheet-apps'
      navigateTo(buildPlatformUrl(url, { appId: source.contentId, view: 'viewer', from: 'desk-chat' }))
      return
    }

    const url = isProduction ? '/platform/notes' : '/platform/apps/note-apps'
    navigateTo(buildPlatformUrl(url, { noteId: source.contentId, view: 'editor', from: 'desk-chat' }))
  }

  const getIcon = (contentType: string) => {
    switch (contentType) {
      case 'document':
        return <FileText className="gba:h-4 gba:w-4" />
      case 'note':
        return <StickyNote className="gba:h-4 gba:w-4" />
      case 'spreadsheet':
        return <Table className="gba:h-4 gba:w-4" />
      default:
        return <FileText className="gba:h-4 gba:w-4" />
    }
  }

  return (
    <div className="gba:mt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
        data-testid="source-citation-toggle"
      >
        <span className="gba:font-medium">Sources</span>
        <Badge variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:h-4">
          {uniqueSources.length}
        </Badge>
        {isExpanded ? <ChevronUp className="gba:h-3.5 gba:w-3.5" /> : <ChevronDown className="gba:h-3.5 gba:w-3.5" />}
      </button>

      {isExpanded && (
        <div className="gba:mt-2 gba:space-y-1.5">
          {uniqueSources.map((source, index) => (
            <button
              key={`${source.contentType}:${source.contentId}`}
              type="button"
              onClick={() => openSource(source)}
              className="gba:w-full gba:text-left gba:group"
              data-testid={`source-citation-open-${index}`}
            >
              <div className="gba:p-2.5 gba:rounded-lg gba:border gba:border-border/50 gba:bg-muted/30 gba:hover:bg-muted/50 gba:transition-colors">
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1.5">
                  <div className="gba:text-muted-foreground">{getIcon(source.contentType)}</div>
                  <span className="gba:font-medium gba:text-sm gba:text-foreground gba:group-hover:text-primary gba:transition-colors">
                    {source.title}
                  </span>
                  <Badge variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:h-4 gba:capitalize">
                    {source.contentType}
                  </Badge>
                  <span className="gba:text-[10px] gba:text-muted-foreground gba:ml-auto">
                    {Math.round(source.similarity * 100)}%
                  </span>
                </div>
                <p className="gba:text-xs gba:text-muted-foreground gba:leading-relaxed gba:break-words">
                  {cleanText(source.chunkText)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
