import React, { useState } from 'react'
import { Card, Badge } from '@newwork/nw-design-system'
import { ChevronDown, ChevronUp, FileText, StickyNote, Table } from 'lucide-react'
import { ChatSource } from '../../types/chat.types'

interface SourceCitationProps {
  sources: ChatSource[]
}

export const SourceCitation: React.FC<SourceCitationProps> = ({ sources }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (sources.length === 0) {
    return null
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
        <span>Sources ({sources.length})</span>
        {isExpanded ? <ChevronUp className="gba:h-4 gba:w-4" /> : <ChevronDown className="gba:h-4 gba:w-4" />}
      </button>

      {isExpanded && (
        <div className="gba:mt-2 gba:space-y-2">
          {sources.map((source, index) => (
            <Card key={index} className="gba:p-3" data-testid={`source-citation-item-${index}`}>
              <div className="gba:flex gba:items-start gba:gap-2">
                <div className="gba:text-muted-foreground">{getIcon(source.contentType)}</div>
                <div className="gba:flex-1">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:font-medium gba:text-sm">{source.title}</span>
                    <Badge variant="secondary" className="gba:text-xs">
                      {source.contentType}
                    </Badge>
                  </div>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{source.chunkText}</p>
                  <span className="gba:text-xs gba:text-muted-foreground">
                    Relevance: {Math.round(source.similarity * 100)}%
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
