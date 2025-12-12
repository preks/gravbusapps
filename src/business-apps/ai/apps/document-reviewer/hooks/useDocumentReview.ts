/**
 * useDocumentReview Hook
 *
 * Integrates with Prompt Manager to execute document reviews
 * and manage annotation state.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { DOCUMENT_REVIEWER_AGENT_ID } from '../definitions/document-reviewer-agent'
import type {
  DocumentAnnotation,
  DocumentReviewRequest,
  DocumentReviewResponse,
  ReviewType,
  ReviewableContentType,
  AnnotationSeverity,
  AnnotationCategory,
  DocumentObserverToolOutput
} from '../types'

export interface UseDocumentReviewOptions {
  /** Access token for API calls */
  accessToken: string
  /** Optional custom agent name (defaults to document_reviewer) */
  agentName?: string
  /** Optional agent ID if already known */
  agentId?: string
  /** Callback when review completes */
  onReviewComplete?: (response: DocumentReviewResponse) => void
  /** Callback when an annotation is selected */
  onAnnotationSelect?: (annotation: DocumentAnnotation | null) => void
  /** Callback when an annotation is resolved */
  onAnnotationResolve?: (annotationId: string) => void
}

export interface UseDocumentReviewReturn {
  /** Current annotations */
  annotations: DocumentAnnotation[]
  /** Currently selected annotation */
  selectedAnnotation: DocumentAnnotation | null
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: string | null
  /** Last review response */
  lastReview: DocumentReviewResponse | null
  /** Start a document review */
  reviewDocument: (request: DocumentReviewRequest) => Promise<DocumentReviewResponse>
  /** Quick review with minimal config */
  quickReview: (
    documentId: string,
    contentType: ReviewableContentType,
    reviewType: ReviewType
  ) => Promise<DocumentReviewResponse>
  /** Select an annotation */
  selectAnnotation: (annotationId: string | null) => void
  /** Resolve/dismiss an annotation */
  resolveAnnotation: (annotationId: string) => void
  /** Clear all annotations */
  clearAnnotations: () => void
  /** Filter annotations by severity */
  filterBySeverity: (severities: AnnotationSeverity[]) => DocumentAnnotation[]
  /** Filter annotations by category */
  filterByCategory: (categories: AnnotationCategory[]) => DocumentAnnotation[]
  /** Get annotations for a text range */
  getAnnotationsInRange: (start: number, end: number) => DocumentAnnotation[]
  /** Check if position has annotations */
  hasAnnotationAt: (offset: number) => boolean
}

/**
 * Hook for document review functionality
 *
 * Connects to Prompt Manager to execute the document_reviewer agent
 * and manages annotation state for the UI.
 */
export const useDocumentReview = (options: UseDocumentReviewOptions): UseDocumentReviewReturn => {
  const {
    accessToken,
    agentName = DOCUMENT_REVIEWER_AGENT_ID,
    agentId: providedAgentId,
    onReviewComplete,
    onAnnotationSelect,
    onAnnotationResolve
  } = options

  const client = usePromptManagerClient(accessToken)

  // State
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([])
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastReview, setLastReview] = useState<DocumentReviewResponse | null>(null)
  const [resolvedAgentId, setResolvedAgentId] = useState<string | null>(providedAgentId || null)

  // Refs for stable callbacks
  const annotationsRef = useRef<DocumentAnnotation[]>([])
  annotationsRef.current = annotations

  // Look up agent ID by name on mount
  useEffect(() => {
    if (providedAgentId || !agentName) return

    const lookupAgent = async () => {
      try {
        const prompts = await client.getPrompts({ promptName: agentName, limit: 1 })
        if (prompts.items.length > 0 && prompts.items[0]._id) {
          setResolvedAgentId(prompts.items[0]._id)
        }
      } catch (err) {
        console.warn('[useDocumentReview] Failed to look up agent by name:', err)
      }
    }

    lookupAgent()
  }, [client, agentName, providedAgentId])

  /**
   * Transform tool output to DocumentAnnotation format
   */
  const transformAnnotations = useCallback((output: DocumentObserverToolOutput): DocumentAnnotation[] => {
    if (!output.annotations) return []

    return output.annotations.map(ann => ({
      id: ann.id,
      type: ann.type,
      severity: ann.severity,
      category: ann.category,
      startOffset: ann.start_offset,
      endOffset: ann.end_offset,
      originalText: ann.original_text,
      message: ann.message,
      suggestion: ann.suggestion,
      details: ann.details,
      confidence: ann.confidence,
      resolved: false,
      createdAt: new Date().toISOString()
    }))
  }, [])

  /**
   * Execute a document review
   */
  const reviewDocument = useCallback(
    async (request: DocumentReviewRequest): Promise<DocumentReviewResponse> => {
      setIsLoading(true)
      setError(null)

      const startTime = Date.now()

      try {
        // Build form data for prompt execution
        const formData = new FormData()

        // User message describing the review request
        const userMessage = request.config.customInstructions
          ? `Review this document. ${request.config.customInstructions}`
          : `Review this document for ${request.config.reviewType} issues.`

        formData.append('user_message', userMessage)
        formData.append('document_id', request.documentId)
        formData.append('content_type', request.contentType)
        formData.append('review_type', request.config.reviewType)

        if (request.config.focusCategories?.length) {
          formData.append('focus_categories', request.config.focusCategories.join(','))
        }
        if (request.config.minSeverity) {
          formData.append('min_severity', request.config.minSeverity)
        }
        if (request.config.maxAnnotations) {
          formData.append('max_annotations', String(request.config.maxAnnotations))
        }
        if (request.config.customInstructions) {
          formData.append('custom_instructions', `\nCustom Instructions: ${request.config.customInstructions}`)
        }
        if (request.config.language) {
          formData.append('language', request.config.language)
        }
        if (request.content) {
          formData.append('document_content', request.content)
        }
        if (request.title) {
          formData.append('document_title', request.title)
        }

        // Need the agent ID to execute
        if (!resolvedAgentId) {
          throw new Error(
            'Document reviewer agent not found. Please ensure the "DocumentReviewer" Task Expert is created in Task Expert Studio.'
          )
        }

        // Execute the prompt
        const result = await client.executePromptById(resolvedAgentId, formData)

        // Parse the response
        let output: DocumentObserverToolOutput

        if (typeof result.content === 'string') {
          try {
            output = JSON.parse(result.content)
          } catch {
            throw new Error('Failed to parse AI response')
          }
        } else {
          output = result.content as DocumentObserverToolOutput
        }

        // Transform annotations
        const newAnnotations = transformAnnotations(output)
        setAnnotations(newAnnotations)

        // Build response
        const response: DocumentReviewResponse = {
          success: output.success,
          documentId: request.documentId,
          annotations: newAnnotations,
          summary: output.summary,
          issuesCounts: {
            critical: output.issues_count?.critical || 0,
            warning: output.issues_count?.warning || 0,
            info: output.issues_count?.info || 0,
            success: 0,
            total: output.issues_count?.total || newAnnotations.length
          },
          categoryBreakdown: newAnnotations.reduce(
            (acc, ann) => {
              acc[ann.category] = (acc[ann.category] || 0) + 1
              return acc
            },
            {} as Record<AnnotationCategory, number>
          ),
          score: output.score,
          metadata: {
            reviewType: request.config.reviewType,
            contentType: request.contentType,
            reviewedAt: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime
          },
          error: output.error
        }

        setLastReview(response)
        onReviewComplete?.(response)

        return response
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Review failed'
        setError(errorMessage)

        const errorResponse: DocumentReviewResponse = {
          success: false,
          documentId: request.documentId,
          annotations: [],
          summary: 'Review failed',
          issuesCounts: { critical: 0, warning: 0, info: 0, success: 0, total: 0 },
          categoryBreakdown: {} as Record<AnnotationCategory, number>,
          metadata: {
            reviewType: request.config.reviewType,
            contentType: request.contentType,
            reviewedAt: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime
          },
          error: errorMessage
        }

        setLastReview(errorResponse)
        return errorResponse
      } finally {
        setIsLoading(false)
      }
    },
    [client, resolvedAgentId, transformAnnotations, onReviewComplete]
  )

  /**
   * Quick review with minimal configuration
   */
  const quickReview = useCallback(
    async (
      documentId: string,
      contentType: ReviewableContentType,
      reviewType: ReviewType
    ): Promise<DocumentReviewResponse> => {
      return reviewDocument({
        documentId,
        contentType,
        config: { reviewType }
      })
    },
    [reviewDocument]
  )

  /**
   * Select an annotation
   */
  const selectAnnotation = useCallback(
    (annotationId: string | null) => {
      setSelectedAnnotationId(annotationId)
      const annotation = annotationId ? annotationsRef.current.find(a => a.id === annotationId) || null : null
      onAnnotationSelect?.(annotation)
    },
    [onAnnotationSelect]
  )

  /**
   * Resolve/dismiss an annotation
   */
  const resolveAnnotation = useCallback(
    (annotationId: string) => {
      setAnnotations(prev => prev.map(ann => (ann.id === annotationId ? { ...ann, resolved: true } : ann)))
      onAnnotationResolve?.(annotationId)
    },
    [onAnnotationResolve]
  )

  /**
   * Clear all annotations
   */
  const clearAnnotations = useCallback(() => {
    setAnnotations([])
    setSelectedAnnotationId(null)
    setLastReview(null)
    setError(null)
  }, [])

  /**
   * Filter annotations by severity
   */
  const filterBySeverity = useCallback((severities: AnnotationSeverity[]): DocumentAnnotation[] => {
    return annotationsRef.current.filter(ann => severities.includes(ann.severity))
  }, [])

  /**
   * Filter annotations by category
   */
  const filterByCategory = useCallback((categories: AnnotationCategory[]): DocumentAnnotation[] => {
    return annotationsRef.current.filter(ann => categories.includes(ann.category))
  }, [])

  /**
   * Get annotations within a text range
   */
  const getAnnotationsInRange = useCallback((start: number, end: number): DocumentAnnotation[] => {
    return annotationsRef.current.filter(ann => ann.startOffset < end && ann.endOffset > start)
  }, [])

  /**
   * Check if a position has any annotations
   */
  const hasAnnotationAt = useCallback((offset: number): boolean => {
    return annotationsRef.current.some(ann => offset >= ann.startOffset && offset <= ann.endOffset)
  }, [])

  // Get selected annotation object
  const selectedAnnotation = selectedAnnotationId ? annotations.find(a => a.id === selectedAnnotationId) || null : null

  return {
    annotations,
    selectedAnnotation,
    isLoading,
    error,
    lastReview,
    reviewDocument,
    quickReview,
    selectAnnotation,
    resolveAnnotation,
    clearAnnotations,
    filterBySeverity,
    filterByCategory,
    getAnnotationsInRange,
    hasAnnotationAt
  }
}

export default useDocumentReview
