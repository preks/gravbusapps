/**
 * Enhanced Content types with computed fields and relationships
 * Relations are now in BaseTypes, these add computed/display fields only
 */
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import type {
  BaseContentEntry,
  BaseContentEntryCategory,
  BaseContentEntryTag,
  BaseContentDocument,
  BaseContentEntryReaction
} from './contentBaseTypes'

// =====================================================
// ENHANCED CONTENT ENTRY
// =====================================================

export interface ContentEntry extends BaseContentEntry {
  // Computed fields (not from database)
  categoryNames?: string[]
  tagNames?: string[]
  reactionCount?: number
  commentCount?: number

  // Display fields
  creatorDisplayName?: string
  updaterDisplayName?: string
  formattedCreatedAt?: string
  formattedUpdatedAt?: string

  // Enhanced child collections (with computed fields) - FIXED: singular names
  contentEntryCategory?: ContentEntryCategory[]
  contentEntryTag?: ContentEntryTag[]
  contentDocument?: ContentDocument[]
  contentEntryReaction?: ContentEntryReaction[]

  // Children/comments must be queried separately (no auto-relation in GraphQL)
  childContentEntries?: ContentEntry[]
}

// =====================================================
// ENHANCED CONTENT ENTRY CATEGORY
// =====================================================

export interface ContentEntryCategory extends BaseContentEntryCategory {
  // Computed fields
  categoryName?: string
}

// =====================================================
// ENHANCED CONTENT ENTRY TAG
// =====================================================

export interface ContentEntryTag extends BaseContentEntryTag {
  // Computed fields
  tagName?: string
}

// =====================================================
// ENHANCED CONTENT DOCUMENT
// =====================================================

export interface ContentDocument extends BaseContentDocument {
  // Children must be queried separately (no auto-relation in GraphQL)
  childDocuments?: ContentDocument[]

  // Computed fields
  documentTypeName?: string
  fileSize?: number
  mimeType?: string
  filePath?: string
}

// =====================================================
// ENHANCED CONTENT ENTRY REACTION
// =====================================================

export interface ContentEntryReaction extends BaseContentEntryReaction {
  // Computed fields
  reactionName?: string // From contentReaction.value
  reactionEmoji?: string // From contentReaction.label or icon
  creatorDisplayName?: string
}

// =====================================================
// QUERY INTERFACES
// =====================================================

export interface ContentEntryQueryParams {
  offset?: number
  limit?: number
  search?: string
  role?: string | null
  contentGroupRef?: string | null
  contentTypeRef?: string | null
  categoryRefs?: string[]
  tagRefs?: string[]
  creatorEmployeeId?: string | null
  parentContentEntryId?: string | null
  activeFrom?: string
  activeTo?: string
  includeChildren?: boolean
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface ContentDocumentQueryParams {
  contentEntryId?: string
  parentDocumentId?: string | null
  folder?: boolean | null
  search?: string
  offset?: number
  limit?: number
}

export interface ContentReactionQueryParams {
  contentEntryId: string
  reaction?: string | null
  groupBy?: boolean
}

// =====================================================
// AGGREGATION TYPES
// =====================================================

export interface ReactionAggregation {
  reactionRef: string
  reactionName: string
  reactionEmoji?: string
  count: number
  employees: EmployeeRef[]
}

export interface ContentEntryStatistics {
  totalEntries: number
  totalComments: number
  totalReactions: number
  totalDocuments: number
  entriesByGroup: Record<string, number>
  entriesByType: Record<string, number>
}
