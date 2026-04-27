import React, { useState, useEffect, useCallback } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { CheckCircle, XCircle, SparkleIcon, CaretDown, CaretUp, WarningCircle, Info } from '@phosphor-icons/react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import translations from '../_i18n'

export interface ReviewAnnotation {
  id: string
  type: string
  severity: 'critical' | 'warning' | 'info'
  category: string
  original_text: string
  message: string
  suggestion?: string
  resolved?: boolean
  accepted?: boolean
}

interface DocumentReviewPanelProps {
  content: string
  title: string
  onContentChange: (newContent: string) => void
  onAnnotationsChange?: (annotations: ReviewAnnotation[]) => void
  accessToken: string
}

export const DocumentReviewPanel: React.FC<DocumentReviewPanelProps> = ({
  content,
  title,
  onContentChange,
  onAnnotationsChange,
  accessToken
}) => {
  const { t } = useTranslation(translations)
  // COLLAPSED BY DEFAULT
  const [isExpanded, setIsExpanded] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [annotations, setAnnotations] = useState<ReviewAnnotation[]>([])
  const [error, setError] = useState<string | null>(null)

  const client = usePromptManagerClient(accessToken)

  // Broadcast content for chat
  useEffect(() => {
    if (!content) return
    const plainText = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const documentContext = {
      documentId: 'document-creator',
      documentTitle: title || 'New Document',
      documentContent: plainText,
      contentType: 'contract_draft'
    }
    ;(globalThis as any).__currentDocumentContext = documentContext
    globalThis.dispatchEvent(new CustomEvent('document-context-changed', { detail: documentContext }))
    return () => {
      if ((globalThis as any).__currentDocumentContext?.documentId === 'document-creator') {
        ;(globalThis as any).__currentDocumentContext = null
      }
    }
  }, [content, title])

  // Listen for annotations from chat
  useEffect(() => {
    const handleAnnotations = (event: CustomEvent) => {
      const { documentId, annotations: newAnnotations, isLoading } = event.detail
      if (documentId !== 'document-creator') return
      if (isLoading !== undefined) setIsReviewing(isLoading)
      if (newAnnotations?.length > 0) {
        const transformed = newAnnotations.map((ann: any, idx: number) => ({
          id: ann.id || `ann_${idx}`,
          type: ann.type || 'suggestion',
          severity: ann.severity || 'info',
          category: ann.category || 'general',
          original_text: ann.originalText || ann.original_text || '',
          message: ann.message || '',
          suggestion: ann.suggestion || ann.suggestedText || ann.suggested_text || '',
          resolved: false,
          accepted: false
        }))
        setAnnotations(transformed)
        onAnnotationsChange?.(transformed)
        setError(null)
      }
    }
    globalThis.addEventListener('document-review-annotations', handleAnnotations as EventListener)
    return () => globalThis.removeEventListener('document-review-annotations', handleAnnotations as EventListener)
  }, [onAnnotationsChange])

  const handleReview = useCallback(async () => {
    if (!content.trim()) {
      setError('No content to review')
      return
    }
    setIsReviewing(true)
    setError(null)

    try {
      const prompts = await client.getPrompts({ promptName: 'DocumentReviewer', limit: 1 })
      let agentId = prompts.results?.[0]?._id
      if (!agentId) {
        const fallback = await client.getPrompts({ limit: 100 })
        const reviewer = fallback.results?.find(
          p => p.name?.toLowerCase().includes('review') || p.name?.toLowerCase().includes('document')
        )
        agentId = reviewer?._id
      }
      if (!agentId) {
        setError(t('error-document-reviewer-not-configured'))
        setIsReviewing(false)
        return
      }

      const plainText = content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      const fullPrompt = `Review this document for issues:\n\nTitle: ${title || 'Untitled'}\n\n--- CONTENT ---\n${plainText}\n--- END CONTENT ---\n\nAnalyze for grammar, spelling, clarity, and legal/professional issues.\nReturn ONLY valid JSON with this structure:\n{\n  "annotations": [\n    {\n      "id": "ann_1",\n      "type": "error",\n      "severity": "warning",\n      "category": "grammar",\n      "original_text": "exact text with issue",\n      "message": "Description of issue",\n      "suggestion": "Suggested fix"\n    }\n  ],\n  "summary": "Found X issues"\n}`

      const formData = new FormData()
      formData.append('user_params', JSON.stringify({ query: fullPrompt }))
      const response = await client.executePromptById(agentId, formData)

      if (response.content) {
        const responseText = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
        const jsonMatch = responseText.match(/\{[\s\S]*"annotations"[\s\S]*\}/m)
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0])
          if (data.annotations?.length) {
            const transformed = data.annotations.map((ann: any, idx: number) => ({
              id: ann.id || `ann_${idx}`,
              type: ann.type || 'suggestion',
              severity: ann.severity || 'info',
              category: ann.category || 'general',
              original_text: ann.original_text || '',
              message: ann.message || '',
              suggestion: ann.suggestion || '',
              resolved: false,
              accepted: false
            }))
            setAnnotations(transformed)
            onAnnotationsChange?.(transformed)
          }
        } else {
          setError('Could not parse review results')
        }
      }
    } catch (err) {
      console.error('[DocumentReviewPanel] Review failed:', err)
      setError('Review failed. Please try again.')
    } finally {
      setIsReviewing(false)
    }
  }, [content, title, client, onAnnotationsChange])

  const handleAccept = useCallback(
    (annotation: ReviewAnnotation) => {
      if (annotation.suggestion && annotation.original_text) {
        const escapedOriginal = annotation.original_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escapedOriginal, 'gi')
        const newContent = content.replace(regex, annotation.suggestion)
        if (newContent !== content) onContentChange(newContent)
      }
      const updated = annotations.map(a => (a.id === annotation.id ? { ...a, resolved: true, accepted: true } : a))
      setAnnotations(updated)
      onAnnotationsChange?.(updated)
    },
    [content, onContentChange, annotations, onAnnotationsChange]
  )

  const handleDecline = useCallback(
    (annotationId: string) => {
      const updated = annotations.map(a => (a.id === annotationId ? { ...a, resolved: true, accepted: false } : a))
      setAnnotations(updated)
      onAnnotationsChange?.(updated)
    },
    [annotations, onAnnotationsChange]
  )

  const handleClearAll = useCallback(() => {
    setAnnotations([])
    onAnnotationsChange?.([])
    setIsExpanded(false)
  }, [onAnnotationsChange])

  const unresolvedCount = annotations.filter(a => !a.resolved).length
  const acceptedCount = annotations.filter(a => a.accepted).length

  const getSeverityClasses = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'gba:bg-destructive-secondary',
          text: 'gba:text-destructive',
          border: 'gba:border-destructive/30',
          icon: <XCircle className="gba:w-4 gba:h-4" weight="fill" />
        }
      case 'warning':
        return {
          bg: 'gba:bg-warning-secondary',
          text: 'gba:text-warning-secondary-foreground',
          border: 'gba:border-warning/30',
          icon: <WarningCircle className="gba:w-4 gba:h-4" weight="fill" />
        }
      default:
        return {
          bg: 'gba:bg-info-secondary',
          text: 'gba:text-info-secondary-foreground',
          border: 'gba:border-info/30',
          icon: <Info className="gba:w-4 gba:h-4" weight="fill" />
        }
    }
  }

  return (
    <div
      className="gba:border gba:border-border gba:rounded-xl gba:bg-card gba:overflow-visible gba:relative gba:z-10"
      data-testid="document-review-panel"
    >
      {/* Header - Always visible */}
      <div
        className={`gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-muted ${isExpanded ? 'gba:rounded-t-xl' : 'gba:rounded-xl'}`}
      >
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gba:flex gba:items-center gba:gap-2 gba:text-left"
        >
          <SparkleIcon className="gba:w-5 gba:h-5 gba:text-primary" weight="fill" />
          <span className="gba:font-semibold gba:text-sm gba:text-foreground">AI Review</span>
          {isReviewing && (
            <span className="gba:px-2 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium gba:animate-pulse gba:bg-info-secondary gba:text-info-secondary-foreground">
              Analyzing...
            </span>
          )}
          {!isReviewing && unresolvedCount > 0 && (
            <span className="gba:px-2 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-semibold gba:bg-warning-secondary gba:text-warning-secondary-foreground">
              {unresolvedCount} issue{unresolvedCount !== 1 ? 's' : ''}
            </span>
          )}
          {!isReviewing && unresolvedCount === 0 && acceptedCount > 0 && (
            <span className="gba:px-2 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-semibold gba:bg-success-secondary gba:text-success-secondary-foreground">
              ✓ All resolved
            </span>
          )}
          {isExpanded ? (
            <CaretUp className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
          ) : (
            <CaretDown className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
          )}
        </button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleReview}
          disabled={isReviewing || !content.trim()}
          className="gba:gap-2"
        >
          <SparkleIcon className="gba:w-4 gba:h-4" />
          {isReviewing ? 'Reviewing...' : 'Review'}
        </Button>
      </div>

      {/* Expanded Content - Scrollable with max height */}
      {isExpanded && (
        <div className="gba:border-t gba:border-border gba:bg-card gba:max-h-[280px] gba:overflow-y-auto gba:rounded-b-xl">
          {error && (
            <div className="gba:p-3 gba:text-sm gba:bg-destructive-secondary gba:text-destructive">{error}</div>
          )}

          {annotations.length === 0 && !isReviewing && !error && (
            <div className="gba:p-5 gba:text-center gba:text-muted-foreground">
              <SparkleIcon className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-2 gba:opacity-40" />
              <p className="gba:text-sm">Click &quot;Review&quot; to analyze your document</p>
            </div>
          )}

          {isReviewing && annotations.length === 0 && (
            <div className="gba:p-5 gba:text-center gba:text-muted-foreground">
              <div className="gba:w-6 gba:h-6 gba:border-2 gba:border-border gba:border-t-primary gba:rounded-full gba:animate-spin gba:mx-auto gba:mb-2" />
              <p className="gba:text-sm">Analyzing document...</p>
            </div>
          )}

          <div className="gba:p-3 gba:space-y-3">
            {annotations
              .filter(a => !a.resolved)
              .map(annotation => {
                const severity = getSeverityClasses(annotation.severity)
                return (
                  <div
                    key={annotation.id}
                    className={`gba:p-3 gba:rounded-lg gba:border ${severity.bg} ${severity.border}`}
                  >
                    {/* Header row */}
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <span
                        className={`gba:flex gba:items-center gba:gap-1 gba:text-xs gba:font-bold ${severity.text}`}
                      >
                        {severity.icon}
                        {annotation.category.toUpperCase()}
                      </span>
                    </div>

                    {/* Issue text */}
                    {annotation.original_text && (
                      <div className="gba:px-2 gba:py-1.5 gba:rounded gba:text-sm gba:font-mono gba:mb-2 gba:bg-muted gba:text-destructive">
                        &quot;{annotation.original_text}&quot;
                      </div>
                    )}

                    {/* Message */}
                    <p className="gba:text-sm gba:mb-2 gba:text-foreground">{annotation.message}</p>

                    {/* Suggestion */}
                    {annotation.suggestion && (
                      <div className="gba:px-2 gba:py-1.5 gba:rounded gba:text-sm gba:font-mono gba:mb-3 gba:bg-success-secondary gba:text-success-secondary-foreground">
                        → &quot;{annotation.suggestion}&quot;
                      </div>
                    )}

                    {/* Actions */}
                    <div className="gba:flex gba:gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAccept(annotation)}
                        className="gba:flex-1 gba:gap-1 gba:h-8"
                      >
                        <CheckCircle className="gba:w-3 gba:h-3" weight="bold" />
                        Fix
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecline(annotation.id)}
                        className="gba:gap-1 gba:h-8"
                      >
                        <XCircle className="gba:w-3 gba:h-3" />
                        Ignore
                      </Button>
                    </div>
                  </div>
                )
              })}
          </div>

          {annotations.length > 0 && unresolvedCount === 0 && (
            <div className="gba:p-3 gba:text-center gba:border-t gba:border-border">
              <Button type="button" size="sm" variant="ghost" onClick={handleClearAll}>
                Clear Results
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DocumentReviewPanel
