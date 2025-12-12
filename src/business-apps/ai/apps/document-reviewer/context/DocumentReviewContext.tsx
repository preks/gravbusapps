/**
 * DocumentReviewContext
 *
 * React context for sharing document review state between components.
 * Allows document views to set context and chat to send annotations.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import type { DocumentAnnotation, DocumentReviewResponse, ReviewableContentType, ReviewType } from '../types'

// ============================================================================
// Types
// ============================================================================

export interface DocumentContext {
  documentId: string
  contentType: ReviewableContentType
  title?: string
  content?: string
  url?: string
}

export interface DocumentReviewContextValue {
  /** Current document being viewed */
  currentDocument: DocumentContext | null
  /** Set the current document context */
  setCurrentDocument: (doc: DocumentContext | null) => void
  /** Current annotations */
  annotations: DocumentAnnotation[]
  /** Set annotations (usually from chat) */
  setAnnotations: (annotations: DocumentAnnotation[]) => void
  /** Add annotations (merge with existing) */
  addAnnotations: (annotations: DocumentAnnotation[]) => void
  /** Clear annotations */
  clearAnnotations: () => void
  /** Selected annotation ID */
  selectedAnnotationId: string | null
  /** Select an annotation */
  selectAnnotation: (id: string | null) => void
  /** Resolve an annotation */
  resolveAnnotation: (id: string) => void
  /** Last review response */
  lastReview: DocumentReviewResponse | null
  /** Set last review response */
  setLastReview: (review: DocumentReviewResponse | null) => void
  /** Whether a review is in progress */
  isReviewing: boolean
  /** Set reviewing state */
  setIsReviewing: (reviewing: boolean) => void
  /** Request a review from the current document */
  requestReview: (reviewType: ReviewType, customInstructions?: string) => void
  /** Listeners for review requests */
  onReviewRequested: ((request: { reviewType: ReviewType; customInstructions?: string }) => void) | null
  /** Set review request listener */
  setOnReviewRequested: (
    callback: ((request: { reviewType: ReviewType; customInstructions?: string }) => void) | null
  ) => void
}

// ============================================================================
// Context
// ============================================================================

const DocumentReviewContext = createContext<DocumentReviewContextValue | null>(null)

// ============================================================================
// Provider
// ============================================================================

export interface DocumentReviewProviderProps {
  children: ReactNode
}

export const DocumentReviewProvider: React.FC<DocumentReviewProviderProps> = ({ children }) => {
  const [currentDocument, setCurrentDocument] = useState<DocumentContext | null>(null)
  const [annotations, setAnnotationsState] = useState<DocumentAnnotation[]>([])
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [lastReview, setLastReview] = useState<DocumentReviewResponse | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [onReviewRequested, setOnReviewRequestedState] = useState<
    ((request: { reviewType: ReviewType; customInstructions?: string }) => void) | null
  >(null)

  // Set annotations (replace all)
  const setAnnotations = useCallback((newAnnotations: DocumentAnnotation[]) => {
    setAnnotationsState(newAnnotations)
  }, [])

  // Add annotations (merge)
  const addAnnotations = useCallback((newAnnotations: DocumentAnnotation[]) => {
    setAnnotationsState(prev => {
      const existingIds = new Set(prev.map(a => a.id))
      const toAdd = newAnnotations.filter(a => !existingIds.has(a.id))
      return [...prev, ...toAdd]
    })
  }, [])

  // Clear annotations
  const clearAnnotations = useCallback(() => {
    setAnnotationsState([])
    setSelectedAnnotationId(null)
    setLastReview(null)
  }, [])

  // Select annotation
  const selectAnnotation = useCallback((id: string | null) => {
    setSelectedAnnotationId(id)
  }, [])

  // Resolve annotation
  const resolveAnnotation = useCallback((id: string) => {
    setAnnotationsState(prev => prev.map(ann => (ann.id === id ? { ...ann, resolved: true } : ann)))
  }, [])

  // Request review (called from document view, handled by chat)
  const requestReview = useCallback(
    (reviewType: ReviewType, customInstructions?: string) => {
      if (onReviewRequested) {
        onReviewRequested({ reviewType, customInstructions })
      }
    },
    [onReviewRequested]
  )

  // Set review request listener
  const setOnReviewRequested = useCallback(
    (callback: ((request: { reviewType: ReviewType; customInstructions?: string }) => void) | null) => {
      setOnReviewRequestedState(() => callback)
    },
    []
  )

  // Listen for custom events from chat
  useEffect(() => {
    const handleAnnotationsEvent = (event: CustomEvent) => {
      const { documentId, annotations: newAnnotations } = event.detail

      // Only apply if it's for the current document
      if (currentDocument && currentDocument.documentId === documentId) {
        setAnnotations(newAnnotations)
      }
    }

    globalThis.addEventListener('document-review-annotations', handleAnnotationsEvent as EventListener)

    return () => {
      globalThis.removeEventListener('document-review-annotations', handleAnnotationsEvent as EventListener)
    }
  }, [currentDocument, setAnnotations])

  // Clear annotations when document changes
  useEffect(() => {
    clearAnnotations()
  }, [currentDocument?.documentId, clearAnnotations])

  const value: DocumentReviewContextValue = {
    currentDocument,
    setCurrentDocument,
    annotations,
    setAnnotations,
    addAnnotations,
    clearAnnotations,
    selectedAnnotationId,
    selectAnnotation,
    resolveAnnotation,
    lastReview,
    setLastReview,
    isReviewing,
    setIsReviewing,
    requestReview,
    onReviewRequested,
    setOnReviewRequested
  }

  return <DocumentReviewContext.Provider value={value}>{children}</DocumentReviewContext.Provider>
}

// ============================================================================
// Hook
// ============================================================================

export const useDocumentReviewContext = (): DocumentReviewContextValue => {
  const context = useContext(DocumentReviewContext)

  if (!context) {
    throw new Error('useDocumentReviewContext must be used within a DocumentReviewProvider')
  }

  return context
}

// ============================================================================
// Helper Hook for Document Views
// ============================================================================

/**
 * Hook for document views to register themselves and receive annotations
 */
export const useDocumentViewAnnotations = (
  documentId: string,
  contentType: ReviewableContentType,
  options?: {
    title?: string
    content?: string
  }
) => {
  const context = useDocumentReviewContext()

  // Register document on mount
  useEffect(() => {
    context.setCurrentDocument({
      documentId,
      contentType,
      title: options?.title,
      content: options?.content,
      url: typeof globalThis.window !== 'undefined' ? globalThis.location.href : undefined
    })

    return () => {
      context.setCurrentDocument(null)
    }
  }, [documentId, contentType, options?.title, options?.content, context])

  return {
    annotations: context.annotations,
    selectedAnnotationId: context.selectedAnnotationId,
    isReviewing: context.isReviewing,
    selectAnnotation: context.selectAnnotation,
    resolveAnnotation: context.resolveAnnotation,
    requestReview: context.requestReview,
    clearAnnotations: context.clearAnnotations
  }
}

export default DocumentReviewContext
