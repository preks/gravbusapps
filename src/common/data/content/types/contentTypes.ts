/**
 * Content types - consolidated (BaseTypes integrated)
 */
import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import type { FileInfo } from '@/common/types/FileTypes'
import type { ContentRole } from './contentEnums'

// =====================================================
// CONTENT ENTRY
// =====================================================

export interface ContentEntry extends BaseEntity {
  // Core fields from GraphQL
  id: string
  parentContentEntryId?: string | null
  creatorEmployeeId?: string | null
  updaterEmployeeId?: string | null
  contentGroupRef?: string | null
  contentTypeRef?: string | null

  title?: string | null
  preview?: string | null
  content?: string | null
  picture?: string | null
  pictureThumbnail?: string | null
  timeToRead?: number | null
  displayCreator?: boolean
  displayUpdater?: boolean
  allowComment?: boolean
  allowReaction?: boolean
  role?: ContentRole
  entryVersion?: string | null

  // Relations from GraphQL
  parentContentEntry?: ContentEntry | null
  creatorEmployee?: EmployeeRef | null
  updaterEmployee?: EmployeeRef | null
  contentGroup?: CatalogEntry | null
  contentType?: CatalogEntry | null
  contentEntryCategory?: ContentEntryCategory[]
  contentEntryTag?: ContentEntryTag[]
  contentDocument?: ContentDocument[]
  contentEntryReaction?: ContentEntryReaction[]
  contentEntryReactionCounts?: {
    contentReactionRef: string
    count: number
    contentReaction?: CatalogEntry | null
  }[] // From view
  childContentEntries?: ContentEntry[] // Note: GraphQL uses childContentEntry, but we map to childContentEntries

  // Computed fields (added during transformation)
  categoryNames?: string[]
  tagNames?: string[]
  commentCount?: number
}

// =====================================================
// CONTENT ENTRY CATEGORY
// =====================================================

export interface ContentEntryCategory extends BaseEntity {
  id: string
  contentEntryId: string
  contentCategoryRef?: string | null

  // Relations from GraphQL
  contentEntry?: ContentEntry | null
  contentCategory?: CatalogEntry | null

  // Computed fields
  categoryName?: string
}

// =====================================================
// CONTENT ENTRY TAG
// =====================================================

export interface ContentEntryTag extends BaseEntity {
  id: string
  contentEntryId: string
  contentTagRef?: string | null

  // Relations from GraphQL
  contentEntry?: ContentEntry | null
  contentTag?: CatalogEntry | null

  // Computed fields
  tagName?: string
}

// =====================================================
// CONTENT DOCUMENT
// =====================================================

export interface ContentDocument extends BaseEntity {
  id: string
  parentDocumentId?: string | null
  contentEntryId?: string | null
  documentGroupRef?: string | null
  documentTypeRef?: string | null

  folder?: boolean
  name?: string | null
  description?: string | null
  fileInfo?: FileInfo | null

  // Relations from GraphQL
  parentDocument?: ContentDocument | null
  contentEntry?: ContentEntry | null
  documentGroup?: CatalogEntry | null
  documentType?: CatalogEntry | null
  childDocuments?: ContentDocument[]

  // Computed fields
  documentTypeName?: string
  fileSize?: number
  mimeType?: string
  filePath?: string
}

// =====================================================
// CONTENT ENTRY REACTION
// =====================================================

export interface ContentEntryReaction extends BaseEntity {
  id: string
  contentEntryId: string
  creatorEmployeeId: string
  contentReactionRef?: string | null

  // Relations from GraphQL
  contentEntry?: ContentEntry | null
  creatorEmployee?: EmployeeRef | null
  contentReaction?: CatalogEntry | null

  // Computed fields
  reactionName?: string
  reactionEmoji?: string
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
