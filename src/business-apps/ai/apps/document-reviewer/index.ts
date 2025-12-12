/**
 * Document Reviewer Module
 *
 * AI-powered document review system that analyzes knowledge articles,
 * documents, contracts, and other content - providing visual annotations,
 * highlights, and comments.
 *
 * @module document-reviewer
 */

// Default export (main component for app entry)
export { default } from './DocumentReviewer'

// Types
export * from './types'

// Definitions (for setup/registration)
export {
  DOCUMENT_OBSERVER_TOOL,
  DOCUMENT_OBSERVER_INPUT_SCHEMA,
  DOCUMENT_OBSERVER_OUTPUT_SCHEMA
} from './definitions/document-observer-tool'
export {
  createDocumentReviewerAgent,
  DOCUMENT_REVIEWER_AGENT_ID,
  DOCUMENT_REVIEWER_SYSTEM_PROMPT,
  REVIEW_PRESETS
} from './definitions/document-reviewer-agent'

// Hooks
export { useDocumentReview } from './hooks/useDocumentReview'
export type { UseDocumentReviewOptions, UseDocumentReviewReturn } from './hooks/useDocumentReview'
export { useDocumentReviewChat } from './hooks/useDocumentReviewChat'
export type {
  UseDocumentReviewChatOptions,
  UseDocumentReviewChatReturn,
  DocumentContext,
  ChatReviewRequest,
  ChatReviewResponse
} from './hooks/useDocumentReviewChat'

// Context
export {
  DocumentReviewProvider,
  useDocumentReviewContext,
  useDocumentViewAnnotations
} from './context/DocumentReviewContext'
export type { DocumentReviewContextValue, DocumentReviewProviderProps } from './context/DocumentReviewContext'

// Components
export { DocumentAnnotationOverlay } from './components/DocumentAnnotationOverlay'
export type { DocumentAnnotationOverlayProps } from './components/DocumentAnnotationOverlay'

// Scripts (for registration)
export {
  registerDocumentReviewer,
  unregisterDocumentReviewer,
  getDocumentReviewerStatus
} from './scripts/register-document-reviewer'
