/**
 * Base types that match GraphQL responses exactly for Content entities
 * These match the new DBML schema with relations support
 */
import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { FileInfo } from '@/common/types/FileTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import type { ContentRole } from './contentEnums'

// Forward declarations for circular references
export interface ContentEntryRef {
  id: string
  title?: string | null
  role?: ContentRole
  picture?: string | null
  pictureThumbnail?: string | null
}

export interface ContentDocumentRef {
  id: string
  name?: string | null
  folder?: boolean
  fileInfo?: FileInfo | null
}

// =====================================================
// CONTENT ENTRY (nw_content.content_entry)
// =====================================================

export interface BaseContentEntry extends BaseEntity {
  id: string

  // ID references
  parentContentEntryId?: string | null
  creatorEmployeeId?: string | null
  updaterEmployeeId?: string | null
  contentGroupRef?: string | null
  contentTypeRef?: string | null

  // Direct relations (populated by GraphQL)
  parentContentEntry?: BaseContentEntry | null
  creatorEmployee?: EmployeeRef | null
  updaterEmployee?: EmployeeRef | null
  contentGroup?: CatalogEntry | null
  contentType?: CatalogEntry | null

  // Reverse relations (collections) - FIXED: All singular in GraphQL
  contentEntryCategory?: BaseContentEntryCategory[]
  contentEntryTag?: BaseContentEntryTag[]
  contentDocument?: BaseContentDocument[]
  contentEntryReaction?: BaseContentEntryReaction[]
  childContentEntry?: BaseContentEntry[] // Child entries (comments)

  // Core fields
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
}

// =====================================================
// CONTENT ENTRY CATEGORY (nw_content.content_entry_category)
// =====================================================

export interface BaseContentEntryCategory extends BaseEntity {
  id: string

  // ID references
  contentEntryId: string
  contentCategoryRef?: string | null

  // Direct relations
  contentEntry?: ContentEntryRef | null
  contentCategory?: CatalogEntry | null
}

// =====================================================
// CONTENT ENTRY TAG (nw_content.content_entry_tag)
// =====================================================

export interface BaseContentEntryTag extends BaseEntity {
  id: string

  // ID references
  contentEntryId: string
  contentTagRef?: string | null

  // Direct relations
  contentEntry?: ContentEntryRef | null
  contentTag?: CatalogEntry | null
}

// =====================================================
// CONTENT DOCUMENT (nw_content.content_document)
// =====================================================

export interface BaseContentDocument extends BaseEntity {
  id: string

  // ID references
  parentDocumentId?: string | null
  contentEntryId?: string | null
  documentGroupRef?: string | null
  documentTypeRef?: string | null

  // Direct relations
  parentDocument?: ContentDocumentRef | null
  contentEntry?: ContentEntryRef | null
  documentGroup?: CatalogEntry | null
  documentType?: CatalogEntry | null

  // Reverse relations (child documents) - Note: GraphQL doesn't auto-provide this
  // Query separately with parentDocumentId filter

  // Core fields
  folder?: boolean
  name?: string | null
  description?: string | null
  fileInfo?: FileInfo | null
}

// =====================================================
// CONTENT ENTRY REACTION (nw_content.content_entry_reaction)
// =====================================================

export interface BaseContentEntryReaction extends BaseEntity {
  id: string

  // ID references
  contentEntryId: string
  creatorEmployeeId: string
  contentReactionRef?: string | null

  // Direct relations
  contentEntry?: ContentEntryRef | null
  creatorEmployee?: EmployeeRef | null
  contentReaction?: CatalogEntry | null
}
