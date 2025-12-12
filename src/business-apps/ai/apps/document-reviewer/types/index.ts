/**
 * Document Reviewer Types
 *
 * Types for the Document Reviewer agent that analyzes documents,
 * knowledge articles, contracts, and other content - providing
 * visual annotations, highlights, and comments.
 */

// ============================================================================
// Annotation Types
// ============================================================================

/**
 * Types of visual annotations that can be applied to documents
 */
export type AnnotationType = 'highlight' | 'comment' | 'suggestion' | 'error' | 'warning' | 'info'

/**
 * Severity levels for issues found in documents
 */
export type AnnotationSeverity = 'critical' | 'warning' | 'info' | 'success'

/**
 * Categories of issues that can be detected
 */
export type AnnotationCategory =
  | 'grammar'
  | 'spelling'
  | 'punctuation'
  | 'style'
  | 'clarity'
  | 'compliance'
  | 'legal'
  | 'factual'
  | 'outdated'
  | 'inconsistency'
  | 'accessibility'
  | 'brand'
  | 'security'
  | 'custom'

/**
 * A single annotation on a document
 */
export interface DocumentAnnotation {
  /** Unique identifier for this annotation */
  id: string

  /** Type of visual annotation */
  type: AnnotationType

  /** Severity level */
  severity: AnnotationSeverity

  /** Category of the issue */
  category: AnnotationCategory

  /** Start position in the document (character offset) */
  startOffset: number

  /** End position in the document (character offset) */
  endOffset: number

  /** The original text that was flagged */
  originalText: string

  /** Description of the issue */
  message: string

  /** Suggested fix (if applicable) */
  suggestion?: string

  /** Additional context or explanation */
  details?: string

  /** Confidence score (0-1) of the AI's assessment */
  confidence?: number

  /** Whether this annotation has been resolved/dismissed */
  resolved?: boolean

  /** Timestamp when the annotation was created */
  createdAt: string
}

// ============================================================================
// Review Configuration
// ============================================================================

/**
 * Types of content that can be reviewed
 */
export type ReviewableContentType =
  | 'knowledge_article'
  | 'content_entry'
  | 'document'
  | 'contract'
  | 'policy'
  | 'email_template'
  | 'custom'

/**
 * Types of reviews that can be performed
 */
export type ReviewType =
  | 'grammar'
  | 'compliance'
  | 'legal'
  | 'factual'
  | 'style'
  | 'accessibility'
  | 'brand'
  | 'security'
  | 'all'

/**
 * Configuration for a document review request
 */
export interface ReviewConfiguration {
  /** Type of review to perform */
  reviewType: ReviewType

  /** Specific categories to focus on (optional, defaults to all for review type) */
  focusCategories?: AnnotationCategory[]

  /** Minimum severity to report (optional, defaults to 'info') */
  minSeverity?: AnnotationSeverity

  /** Maximum number of annotations to return (optional) */
  maxAnnotations?: number

  /** Custom instructions for the reviewer (optional) */
  customInstructions?: string

  /** Language for review (optional, auto-detected if not specified) */
  language?: string
}

// ============================================================================
// Review Request/Response
// ============================================================================

/**
 * Request to review a document
 */
export interface DocumentReviewRequest {
  /** ID of the document/content to review */
  documentId: string

  /** Type of content being reviewed */
  contentType: ReviewableContentType

  /** Review configuration */
  config: ReviewConfiguration

  /** Optional: Document content (if not fetching by ID) */
  content?: string

  /** Optional: Document title for context */
  title?: string

  /** Optional: Additional context about the document */
  context?: string
}

/**
 * Response from a document review
 */
export interface DocumentReviewResponse {
  /** Whether the review was successful */
  success: boolean

  /** The document ID that was reviewed */
  documentId: string

  /** List of annotations found */
  annotations: DocumentAnnotation[]

  /** Summary of the review */
  summary: string

  /** Count of issues by severity */
  issuesCounts: {
    critical: number
    warning: number
    info: number
    success: number
    total: number
  }

  /** Count of issues by category */
  categoryBreakdown: Record<AnnotationCategory, number>

  /** Overall document score (0-100) */
  score?: number

  /** Review metadata */
  metadata: {
    reviewType: ReviewType
    contentType: ReviewableContentType
    reviewedAt: string
    processingTimeMs: number
  }

  /** Error message if review failed */
  error?: string
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * State for the annotation overlay component
 */
export interface AnnotationOverlayState {
  /** Currently active annotations */
  annotations: DocumentAnnotation[]

  /** Currently selected annotation ID */
  selectedAnnotationId: string | null

  /** Whether annotations are visible */
  isVisible: boolean

  /** Loading state */
  isLoading: boolean

  /** Error state */
  error: string | null

  /** Filter settings */
  filters: {
    severity: AnnotationSeverity[]
    categories: AnnotationCategory[]
    showResolved: boolean
  }
}

/**
 * Actions for managing annotation state
 */
export interface AnnotationActions {
  /** Start a new review */
  startReview: (request: DocumentReviewRequest) => Promise<DocumentReviewResponse>

  /** Select an annotation */
  selectAnnotation: (id: string | null) => void

  /** Resolve/dismiss an annotation */
  resolveAnnotation: (id: string) => void

  /** Apply a suggestion */
  applySuggestion: (id: string) => void

  /** Add a manual comment */
  addComment: (offset: number, message: string) => void

  /** Clear all annotations */
  clearAnnotations: () => void

  /** Toggle visibility */
  toggleVisibility: () => void

  /** Update filters */
  setFilters: (filters: Partial<AnnotationOverlayState['filters']>) => void
}

// ============================================================================
// Prompt Manager Integration Types
// ============================================================================

/**
 * Tool input schema for document_observer
 */
export interface DocumentObserverToolInput {
  document_id: string
  content_type: ReviewableContentType
  review_type: ReviewType
  focus_categories?: string[]
  min_severity?: AnnotationSeverity
  max_annotations?: number
  custom_instructions?: string
  language?: string
  document_content?: string
  document_title?: string
}

/**
 * Tool output schema for document_observer
 */
export interface DocumentObserverToolOutput {
  success: boolean
  annotations: Array<{
    id: string
    type: AnnotationType
    severity: AnnotationSeverity
    category: AnnotationCategory
    start_offset: number
    end_offset: number
    original_text: string
    message: string
    suggestion?: string
    details?: string
    confidence?: number
  }>
  summary: string
  issues_count: {
    critical: number
    warning: number
    info: number
    total: number
  }
  score?: number
  error?: string
}
