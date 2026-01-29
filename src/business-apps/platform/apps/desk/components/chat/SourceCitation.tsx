import React, { useMemo, useState } from 'react'
import { Card, Badge } from '@newwork/nw-design-system'
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

  const toExcerpt = (value: string, maxLen = 220): string => {
    const cleaned = value.replace(/\s+/g, ' ').trim()
    if (cleaned.length <= maxLen) return cleaned
    return `${cleaned.slice(0, maxLen).trim()}…`
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
    <div className="gba:mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground"
        data-testid="source-citation-toggle"
      >
        <span>Sources ({uniqueSources.length})</span>
        {isExpanded ? <ChevronUp className="gba:h-4 gba:w-4" /> : <ChevronDown className="gba:h-4 gba:w-4" />}
      </button>

      {isExpanded && (
        <div className="gba:mt-2 gba:space-y-2">
          {uniqueSources.map((source, index) => (
            <button
              key={`${source.contentType}:${source.contentId}`}
              type="button"
              onClick={() => openSource(source)}
              className="gba:w-full gba:text-left"
              data-testid={`source-citation-open-${index}`}
            >
              <Card className="gba:p-3 gba:border gba:border-border/60 gba:bg-card/70 gba:backdrop-blur-md">
                <div className="gba:flex gba:items-start gba:gap-2">
                  <div className="gba:text-muted-foreground">{getIcon(source.contentType)}</div>
                  <div className="gba:flex-1">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span className="gba:font-medium gba:text-sm gba:truncate">{source.title}</span>
                      <Badge variant="secondary" className="gba:text-xs">
                        {source.contentType}
                      </Badge>
                      <span className="gba:ml-auto gba:text-xs gba:text-muted-foreground">
                        {Math.round(source.similarity * 100)}%
                      </span>
                    </div>
                    <p className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:leading-relaxed">
                      {toExcerpt(source.chunkText)}
                    </p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">Click to open</p>
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
