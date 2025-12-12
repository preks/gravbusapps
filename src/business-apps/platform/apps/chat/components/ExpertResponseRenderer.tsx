/**
 * Expert Response Renderer
 *
 * Enhanced AI response renderer for Every Expert messages
 * Shows citations, confidence, and knowledge source references
 */

import React, { useState } from 'react'
import { Card, CardContent, Button } from '@newwork/nw-design-system'
import { ChevronDown, ChevronUp, BookOpen, ExternalLink, FileText } from 'lucide-react'
import { AIResponseRenderer } from './AIResponseRenderer'

export interface Citation {
  source: string
  sourceType: 'document' | 'url' | 'knowledge_base'
  snippet: string
  page?: number
  url?: string
  confidence?: number
}

interface ExpertResponseRendererProps {
  content: string
  expertColor?: string
  citations?: Citation[]
  confidence?: number
  'data-testid'?: string
}

export const ExpertResponseRenderer: React.FC<ExpertResponseRendererProps> = ({
  content,
  expertColor,
  citations,
  confidence,
  'data-testid': testId = 'expert-response'
}) => {
  const [showCitations, setShowCitations] = useState(false)

  const hasCitations = citations && citations.length > 0
  const showConfidence = confidence !== undefined && confidence < 0.9

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      {/* Main response */}
      <AIResponseRenderer content={content} />

      {/* Confidence indicator (only if < 90%) */}
      {showConfidence && (
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
          <span className="gba:text-muted-foreground">Confidence:</span>
          <div
            className={`gba:inline-flex gba:items-center gba:justify-center gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium ${
              confidence >= 0.7
                ? 'gba:bg-success-secondary/60 gba:text-success-secondary-foreground'
                : 'gba:bg-warning-secondary/60 gba:text-warning-secondary-foreground'
            }`}
          >
            {Math.round(confidence * 100)}%
          </div>
          {confidence < 0.7 && (
            <span className="gba:text-warning gba:text-xs">Consider verifying this information</span>
          )}
        </div>
      )}

      {/* Citations */}
      {hasCitations && (
        <Card className="gba:border-l-4" style={{ borderLeftColor: expertColor || '#1890ff' }}>
          <CardContent className="gba:p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCitations(!showCitations)}
              className="gba:w-full gba:justify-between gba:px-2 gba:h-auto gba:py-1"
              data-testid={`${testId}-toggle-citations`}
            >
              <div className="gba:flex gba:items-center gba:gap-2">
                <BookOpen className="gba:w-4 gba:h-4" style={{ color: expertColor || '#1890ff' }} />
                <span className="gba:text-xs gba:font-medium">
                  {citations.length} source{citations.length !== 1 ? 's' : ''} referenced
                </span>
              </div>
              {showCitations ? <ChevronUp className="gba:w-4 gba:h-4" /> : <ChevronDown className="gba:w-4 gba:h-4" />}
            </Button>

            {showCitations && (
              <div className="gba:mt-3 gba:space-y-2 gba:border-t gba:border-border gba:pt-3">
                {citations.map((citation, idx) => (
                  <div
                    key={idx}
                    className="gba:bg-muted/50 gba:rounded-lg gba:p-2 gba:text-xs"
                    data-testid={`${testId}-citation-${idx}`}
                  >
                    <div className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:mb-1">
                      <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-1 gba:min-w-0">
                        {citation.sourceType === 'document' ? (
                          <FileText
                            className="gba:w-3 gba:h-3 gba:flex-shrink-0"
                            style={{ color: expertColor || '#1890ff' }}
                          />
                        ) : (
                          <ExternalLink
                            className="gba:w-3 gba:h-3 gba:flex-shrink-0"
                            style={{ color: expertColor || '#1890ff' }}
                          />
                        )}
                        <span className="gba:font-semibold gba:truncate">{citation.source}</span>
                      </div>
                      {citation.page && (
                        <div className="gba:inline-flex gba:items-center gba:justify-center gba:rounded-full gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:bg-secondary gba:text-secondary-foreground">
                          p.{citation.page}
                        </div>
                      )}
                    </div>
                    <p className="gba:text-muted-foreground gba:italic gba:line-clamp-2">"{citation.snippet}"</p>
                    {citation.url && (
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gba:text-primary gba:hover:underline gba:text-[11px] gba:mt-1 gba:inline-flex gba:items-center gba:gap-1"
                      >
                        View source
                        <ExternalLink className="gba:w-2.5 gba:h-2.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
