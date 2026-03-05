/**
 * Document Apps - TypeScript Type Definitions
 *
 * Core types for the Document Apps module including documents, templates,
 * and approval workflow types.
 */

import type { Version, Comment, FileLock, PublishStatus, PublishMetadata } from '../../shared/types/versioning'

// Re-export shared types for convenience
export type { Version, Comment, FileLock, PublishStatus, PublishMetadata }

/**
 * Document status lifecycle
 */
export type DocumentStatus = 'draft' | 'saved' | 'pending_approval' | 'approved' | 'rejected' | 'archived'

/**
 * Document file source information
 * Extended with file service fields for PDF preview/download
 */
export interface DocumentFileInfo {
  originalName: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  // File service fields for downloading/previewing stored files (PDFs, etc.)
  path?: string
  fileId?: string
  accessScope?: string
  appName?: string
  folderPath?: string
  pageCount?: number
}

/**
 * Page size preset id (used with tiptap-pagination-plus PAGE_SIZES).
 */
export type PageSizeId = 'A4' | 'A3' | 'A5' | 'LETTER' | 'LEGAL' | 'TABLOID'

/**
 * Document formatting metadata.
 * Margins are stored in centimetres when marginUnit is 'cm' (default).
 */
export interface DocumentFormatting {
  fontFamily?: string
  fontSize?: number
  lineHeight?: number
  margins?: {
    top: number
    right: number
    bottom: number
    left: number
  }
  /** Page size preset; used only when not pageless. */
  pageSize?: PageSizeId
  /** Portrait or landscape; swap width/height for landscape. */
  orientation?: 'portrait' | 'landscape'
  /** Display unit for margins; default 'cm'. */
  marginUnit?: 'cm' | 'in'
  /** Page background colour (hex, e.g. #ffffff). Default white. */
  pageColor?: string
  /** If true, document is one continuous scroll (no fixed pages). */
  pageless?: boolean
}

/**
 * Document sharing metadata
 */
export interface DocumentShare {
  userId: string
  userName?: string
  userEmail?: string
  permission: 'view' | 'edit' | 'comment'
  sharedAt: string
  sharedBy: string
}

/**
 * Document approval request
 */
export interface DocumentApprovalRequest {
  id: string
  documentId: string
  requestedBy: string
  requestedAt: string
  approvers: Array<{
    userId: string
    userName?: string
    userPicture?: string // Base64 avatar thumbnail
    status: 'pending' | 'approved' | 'rejected'
    respondedAt?: string
    comments?: string
    workflowId?: string // Individual workflow ID for this approver
  }>
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  dueDate?: string
  message?: string
  workflowId?: string // Legacy: first workflow ID
  workflowIds?: string[] // All workflow IDs (one per approver)
}

/**
 * Complete document definition
 */
export interface Document {
  id: string
  title: string
  description?: string
  content: string // HTML content from editor
  plainText?: string // Plain text version for search
  status: DocumentStatus
  sourceFile?: DocumentFileInfo
  formatting?: DocumentFormatting
  tags?: string[]
  category?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  lastModifiedBy?: string
  filePath?: string // Storage path for shareable URLs
  sharedWith?: DocumentShare[]
  approvalRequest?: DocumentApprovalRequest
  templateId?: string // If created from a template
  version?: number
  versionHistory?: DocumentVersion[]
  // Permission info (from backend for shared documents)
  permission?: 'owner' | 'view' | 'edit' | 'comment' | 'admin'
  isShared?: boolean
  sharedBy?: string

  // Versioning, locking, and publishing metadata
  currentVersion?: number
  lock?: FileLock
  publishMetadata?: PublishMetadata
  commentCount?: number
  hasUnresolvedComments?: boolean

  settings?: {
    external?: import('./externalUnstructuredConnector').ExternalDocumentProvenance
    readOnly?: boolean
    [key: string]: unknown
  }
}

/**
 * Document version for history tracking
 */
export interface DocumentVersion {
  version: number
  content: string
  modifiedAt: string
  modifiedBy: string
  changeDescription?: string
}

/**
 * Document summary for list views (lighter than full Document)
 */
export interface DocumentSummary {
  id: string
  title: string
  description?: string
  status: DocumentStatus
  category?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
  filePath?: string
  isOwner?: boolean
  permission?: 'owner' | 'view' | 'edit' | 'comment'
  sharedCount?: number
  sharedWithCount?: number
  wordCount?: number
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  approvalRequest?: DocumentApprovalRequest // Full approval details
  isShared?: boolean // Whether this doc was shared with current user
  sharedBy?: string // User ID of person who shared (if shared)
  sharedByName?: string // Display name of person who shared (if shared)
  sourceFile?: DocumentFileInfo // Source file info for PDFs
  isPdf?: boolean // Shorthand for sourceFile?.mimeType === 'application/pdf'
  settings?: {
    external?: import('./externalUnstructuredConnector').ExternalDocumentProvenance
    readOnly?: boolean
    [key: string]: unknown
  }
}

/**
 * Template category for organization.
 * Values match the document API: GET /document/api/v1/templates?category=
 */
export const TEMPLATE_CATEGORY_API_VALUES = [
  'contracts',
  'agreements',
  'letters',
  'reports',
  'proposals',
  'policies',
  'procedures',
  'forms',
  'other'
] as const

export type TemplateCategory = (typeof TEMPLATE_CATEGORY_API_VALUES)[number]

/**
 * Document template definition
 */
export interface DocumentTemplate {
  id: string
  name: string
  description?: string
  content: string // HTML content
  category: TemplateCategory
  /** Optional entity context for "Insert field" panel (e.g. candidate, employee). When set, overrides derivation from category. */
  context?: string
  tags?: string[]
  thumbnail?: string // Preview image URL
  createdAt: string
  updatedAt: string
  createdBy: string
  isPublic: boolean // Available to all users
  usageCount?: number
  formatting?: DocumentFormatting
  placeholders?: TemplatePlaceholder[]
}

/**
 * Template placeholder for variable substitution
 */
export interface TemplatePlaceholder {
  id: string
  key: string // e.g., {{COMPANY_NAME}}
  label: string // Human-readable label
  description?: string
  defaultValue?: string
  type: 'text' | 'date' | 'number' | 'select'
  options?: string[] // For select type
  required?: boolean
}

/**
 * Template summary for list views
 */
export interface TemplateSummary {
  id: string
  name: string
  description?: string
  category: TemplateCategory
  context?: string
  tags?: string[]
  thumbnail?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  isPublic: boolean
  usageCount?: number
}

/**
 * Parsed Word document result
 */
export interface ParsedWordDocument {
  fileName: string
  fileSize: number
  html: string // Converted HTML content
  plainText: string // Plain text version
  messages: WordParserMessage[]
  images?: WordImage[]
}

/**
 * Word parser message (warnings/info during conversion)
 */
export interface WordParserMessage {
  type: 'error' | 'warning' | 'info'
  message: string
  paragraphIndex?: number
}

/**
 * Embedded image from Word document
 */
export interface WordImage {
  contentType: string
  base64: string
  altText?: string
}

/**
 * Document filter options for list queries
 */
export interface DocumentFilterOptions {
  status?: DocumentStatus[]
  category?: string
  tags?: string[]
  createdBy?: string
  dateFrom?: string
  dateTo?: string
  searchQuery?: string
}

/**
 * Sort options for document lists
 */
export interface DocumentSortOptions {
  field: 'title' | 'createdAt' | 'updatedAt' | 'status'
  direction: 'asc' | 'desc'
}

/**
 * Approval workflow configuration
 */
export interface ApprovalWorkflowConfig {
  documentId: string
  documentTitle: string
  documentUrl: string
  approvers: string[] // User IDs
  message?: string
  dueDate?: string
  requireAllApprovers?: boolean
  notifyOnComplete?: boolean
}

/**
 * Export format options
 */
export type ExportFormat = 'docx' | 'pdf' | 'html' | 'txt' | 'odt'

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat
  includeMetadata?: boolean
  pageSize?: 'letter' | 'a4'
  orientation?: 'portrait' | 'landscape'
}
