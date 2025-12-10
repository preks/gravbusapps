/**
 * Content Document Types
 * Document entity types with fields mapping, descriptors, and form fields
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { FileInfo } from '@/common/types/FileTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { ContentEntry } from './contentEntryTypes'

// =====================================================
// CONTENT DOCUMENT
// =====================================================

export interface ContentDocument extends BaseEntity {
  id?: string
  parentDocumentId?: string | null
  contentEntryId?: string | null
  documentGroupRef?: string | null
  documentTypeRef?: string | null
  recordState?: string

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
}

// =====================================================
// FIELD MAPPINGS
// =====================================================

/**
 * ContentDocument GraphQL Field Names Mapping
 * Maps interface property names to actual GraphQL field names
 */
export const ContentDocumentFields = {
  // BaseEntity fields
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  isDeleted: 'isDeleted',
  recordState: 'recordState',
  activeFrom: 'activeFrom',
  activeTo: 'activeTo',
  version: 'version',
  additionalProperties: 'additionalProperties',

  // ContentDocument fields
  id: 'id',
  parentDocumentId: 'parentDocumentId',
  contentEntryId: 'contentEntryId',
  documentGroupRef: 'documentGroupRef',
  documentTypeRef: 'documentTypeRef',
  folder: 'folder',
  name: 'name',
  description: 'description',
  fileInfo: 'fileInfo',

  // Relations
  parentDocument: 'parentDocument',
  contentEntry: 'contentEntry',
  documentGroup: 'documentGroup',
  documentType: 'documentType',
  childDocuments: 'childDocuments'
} as const

// =====================================================
// DESCRIPTORS
// =====================================================

/**
 * Content Document Descriptors
 * Used for building dynamic GraphQL queries with search, filter, and sort capabilities
 */
export const CONTENT_DOCUMENT_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,

  // Content Document specific fields
  { key: 'id', searchPaths: ['id'], sortPath: 'id', type: 'text' },
  { key: 'parentDocumentId', searchPaths: ['parentDocumentId'], sortPath: 'parentDocumentId', type: 'text' },
  { key: 'contentEntryId', searchPaths: ['contentEntryId'], sortPath: 'contentEntryId', type: 'text' },
  { key: 'documentGroupRef', searchPaths: ['documentGroupRef'], sortPath: 'documentGroupRef', type: 'text' },
  { key: 'documentTypeRef', searchPaths: ['documentTypeRef'], sortPath: 'documentTypeRef', type: 'text' },
  { key: 'folder', searchPaths: ['folder'], sortPath: 'folder', type: 'boolean' },
  { key: 'name', searchPaths: ['name'], sortPath: 'name', type: 'text' },
  { key: 'description', searchPaths: ['description'], sortPath: 'description', type: 'text' },

  // JSONB fileInfo fields
  {
    key: 'fileName',
    searchPaths: ['fileInfo.fileName'],
    sortPath: 'fileInfo.fileName',
    type: 'text'
  },
  {
    key: 'fileSize',
    searchPaths: ['fileInfo.size'],
    sortPath: 'fileInfo.size',
    type: 'number'
  },
  {
    key: 'mimeType',
    searchPaths: ['fileInfo.mimeType'],
    sortPath: 'fileInfo.mimeType',
    type: 'text'
  },

  // Nested relations
  {
    key: 'documentGroupName',
    searchPaths: ['documentGroup.value'],
    sortPath: 'documentGroup.value',
    type: 'text'
  },
  {
    key: 'documentTypeName',
    searchPaths: ['documentType.value'],
    sortPath: 'documentType.value',
    type: 'text'
  },
  {
    key: 'parentDocumentName',
    searchPaths: ['parentDocument.name'],
    sortPath: 'parentDocument.name',
    type: 'text'
  }
]

// =====================================================
// FORM FIELDS
// =====================================================

/**
 * Content Document Form Fields
 * Maps form field names to GraphQL mutation field names
 */
export const ContentDocumentFormFields = {
  // Core fields
  parentDocumentId: 'parentDocumentId',
  contentEntryId: 'contentEntryId',
  documentGroupRef: 'documentGroupRef',
  documentTypeRef: 'documentTypeRef',
  folder: 'folder',
  name: 'name',
  description: 'description',
  fileInfo: 'fileInfo',
  recordState: 'recordState',
  activeFrom: 'activeFrom',
  activeTo: 'activeTo'
} as const

// =====================================================
// FRAGMENT
// =====================================================

// Import catalog entry fragment
import { CATALOG_ENTRY_REF } from '@/common/data/catalog/queries/catalogFragments'

const CATALOG_ENTRY_FRAGMENT = CATALOG_ENTRY_REF

/**
 * Content Document Fragment
 * Reusable fragment for consistent document data fetching
 */
export const CONTENT_DOCUMENT_FRAGMENT = `
  id
  version
  parentDocumentId
  contentEntryId
  documentGroupRef
  documentTypeRef
  folder
  name
  description
  fileInfo
  recordState
  createdAt
  createdBy
  updatedAt
  updatedBy
  isDeleted
  activeFrom
  activeTo
  documentType {
    ${CATALOG_ENTRY_FRAGMENT}
  }
`
