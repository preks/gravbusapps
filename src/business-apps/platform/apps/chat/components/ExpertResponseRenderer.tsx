/**
 * Expert Response Renderer
 *
 * Enhanced AI response renderer for Every Expert messages
 * Shows citations, confidence, and knowledge source references
 * Handles structured JSON responses with nice formatting
 */

import React, { useState, useMemo } from 'react'
import { Card, CardContent, Button, Badge } from '@newwork/nw-design-system'
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  ExternalLink,
  FileText,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Info
} from 'lucide-react'
import { AIResponseRenderer } from './AIResponseRenderer'
import { getExpertColorStyles } from '../utils/expertColorUtils'

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
  accessToken?: string
  'data-testid'?: string
}

/**
 * Try to parse content as JSON and detect if it's a structured response
 */
function parseStructuredResponse(content: string): { isStructured: boolean; data: any } {
  try {
    // Check if content looks like JSON
    const trimmed = content.trim()
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return { isStructured: false, data: null }
    }

    const parsed = JSON.parse(trimmed)

    // Check if it has common structured response fields
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed.summary ||
        parsed.strengths ||
        parsed.gaps ||
        parsed.fit !== undefined ||
        parsed.recommendation ||
        parsed.analysis ||
        parsed.findings ||
        parsed.result ||
        parsed.answer)
    ) {
      return { isStructured: true, data: parsed }
    }

    return { isStructured: false, data: null }
  } catch {
    return { isStructured: false, data: null }
  }
}

/**
 * Render a structured response nicely
 */
const StructuredResponseRenderer: React.FC<{ data: any; expertColor?: string; accessToken?: string }> = ({
  data,
  expertColor,
  accessToken = ''
}) => {
  const colorStyles = getExpertColorStyles(expertColor)

  // Render array items as badges or list items
  const renderArray = (items: any[], variant: 'success' | 'destructive' | 'default' = 'default') => {
    if (!items || items.length === 0) {
      return <span className="gba:text-muted-foreground gba:text-sm gba:italic">None identified</span>
    }

    return (
      <ul className="gba:space-y-1.5 gba:mt-2">
        {items.map((item, idx) => (
          <li key={idx} className="gba:flex gba:items-start gba:gap-2 gba:text-sm">
            {variant === 'success' && (
              <CheckCircle className="gba:w-4 gba:h-4 gba:text-success gba:mt-0.5 gba:flex-shrink-0" />
            )}
            {variant === 'destructive' && (
              <AlertTriangle className="gba:w-4 gba:h-4 gba:text-warning gba:mt-0.5 gba:flex-shrink-0" />
            )}
            {variant === 'default' && (
              <Sparkles className="gba:w-4 gba:h-4 gba:text-primary gba:mt-0.5 gba:flex-shrink-0" />
            )}
            <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="gba:space-y-4">
      {/* Summary */}
      {data.summary && (
        <div className="gba:bg-muted/50 gba:rounded-lg gba:p-4">
          <div className="gba:flex gba:items-start gba:gap-3">
            <Info className="gba:w-5 gba:h-5 gba:mt-0.5 gba:flex-shrink-0" style={colorStyles.text} />
            <div>
              <p className="gba:font-medium gba:text-sm gba:mb-1">Summary</p>
              <p className="gba:text-sm gba:text-foreground">{data.summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Fit indicator */}
      {data.fit !== undefined && (
        <div
          className={`gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg ${
            data.fit
              ? 'gba:bg-success-secondary/30 gba:border gba:border-success/30'
              : 'gba:bg-destructive-secondary/30 gba:border gba:border-destructive/30'
          }`}
        >
          {data.fit ? (
            <>
              <ThumbsUp className="gba:w-5 gba:h-5 gba:text-success" />
              <span className="gba:font-medium gba:text-success">Good Fit</span>
            </>
          ) : (
            <>
              <ThumbsDown className="gba:w-5 gba:h-5 gba:text-destructive" />
              <span className="gba:font-medium gba:text-destructive">Needs Improvement</span>
            </>
          )}
        </div>
      )}

      {/* Strengths */}
      {data.strengths && Array.isArray(data.strengths) && (
        <Card className="gba:border-success/30">
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <CheckCircle className="gba:w-5 gba:h-5 gba:text-success" />
              <span className="gba:font-semibold gba:text-success">Strengths</span>
              <Badge variant="success" className="gba:ml-auto">
                {data.strengths.length}
              </Badge>
            </div>
            {renderArray(data.strengths, 'success')}
          </CardContent>
        </Card>
      )}

      {/* Gaps / Weaknesses */}
      {data.gaps && Array.isArray(data.gaps) && (
        <Card className="gba:border-warning/30">
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <AlertTriangle className="gba:w-5 gba:h-5 gba:text-warning" />
              <span className="gba:font-semibold gba:text-warning">Gaps</span>
              <Badge variant="warning" className="gba:ml-auto">
                {data.gaps.length}
              </Badge>
            </div>
            {renderArray(data.gaps, 'destructive')}
          </CardContent>
        </Card>
      )}

      {/* Findings */}
      {data.findings && Array.isArray(data.findings) && (
        <Card>
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <Sparkles className="gba:w-5 gba:h-5" style={colorStyles.text} />
              <span className="gba:font-semibold">Findings</span>
            </div>
            {renderArray(data.findings, 'default')}
          </CardContent>
        </Card>
      )}

      {/* Recommendation */}
      {data.recommendation && (
        <Card className="gba:border-l-4" style={colorStyles.border}>
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-start gba:gap-3">
              <Sparkles className="gba:w-5 gba:h-5 gba:mt-0.5 gba:flex-shrink-0" style={colorStyles.text} />
              <div>
                <p className="gba:font-semibold gba:text-sm gba:mb-1">Recommendation</p>
                <p className="gba:text-sm">{data.recommendation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Answer (generic field) */}
      {data.answer && !data.summary && (
        <div className="gba:text-sm gba:leading-relaxed">
          <AIResponseRenderer content={data.answer} accessToken={accessToken} />
        </div>
      )}

      {/* Analysis (generic field) */}
      {data.analysis && typeof data.analysis === 'string' && (
        <div className="gba:text-sm gba:leading-relaxed">
          <AIResponseRenderer content={data.analysis} accessToken={accessToken} />
        </div>
      )}

      {/* Result (generic field) */}
      {data.result && typeof data.result === 'string' && (
        <div className="gba:text-sm gba:leading-relaxed">
          <AIResponseRenderer content={data.result} accessToken={accessToken} />
        </div>
      )}
    </div>
  )
}

const ExpertResponseRendererComponent: React.FC<ExpertResponseRendererProps> = ({
  content,
  expertColor,
  citations,
  confidence,
  accessToken = '',
  'data-testid': testId = 'expert-response'
}) => {
  const [showCitations, setShowCitations] = useState(false)

  const hasCitations = citations && citations.length > 0
  const showConfidence = confidence !== undefined && confidence < 0.9

  // Check if content is structured JSON
  const { isStructured, data: structuredData } = useMemo(() => parseStructuredResponse(content), [content])

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      {/* Main response - either structured or plain text */}
      {isStructured && structuredData ? (
        <StructuredResponseRenderer data={structuredData} expertColor={expertColor} accessToken={accessToken} />
      ) : (
        <AIResponseRenderer content={content} accessToken={accessToken} />
      )}

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
        <Card className="gba:border-l-4" style={getExpertColorStyles(expertColor).border}>
          <CardContent className="gba:p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCitations(!showCitations)}
              className="gba:w-full gba:justify-between gba:px-2 gba:h-auto gba:py-1"
              data-testid={`${testId}-toggle-citations`}
            >
              <div className="gba:flex gba:items-center gba:gap-2">
                <BookOpen className="gba:w-4 gba:h-4" style={getExpertColorStyles(expertColor).text} />
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
                            style={getExpertColorStyles(expertColor).text}
                          />
                        ) : (
                          <ExternalLink
                            className="gba:w-3 gba:h-3 gba:flex-shrink-0"
                            style={getExpertColorStyles(expertColor).text}
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

// OPTIMIZATION: Memoize to prevent unnecessary re-renders
export const ExpertResponseRenderer = React.memo(ExpertResponseRendererComponent, (prevProps, nextProps) => {
  // Only re-render if content or citations change
  // Parse is already memoized inside the component
  if (prevProps.content !== nextProps.content) return false
  if (prevProps.expertColor !== nextProps.expertColor) return false
  if (prevProps.confidence !== nextProps.confidence) return false
  if (prevProps.accessToken !== nextProps.accessToken) return false

  // Check citations array reference (should be stable)
  if (prevProps.citations !== nextProps.citations) return false

  return true
})
