/**
 * useDocumentReviewChat Hook
 *
 * Integrates document review functionality with the chat system.
 * Allows users to request document reviews conversationally through
 * the chat sidebar while viewing documents.
 */

import { useState, useCallback, useEffect } from 'react'
import { useDocumentReview } from './useDocumentReview'
import type { DocumentAnnotation, DocumentReviewResponse, ReviewType, ReviewableContentType } from '../types'

// ============================================================================
// Types
// ============================================================================

export interface DocumentContext {
  /** Document ID */
  documentId: string
  /** Content type */
  contentType: ReviewableContentType
  /** Document title */
  title?: string
  /** Document content (optional, will be fetched if not provided) */
  content?: string
  /** Current URL */
  url?: string
}

export interface ChatReviewRequest {
  /** The message from the user */
  message: string
  /** Parsed review type from the message */
  reviewType: ReviewType
  /** Any custom instructions extracted from the message */
  customInstructions?: string
}

export interface UseDocumentReviewChatOptions {
  /** Access token for API calls */
  accessToken: string
  /** Current document context (set when user is viewing a document) */
  documentContext?: DocumentContext | null
  /** Callback when annotations are ready to display */
  onAnnotationsReady?: (annotations: DocumentAnnotation[], documentId: string) => void
  /** Callback when review starts */
  onReviewStart?: () => void
  /** Callback when review completes */
  onReviewComplete?: (response: DocumentReviewResponse) => void
  /** Callback when review fails */
  onReviewError?: (error: string) => void
}

export interface UseDocumentReviewChatReturn {
  /** Current document context */
  documentContext: DocumentContext | null
  /** Whether currently reviewing */
  isReviewing: boolean
  /** Last review response */
  lastReview: DocumentReviewResponse | null
  /** Current annotations */
  annotations: DocumentAnnotation[]
  /** Set the current document context */
  setDocumentContext: (context: DocumentContext | null) => void
  /** Process a chat message that might be a review request */
  processMessage: (message: string) => Promise<ChatReviewResponse>
  /** Check if a message is a review request */
  isReviewRequest: (message: string) => boolean
  /** Get review type from a message */
  parseReviewRequest: (message: string) => ChatReviewRequest | null
  /** Clear current review state */
  clearReview: () => void
  /** Dispatch annotations to document view */
  dispatchAnnotations: () => void
}

export interface ChatReviewResponse {
  /** Whether this was handled as a review request */
  handled: boolean
  /** The review response if handled */
  response?: DocumentReviewResponse
  /** Error message if failed */
  error?: string
  /** Suggested reply for the chat */
  chatReply?: string
}

// ============================================================================
// Review Request Detection Patterns
// ============================================================================

const REVIEW_KEYWORDS = [
  'review',
  'check',
  'analyze',
  'analyse',
  'proofread',
  'proof-read',
  'audit',
  'examine',
  'inspect',
  'evaluate',
  'assess',
  'scan',
  'look at',
  'look over',
  'go through',
  'verify'
]

const DOCUMENT_KEYWORDS = ['document', 'article', 'content', 'text', 'page', 'this', 'it', 'contract', 'policy', 'file']

const REVIEW_TYPE_PATTERNS: Record<ReviewType, RegExp[]> = {
  grammar: [/grammar/i, /spelling/i, /typo/i, /punctuation/i, /language/i, /writing/i, /english/i],
  compliance: [/compliance/i, /policy/i, /regulation/i, /standard/i, /gdpr/i, /hipaa/i],
  legal: [/legal/i, /contract/i, /liability/i, /clause/i, /terms/i, /agreement/i],
  factual: [/fact/i, /accurate/i, /correct/i, /true/i, /outdated/i, /verify/i],
  style: [/style/i, /tone/i, /voice/i, /clarity/i, /readab/i, /flow/i],
  accessibility: [/accessib/i, /a11y/i, /screen reader/i, /wcag/i, /ada/i],
  brand: [/brand/i, /voice/i, /messaging/i, /terminolog/i],
  security: [/security/i, /sensitive/i, /pii/i, /confidential/i, /password/i, /credential/i],
  all: [/everything/i, /full/i, /complete/i, /thorough/i, /comprehensive/i]
}

// ============================================================================
// Hook Implementation
// ============================================================================

export const useDocumentReviewChat = (options: UseDocumentReviewChatOptions): UseDocumentReviewChatReturn => {
  const {
    accessToken,
    documentContext: initialContext = null,
    onAnnotationsReady,
    onReviewStart,
    onReviewComplete,
    onReviewError
  } = options

  // State
  const [documentContext, setDocumentContext] = useState<DocumentContext | null>(initialContext)
  const [isReviewing, setIsReviewing] = useState(false)

  // Use the document review hook
  const { annotations, lastReview, reviewDocument, clearAnnotations } = useDocumentReview({
    accessToken,
    onReviewComplete: response => {
      setIsReviewing(false)
      onReviewComplete?.(response)
      if (response.success && documentContext) {
        onAnnotationsReady?.(response.annotations, documentContext.documentId)
      }
    }
  })

  // Update context when prop changes
  useEffect(() => {
    if (initialContext) {
      setDocumentContext(initialContext)
    }
  }, [initialContext])

  /**
   * Check if a message is a document review request
   */
  const isReviewRequest = useCallback(
    (message: string): boolean => {
      const lowerMessage = message.toLowerCase()

      // Check for review keywords
      const hasReviewKeyword = REVIEW_KEYWORDS.some(kw => lowerMessage.includes(kw))
      if (!hasReviewKeyword) return false

      // Check for document reference (or assume current document if context exists)
      const hasDocumentRef = DOCUMENT_KEYWORDS.some(kw => lowerMessage.includes(kw))

      return hasReviewKeyword && (hasDocumentRef || documentContext !== null)
    },
    [documentContext]
  )

  /**
   * Parse review type and instructions from message
   */
  const parseReviewRequest = useCallback(
    (message: string): ChatReviewRequest | null => {
      if (!isReviewRequest(message)) return null

      const lowerMessage = message.toLowerCase()

      // Determine review type
      let reviewType: ReviewType = 'all'
      for (const [type, patterns] of Object.entries(REVIEW_TYPE_PATTERNS)) {
        if (patterns.some(pattern => pattern.test(lowerMessage))) {
          reviewType = type as ReviewType
          break
        }
      }

      // Extract any custom instructions (text after "for" or specific patterns)
      let customInstructions: string | undefined
      const forMatch = message.match(/(?:for|focusing on|looking for|check for)\s+(.+?)(?:\.|$)/i)
      if (forMatch) {
        customInstructions = forMatch[1].trim()
      }

      return {
        message,
        reviewType,
        customInstructions
      }
    },
    [isReviewRequest]
  )

  /**
   * Process a chat message that might be a review request
   */
  const processMessage = useCallback(
    async (message: string): Promise<ChatReviewResponse> => {
      // Check if this is a review request
      const request = parseReviewRequest(message)

      if (!request) {
        return {
          handled: false,
          chatReply: undefined
        }
      }

      // Check if we have document context
      if (!documentContext) {
        return {
          handled: true,
          error: 'No document is currently open. Please open a document first.',
          chatReply:
            "I'd be happy to review a document for you, but I don't see any document open right now. Please open a document and try again."
        }
      }

      // Start the review
      setIsReviewing(true)
      onReviewStart?.()

      try {
        const response = await reviewDocument({
          documentId: documentContext.documentId,
          contentType: documentContext.contentType,
          content: documentContext.content,
          title: documentContext.title,
          config: {
            reviewType: request.reviewType,
            customInstructions: request.customInstructions
          }
        })

        if (!response.success) {
          onReviewError?.(response.error || 'Review failed')
          return {
            handled: true,
            response,
            error: response.error,
            chatReply: `I encountered an issue while reviewing the document: ${response.error || 'Unknown error'}. Please try again.`
          }
        }

        // Build a friendly chat reply
        const chatReply = buildReviewSummaryReply(response, documentContext.title)

        return {
          handled: true,
          response,
          chatReply
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Review failed'
        setIsReviewing(false)
        onReviewError?.(errorMessage)

        return {
          handled: true,
          error: errorMessage,
          chatReply: `I couldn't complete the review: ${errorMessage}. Please try again.`
        }
      }
    },
    [documentContext, parseReviewRequest, reviewDocument, onReviewStart, onReviewError]
  )

  /**
   * Clear the current review state
   */
  const clearReview = useCallback(() => {
    clearAnnotations()
    setIsReviewing(false)
  }, [clearAnnotations])

  /**
   * Dispatch annotations to the document view via custom event
   */
  const dispatchAnnotations = useCallback(() => {
    if (!documentContext || !annotations.length) return

    globalThis.dispatchEvent(
      new CustomEvent('document-review-annotations', {
        detail: {
          documentId: documentContext.documentId,
          annotations,
          timestamp: new Date().toISOString()
        }
      })
    )
  }, [documentContext, annotations])

  // Auto-dispatch when annotations change
  useEffect(() => {
    if (annotations.length > 0 && documentContext) {
      dispatchAnnotations()
    }
  }, [annotations, documentContext, dispatchAnnotations])

  return {
    documentContext,
    isReviewing,
    lastReview,
    annotations,
    setDocumentContext,
    processMessage,
    isReviewRequest,
    parseReviewRequest,
    clearReview,
    dispatchAnnotations
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build a friendly chat reply summarizing the review results
 */
function buildReviewSummaryReply(response: DocumentReviewResponse, title?: string): string {
  const { issuesCounts, summary, score } = response
  const docName = title ? `"${title}"` : 'the document'

  if (issuesCounts.total === 0) {
    return `✅ Great news! I've reviewed ${docName} and found no issues. The content looks good!${
      score !== undefined ? ` Overall score: ${score}/100.` : ''
    }`
  }

  const parts: string[] = []

  parts.push(`📝 I've finished reviewing ${docName}. Here's what I found:\n`)

  if (issuesCounts.critical > 0) {
    parts.push(
      `🔴 **${issuesCounts.critical} critical issue${issuesCounts.critical > 1 ? 's' : ''}** - these should be addressed immediately`
    )
  }

  if (issuesCounts.warning > 0) {
    parts.push(`🟡 **${issuesCounts.warning} warning${issuesCounts.warning > 1 ? 's' : ''}** - recommended fixes`)
  }

  if (issuesCounts.info > 0) {
    parts.push(`🔵 **${issuesCounts.info} suggestion${issuesCounts.info > 1 ? 's' : ''}** - optional improvements`)
  }

  if (summary) {
    parts.push(`\n${summary}`)
  }

  if (score !== undefined) {
    parts.push(`\n📊 Overall score: **${score}/100**`)
  }

  parts.push(
    `\nI've highlighted all the issues in the document. Click on any highlight to see details and suggested fixes.`
  )

  return parts.join('\n')
}

export default useDocumentReviewChat
