/**
 * Content Entry Query Builder
 * Builds GraphQL field selections for ContentEntry queries
 */

import { type ContentEntry } from '../types/contentEntryTypes'
import { CATALOG_ENTRY_REF } from '@/common/data/catalog/queries/catalogFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { CONTENT_DOCUMENT_FRAGMENT } from '../types/contentDocumentTypes'
import { ContentRole } from '../constants/contentConstants'

export interface ContentEntryQueryOptions {
  config?: 'minimal' | 'list' | 'full' | 'detail'
  fields?: Array<keyof ContentEntry>
  relationLimit?: number // default: 10
  relationOffset?: number // default: 0
}

// Predefined Configs
const CONFIGS: Record<string, Array<keyof ContentEntry>> = {
  minimal: ['id', 'title', 'preview', 'createdAt'],
  list: [
    'id',
    'title',
    'preview',
    'picture',
    'contentGroup',
    'contentTypeId',
    'creatorEmployee',
    'contentType',
    'createdAt',
    'allowComment',
    'allowReaction',
    'descendantContentEntriesAggregate',
    'contentEntryReactions',
    'contentEntryReactionCounts',
    'childContentEntriesAggregate'
  ],
  full: [
    'id',
    'title',
    'preview',
    'content',
    'picture',
    'contentGroup',
    'contentTypeId',
    'creatorEmployee',
    'contentType',
    'contentEntryCategories',
    'contentEntryTags',
    'contentDocuments',
    'createdAt',
    'updatedAt',
    'activeFrom',
    'activeTo',
    'descendantContentEntriesAggregate',
    'contentEntryReactionCounts'
  ],
  detail: [
    'id',
    'version',
    'title',
    'preview',
    'content',
    'picture',
    'contentGroup',
    'contentTypeId',
    'languageRef',
    'creatorEmployee',
    'updaterEmployee',
    'acceptorEmployee',
    'contentType',
    'language',
    'contentEntryCategories',
    'contentEntryTags',
    'contentDocuments',
    'contentEntryReactions',
    'contentEntryReactionCounts',
    'childContentEntries',
    'createdAt',
    'createdBy',
    'updatedAt',
    'updatedBy',
    'activeFrom',
    'activeTo',
    'allowComment',
    'allowReaction',
    'accepted',
    'displayCreator',
    'displayUpdater',
    'descendantContentEntriesAggregate'
  ]
}

// Scalar field names
const SCALAR_FIELDS = [
  'id',
  'version',
  'title',
  'preview',
  'content',
  'picture',
  'contentGroup',
  'contentTypeId',
  'languageRef',
  'creatorEmployeeId',
  'updaterEmployeeId',
  'acceptorEmployeeId',
  'parentContentEntryId',
  'rootContentEntryId',
  'role',
  'allowComment',
  'allowReaction',
  'accepted',
  'displayCreator',
  'displayUpdater',
  'timeToRead',
  'entryVersion',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
  'activeFrom',
  'activeTo',
  'isDeleted',
  'recordState'
] as const

/**
 * Builds scalar fields for ContentEntry query
 */
function buildScalarFields(fields: Array<keyof ContentEntry>): string[] {
  const parts: string[] = []
  for (const field of SCALAR_FIELDS) {
    if (fields.includes(field)) {
      parts.push(field)
    }
  }
  return parts
}

/**
 * Builds relation fields for ContentEntry query
 */
function buildRelationFields(fields: Array<keyof ContentEntry>, limit: number, offset: number): string[] {
  const parts: string[] = []

  // ContentType relation (new taxonomy table)
  if (fields.includes('contentType')) {
    parts.push(`contentType { id name nameI18n contentGroup }`)
  }

  // Language still uses catalog
  if (fields.includes('language')) {
    parts.push(`language { ${CATALOG_ENTRY_REF} }`)
  }

  // Employee relations
  if (fields.includes('creatorEmployee')) {
    parts.push(`creatorEmployee { ${EMPLOYEE_REF} }`)
  }
  if (fields.includes('updaterEmployee')) {
    parts.push(`updaterEmployee { ${EMPLOYEE_REF} }`)
  }
  if (fields.includes('acceptorEmployee')) {
    parts.push(`acceptorEmployee { ${EMPLOYEE_REF} }`)
  }

  // Content entry categories
  if (fields.includes('contentEntryCategories')) {
    parts.push(`
      contentEntryCategories(
        where: { isDeleted: { _eq: false } }
        limit: ${limit}
        offset: ${offset}
      ) {
        id
        version
        contentCategoryId
        contentCategory {
          id
          name
          nameI18n
        }
      }
    `)
  }

  // Content entry tags
  if (fields.includes('contentEntryTags')) {
    parts.push(`
      contentEntryTags(
        where: { isDeleted: { _eq: false } }
        limit: ${limit}
        offset: ${offset}
      ) {
        id
        version
        contentTagId
        contentTag {
          id
          name
          nameI18n
        }
      }
    `)
  }

  // Content documents
  if (fields.includes('contentDocuments')) {
    parts.push(`
      contentDocuments(
        where: { isDeleted: { _eq: false } }
        limit: ${limit}
        offset: ${offset}
      ) {
        ${CONTENT_DOCUMENT_FRAGMENT}
      }
    `)
  }

  // Content entry reactions
  if (fields.includes('contentEntryReactions')) {
    parts.push(`
      contentEntryReactions(
        where: { isDeleted: { _eq: false } }
        limit: ${limit}
        offset: ${offset}
      ) {
        id
        version
        contentReactionRef
        createdBy
        creatorEmployeeId
        creatorEmployee {
          ${EMPLOYEE_REF}
        }
        contentReaction {
          ${CATALOG_ENTRY_REF}
        }
      }
    `)
  }

  // Content entry reaction counts
  if (fields.includes('contentEntryReactionCounts')) {
    parts.push(`
      contentEntryReactionCounts {
        contentReactionRef
        count
        contentReaction {
          ${CATALOG_ENTRY_REF}
        }
      }
    `)
  }

  // Child content entries
  if (fields.includes('childContentEntries')) {
    parts.push(`
      childContentEntries(
        where: { isDeleted: { _eq: false } }
        limit: ${limit}
        offset: ${offset}
        orderBy: { createdAt: DESC }
      ) {
        id
        version
        title
        preview
        content
        role
        accepted
        creatorEmployeeId
        creatorEmployee {
          ${EMPLOYEE_REF}
        }
        createdAt
        updatedAt
      }
    `)
  }

  // Descendant content entries aggregate
  if (fields.includes('descendantContentEntriesAggregate')) {
    parts.push(`
      descendantContentEntriesAggregate(
        where: { role: { _eq: "${ContentRole.COMMENT}" }, isDeleted: { _eq: false } }
      ) {
        aggregate { count }
      }
    `)
  }

  // Child content entries aggregate
  if (fields.includes('childContentEntriesAggregate')) {
    parts.push(`
      childContentEntriesAggregate(
        where: { role: { _eq: "${ContentRole.COMMENT}" }, isDeleted: { _eq: false } }
      ) {
        aggregate { count }
      }
    `)
  }

  return parts
}

/**
 * Builds ContentEntry fields string (GraphQL body only)
 * Returns: Field list to insert into ContentEntry { ... } or ContentEntryByPk { ... }
 */
export function buildContentEntryFields(options: ContentEntryQueryOptions): string {
  const fields = options.config ? CONFIGS[options.config] : options.fields || CONFIGS.minimal
  const limit = options.relationLimit ?? 10
  const offset = options.relationOffset ?? 0

  const scalarFields = buildScalarFields(fields)
  const relationFields = buildRelationFields(fields, limit, offset)

  return [...scalarFields, ...relationFields].join('\n')
}
