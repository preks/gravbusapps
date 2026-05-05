/**
 * Shared Versioning, Comments, Locking, and Publishing Types
 *
 * Common types used across all Every Desk apps (Documents, Notes, Spreadsheets)
 * for version control, collaborative commenting, file locking, and publishing workflows.
 */

// ============================================================================
// Version Management
// ============================================================================

/**
 * Version snapshot of a document, note, or spreadsheet
 */
export interface Version {
  id: string
  version: number
  content: string // JSON stringified content
  createdAt: string
  createdBy: string
  createdByName?: string
  createdByAvatar?: string
  changeDescription?: string
  isCheckpoint: boolean // Manual checkpoint vs auto-save
  isAutoSave: boolean // Auto-saved version
  fileSize: number
}

/**
 * Version comparison result
 */
export interface VersionComparison {
  versionA: Version
  versionB: Version
  diff: VersionDiff[]
}

/**
 * Individual diff entry in version comparison
 */
export interface VersionDiff {
  path: string
  type: 'added' | 'removed' | 'modified'
  oldValue?: unknown
  newValue?: unknown
}

// ============================================================================
// Comment Types
// ============================================================================

/**
 * Type of comment
 */
export type CommentType = 'document' | 'inline' | 'selection' | 'cell'

export interface WhiteboardCommentAnchor {
  x: number
  y: number
  width: number
  height: number
  elementIds?: string[]
}

export type SlideCommentAnchor =
  | {
      kind: 'slide'
      slideId: string
    }
  | {
      kind: 'element'
      slideId: string
      elementIds: string[]
    }
  | {
      kind: 'text-range'
      slideId: string
      elementId: string
      start: number
      end: number
      selectedText?: string
      contextBefore?: string
      contextAfter?: string
    }

/**
 * Comment on a document, note, or spreadsheet
 */
export interface Comment {
  id: string
  entityId: string // documentId, noteId, or appId
  entityType: 'document' | 'note' | 'spreadsheet_app' | 'slide' | 'whiteboard'
  type: CommentType
  content: string
  createdBy: string
  createdByName?: string
  createdByAvatar?: string
  createdAt: string
  updatedAt?: string
  resolvedAt?: string
  resolvedBy?: string

  // For inline/selection comments (Documents/Notes)
  selectionStart?: number
  selectionEnd?: number
  selectedText?: string
  anchorPath?: string // Path to DOM node for positioning

  // For cell comments (Spreadsheets)
  cellReference?: string // e.g., "A1" or "A1:C3"
  sheetId?: string

  // For whiteboard comments
  anchorData?: WhiteboardCommentAnchor

  // For slide comments
  slideAnchorData?: SlideCommentAnchor

  // Thread support
  parentId?: string
  replies?: Comment[]
  replyCount?: number
}

/**
 * Comment creation input
 */
export interface CreateCommentInput {
  type: CommentType
  content: string

  // Optional positioning data
  selectionStart?: number
  selectionEnd?: number
  selectedText?: string
  anchorPath?: string
  cellReference?: string
  sheetId?: string
  anchorData?: WhiteboardCommentAnchor
  slideAnchorData?: SlideCommentAnchor

  // Thread support
  parentId?: string

  // User info (optional - if provided, backend won't need to fetch)
  createdByName?: string
  createdByAvatar?: string
}

/**
 * Comment query options
 */
export interface CommentQueryOptions {
  includeResolved?: boolean
  includeReplies?: boolean
  type?: CommentType
  sheetId?: string
}

// ============================================================================
// Lock Management
// ============================================================================

/**
 * File lock state
 */
export interface FileLock {
  isLocked: boolean
  lockedBy?: string
  lockedByName?: string
  lockedByAvatar?: string
  lockedAt?: string
  lockReason?: string
  lockExpiry?: string
}

/**
 * Lock creation input
 */
export interface LockFileInput {
  reason?: string
  durationMinutes?: number // Default: 240 (4 hours)
}

// ============================================================================
// Publishing & Status
// ============================================================================

/**
 * Publishing status for documents/notes/spreadsheets
 */
export type PublishStatus = 'draft' | 'in_review' | 'published' | 'archived'

/**
 * Publishing metadata
 */
export interface PublishMetadata {
  status: PublishStatus
  publishedAt?: string
  publishedBy?: string
  publishedByName?: string
  publishVersion?: number
  publishNotes?: string
}

/**
 * Publish action input
 */
export interface PublishInput {
  publishNotes?: string
  createCheckpoint?: boolean
}

// ============================================================================
// Real-time Event Types
// ============================================================================

/**
 * Version created event
 */
export interface VersionCreatedEvent {
  entityId: string
  entityType: 'document' | 'note' | 'spreadsheet_app' | 'slide'
  version: Version
}

/**
 * Comment event
 */
export interface CommentEvent {
  entityId: string
  entityType: 'document' | 'note' | 'spreadsheet_app' | 'slide' | 'whiteboard'
  comment: Comment
  action: 'created' | 'updated' | 'deleted' | 'resolved' | 'unresolved'
}

/**
 * Lock event
 */
export interface LockEvent {
  entityId: string
  entityType: 'document' | 'note' | 'spreadsheet_app' | 'slide'
  lock: FileLock
  action: 'acquired' | 'released'
}

/**
 * Publish status changed event
 */
export interface PublishStatusEvent {
  entityId: string
  entityType: 'document' | 'note' | 'spreadsheet_app' | 'slide'
  metadata: PublishMetadata
  previousStatus?: PublishStatus
}
