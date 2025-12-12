import React, { useState, useEffect, useCallback } from 'react'
import { Button, ScrollArea } from '@newwork/nw-design-system'
import { CheckCircle, XCircle, Sparkles, CaretDown, CaretUp } from '@phosphor-icons/react'

export interface ReviewAnnotation {
  id: string
  type: string
  severity: 'critical' | 'warning' | 'info'
  category: string
  original_text: string
  message: string
  suggestion?: string
  start_offset?: number
  end_offset?: number
  resolved?: boolean
  accepted?: boolean
}

interface DocumentReviewPanelProps {
  content: string
  title: string
  onContentChange: (newContent: string) => void
  accessToken: string
}

/**
 * Document Review Panel - Shows AI suggestions for content
 * Allows accepting (applying) or declining suggestions
 */
export const DocumentReviewPanel: React.FC<DocumentReviewPanelProps> = ({
  content,
  title,
  onContentChange,
  accessToken: _accessToken
}) => {
  void _accessToken // Reserved for future authenticated API calls
  const [isExpanded, setIsExpanded] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [annotations, setAnnotations] = useState<ReviewAnnotation[]>([])
  const [error, setError] = useState<string | null>(null)

  // Broadcast content for chat to access
  useEffect(() => {
    if (!content) return

    // Strip HTML tags for plain text analysis
    const plainText = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const documentContext = {
      documentId: 'content-editor',
      documentTitle: title || 'New Article',
      documentContent: plainText,
      contentType: 'article_draft'
    }

    ;(globalThis as any).__currentDocumentContext = documentContext

    globalThis.dispatchEvent(
      new CustomEvent('document-context-changed', {
        detail: documentContext
      })
    )

    return () => {
      if ((globalThis as any).__currentDocumentContext?.documentId === 'content-editor') {
        ;(globalThis as any).__currentDocumentContext = null
      }
    }
  }, [content, title])

  // Listen for annotations from chat
  useEffect(() => {
    const handleAnnotations = (event: CustomEvent) => {
      const { documentId, annotations: newAnnotations, isLoading } = event.detail

      console.log('[DocumentReviewPanel] Received annotations:', { documentId, count: newAnnotations?.length })

      if (documentId !== 'content-editor') return

      if (isLoading !== undefined) {
        setIsReviewing(isLoading)
      }

      if (newAnnotations && newAnnotations.length > 0) {
        // Transform to our format
        const transformed: ReviewAnnotation[] = newAnnotations.map((ann: any) => ({
          id: ann.id,
          type: ann.type || 'suggestion',
          severity: ann.severity || 'info',
          category: ann.category || 'general',
          original_text: ann.originalText || ann.original_text || '',
          message: ann.message || '',
          suggestion: ann.suggestion || ann.suggestedText || ann.suggested_text || '',
          start_offset: ann.startOffset ?? ann.start_offset,
          end_offset: ann.endOffset ?? ann.end_offset,
          resolved: false,
          accepted: false
        }))

        setAnnotations(transformed)
        setIsExpanded(true)
        setError(null)
      }
    }

    globalThis.addEventListener('document-review-annotations', handleAnnotations as EventListener)
    return () => {
      globalThis.removeEventListener('document-review-annotations', handleAnnotations as EventListener)
    }
  }, [])

  // Accept a suggestion - apply the fix to content
  const handleAccept = useCallback(
    (annotation: ReviewAnnotation) => {
      if (!annotation.suggestion || !annotation.original_text) {
        // Just mark as resolved if no suggestion
        setAnnotations(prev => prev.map(a => (a.id === annotation.id ? { ...a, resolved: true, accepted: true } : a)))
        return
      }

      // Replace the original text with the suggestion in HTML content
      // Use case-insensitive search to handle variations
      const escapedOriginal = annotation.original_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escapedOriginal, 'gi')

      const newContent = content.replace(regex, match => {
        // Preserve original case pattern if possible
        return annotation.suggestion || match
      })

      if (newContent !== content) {
        onContentChange(newContent)
        console.log('[DocumentReviewPanel] Applied suggestion:', annotation.original_text, '->', annotation.suggestion)
      }

      // Mark as accepted
      setAnnotations(prev => prev.map(a => (a.id === annotation.id ? { ...a, resolved: true, accepted: true } : a)))
    },
    [content, onContentChange]
  )

  // Decline a suggestion - just dismiss it
  const handleDecline = useCallback((annotationId: string) => {
    setAnnotations(prev => prev.map(a => (a.id === annotationId ? { ...a, resolved: true, accepted: false } : a)))
  }, [])

  // Dismiss all
  const handleDismissAll = useCallback(() => {
    setAnnotations([])
    setIsExpanded(false)
  }, [])

  // Get unresolved count
  const unresolvedCount = annotations.filter(a => !a.resolved).length
  const acceptedCount = annotations.filter(a => a.accepted).length

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'warning':
        return 'warning'
      default:
        return 'info'
    }
  }

  if (annotations.length === 0 && !isReviewing) {
    return null
  }

  return (
    <div
      className="gba:border gba:border-border gba:rounded-lg gba:bg-card gba:shadow-sm"
      data-testid="document-review-panel"
    >
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:flex gba:items-center gba:justify-between gba:p-3 gba:text-left hover:gba:bg-accent/50 gba:transition-colors gba:rounded-t-lg"
      >
        <div className="gba:flex gba:items-center gba:gap-2">
          <Sparkles className="gba:w-4 gba:h-4 gba:text-primary" weight="fill" />
          <span className="gba:font-medium gba:text-sm">AI Review</span>
          {isReviewing ? (
            <Badge variant="secondary" className="gba:animate-pulse">
              Reviewing...
            </Badge>
          ) : unresolvedCount > 0 ? (
            <Badge variant="warning">
              {unresolvedCount} issue{unresolvedCount !== 1 ? 's' : ''}
            </Badge>
          ) : annotations.length > 0 ? (
            <Badge variant="success">{acceptedCount} fixed</Badge>
          ) : null}
        </div>
        {isExpanded ? <CaretUp className="gba:w-4 gba:h-4" /> : <CaretDown className="gba:w-4 gba:h-4" />}
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="gba:border-t gba:border-border">
          {error && <div className="gba:p-3 gba:bg-destructive/10 gba:text-destructive gba:text-sm">{error}</div>}

          <ScrollArea className="gba:max-h-[300px]">
            <div className="gba:p-2 gba:space-y-2">
              {annotations
                .filter(a => !a.resolved)
                .map(annotation => (
                  <div
                    key={annotation.id}
                    className="gba:p-3 gba:bg-muted/50 gba:rounded-lg gba:border gba:border-border"
                    data-testid={`review-annotation-${annotation.id}`}
                  >
                    {/* Category & Severity */}
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                      <Badge variant={getSeverityColor(annotation.severity) as any} className="gba:text-xs">
                        {annotation.category}
                      </Badge>
                    </div>

                    {/* Original text */}
                    <div className="gba:mb-2">
                      <span className="gba:text-xs gba:text-muted-foreground">Found:</span>
                      <div className="gba:bg-destructive/10 gba:text-destructive gba:px-2 gba:py-1 gba:rounded gba:text-sm gba:font-mono gba:mt-1">
                        "{annotation.original_text}"
                      </div>
                    </div>

                    {/* Message */}
                    <p className="gba:text-sm gba:text-foreground gba:mb-2">{annotation.message}</p>

                    {/* Suggestion */}
                    {annotation.suggestion && (
                      <div className="gba:mb-3">
                        <span className="gba:text-xs gba:text-muted-foreground">Suggestion:</span>
                        <div className="gba:bg-success/10 gba:text-success gba:px-2 gba:py-1 gba:rounded gba:text-sm gba:font-mono gba:mt-1">
                          "{annotation.suggestion}"
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="gba:flex gba:gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={() => handleAccept(annotation)}
                        className="gba:flex-1 gba:gap-1"
                        data-testid={`accept-annotation-${annotation.id}`}
                      >
                        <CheckCircle className="gba:w-3 gba:h-3" />
                        {annotation.suggestion ? 'Accept & Apply' : 'Acknowledge'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecline(annotation.id)}
                        className="gba:gap-1"
                        data-testid={`decline-annotation-${annotation.id}`}
                      >
                        <XCircle className="gba:w-3 gba:h-3" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}

              {/* Resolved items (collapsed) */}
              {annotations.filter(a => a.resolved).length > 0 && (
                <div className="gba:pt-2 gba:border-t gba:border-border">
                  <span className="gba:text-xs gba:text-muted-foreground">
                    {annotations.filter(a => a.resolved).length} resolved
                  </span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer actions */}
          {annotations.length > 0 && (
            <div className="gba:flex gba:justify-end gba:p-2 gba:border-t gba:border-border">
              <Button type="button" size="sm" variant="ghost" onClick={handleDismissAll}>
                Clear All
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DocumentReviewPanel
