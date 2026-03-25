/**
 * Note Apps - TypeScript Type Definitions
 *
 * Core types for the Notes module including notes, folders,
 * and collaboration types.
 */

import type { Version, Comment, FileLock, PublishStatus, PublishMetadata } from '../../shared/types/versioning'

// Re-export shared types for convenience
export type { Version, Comment, FileLock, PublishStatus, PublishMetadata }

/**
 * Note color themes for visual organization
 */
export type NoteColor = 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'gray'

/**
 * Note sharing permission levels
 */
export type NotePermission = 'view' | 'comment' | 'edit' | 'admin'

/**
 * Note settings for customization
 */
export interface NoteSettings {
  fontFamily?: string
  fontSize?: number
  lineHeight?: number
  showWordCount?: boolean
  autoSave?: boolean
  spellCheck?: boolean
}

/**
 * Note share information
 */
export interface NoteShare {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  userAvatar?: string
  permission: NotePermission
  sharedAt: string
  sharedBy: string
  message?: string
}

/**
 * Complete note definition
 */
export interface Note {
  id: string
  title?: string
  content?: string // HTML content from editor
  contentJson?: Record<string, unknown> // Structured content (for block editors)
  plainText?: string // Plain text for search
  tags?: string[]
  color?: NoteColor
  icon?: string // Emoji or icon name
  isPinned: boolean
  isArchived: boolean
  parentId?: string // For folder/hierarchy support
  position: number // For ordering within parent
  settings?: NoteSettings
  ownerId: string
  currentVersion: number
  createdAt: string
  updatedAt: string
  // Computed/joined fields
  children?: Note[]
  // Permission info (from backend for shared notes)
  permission?: NotePermission | 'owner'
  isShared?: boolean
  sharedBy?: string

  // Versioning, locking, and publishing metadata
  lock?: FileLock
  publishMetadata?: PublishMetadata
  commentCount?: number
  hasUnresolvedComments?: boolean
}

/**
 * Note summary for list views (lighter than full Note)
 */
export interface NoteSummary {
  id: string
  title?: string
  preview?: string // First ~100 chars of content
  tags?: string[]
  color?: NoteColor
  icon?: string
  isPinned: boolean
  isArchived: boolean
  parentId?: string
  position: number
  ownerId: string
  createdAt: string
  updatedAt: string
  wordCount?: number
  hasChildren?: boolean
  childCount?: number
  // Sharing info
  isShared?: boolean
  sharedBy?: string
  sharedByName?: string
  permission?: NotePermission | 'owner'
  sharedWithCount?: number
  // Note type info (for identifying handwriting notes)
  contentJson?: Record<string, unknown>
  noteType?: string
}

/**
 * Note tree node for hierarchical display
 */
export interface NoteTreeNode extends NoteSummary {
  children: NoteTreeNode[]
  isExpanded?: boolean
  depth: number
}

/**
 * Create note DTO
 */
export interface CreateNoteInput {
  title?: string
  content?: string
  contentJson?: Record<string, unknown>
  tags?: string[]
  color?: NoteColor
  icon?: string
  parentId?: string
  settings?: NoteSettings
}

/**
 * Update note DTO
 */
export interface UpdateNoteInput {
  title?: string
  content?: string
  contentJson?: Record<string, unknown>
  tags?: string[]
  color?: NoteColor
  icon?: string
  isPinned?: boolean
  isArchived?: boolean
  settings?: NoteSettings
  createVersion?: boolean
}

/**
 * Move note DTO
 */
export interface MoveNoteInput {
  parentId: string | null
  position: number
}

/**
 * Note query parameters
 */
export interface NoteQueryParams {
  parentId?: string
  rootOnly?: boolean
  tags?: string[]
  search?: string
  includeShared?: boolean
  includeArchived?: boolean
  pinnedOnly?: boolean
  page?: number
  limit?: number
  sortBy?: 'position' | 'title' | 'createdAt' | 'updatedAt'
  sortOrder?: 'ASC' | 'DESC'
}

/**
 * Note template for quick creation
 */
export interface NoteTemplate {
  id: string
  name: string
  /** i18n key for localized name (when set, prefer t(nameKey) over name in UI) */
  nameKey?: string
  description?: string
  /** i18n key for localized description */
  descriptionKey?: string
  content: string
  contentJson?: Record<string, unknown>
  icon?: string
  color?: NoteColor
  category: 'meeting' | 'project' | 'personal' | 'work' | 'other'
  isBuiltIn: boolean
  createdBy?: string
  createdAt?: string
}

/**
 * Note filter options for UI
 */
export interface NoteFilterOptions {
  tags?: string[]
  colors?: NoteColor[]
  dateRange?: {
    from?: string
    to?: string
  }
  searchQuery?: string
  showArchived?: boolean
  showPinnedOnly?: boolean
}

/**
 * Note sort options for UI
 */
export interface NoteSortOptions {
  field: 'title' | 'createdAt' | 'updatedAt' | 'position'
  direction: 'asc' | 'desc'
}

/**
 * Collaboration participant for notes
 */
export interface NoteParticipant {
  userId: string
  userName: string
  userColor: string
  userAvatar?: string
  cursor?: {
    line?: number
    column?: number
    offset?: number
  }
  selection?: {
    start: { line?: number; column?: number; offset?: number }
    end: { line?: number; column?: number; offset?: number }
  } | null
  lastActiveAt: Date
}

/**
 * Export format options
 */
export type NoteExportFormat = 'markdown' | 'html' | 'pdf' | 'txt'

/**
 * Export options
 */
export interface NoteExportOptions {
  format: NoteExportFormat
  includeMetadata?: boolean
  includeChildren?: boolean
  /** Localized label for untitled notes in export content (e.g. from t('export-untitled')) */
  labelUntitled?: string
  /** Localized filename for untitled notes (e.g. from t('export-untitled-filename')) */
  filenameUntitled?: string
}

/**
 * Paginated response wrapper
 */
export interface PaginatedNotes {
  items: NoteSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
}
