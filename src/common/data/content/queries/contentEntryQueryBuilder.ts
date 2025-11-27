/**
 * Content Entry Query Builder
 * Builds GraphQL field selections for ContentEntry queries
 */

import { type ContentEntry } from '../types/contentEntryTypes'
import { CATALOG_ENTRY_REF } from '@/common/data/catalog/queries/catalogFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { CONTENT_DOCUMENT_FRAGMENT } from '../types/contentDocumentTypes'

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
    'contentGroupRef',
    'contentTypeRef',
    'creatorEmployee',
    'contentGroup',
    'contentType',
    'createdAt',
    'descendantContentEntriesAggregate',
    'contentEntryReactionCounts'
  ],
  full: [
    'id',
    'title',
    'preview',
    'content',
    'picture',
    'contentGroupRef',
    'contentTypeRef',
    'creatorEmployee',
    'contentGroup',
    'contentType',
    'contentEntryCategories',
    'contentEntryTags',
    'contentDocuments',
    'createdAt',
    'updatedAt',
    'descendantContentEntriesAggregate',
    'contentEntryReactionCounts'
  ],
  detail: [
    'id',
    'title',
    'preview',
    'content',
    'picture',
    'contentGroupRef',
    'contentTypeRef',
    'languageRef',
    'creatorEmployee',
    'updaterEmployee',
    'acceptorEmployee',
    'contentGroup',
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
    'allowComment',
    'allowReaction',
    'accepted',
    'displayCreator',
    'displayUpdater',
    'descendantContentEntriesAggregate'
  ]
}

/**
 * Builds ContentEntry fields string (GraphQL body only)
 * Returns: Field list to insert into ContentEntry { ... } or ContentEntryByPk { ... }
 */
export function buildContentEntryFields(options: ContentEntryQueryOptions): string {
  const fields = options.config ? CONFIGS[options.config] : options.fields || CONFIGS.minimal
  const limit = options.relationLimit ?? 10
  const offset = options.relationOffset ?? 0

  const parts: string[] = []

  // Scalar fields
  if (fields.includes('id')) parts.push('id')
  if (fields.includes('version')) parts.push('version')
  if (fields.includes('title')) parts.push('title')
  if (fields.includes('preview')) parts.push('preview')
  if (fields.includes('content')) parts.push('content')
  if (fields.includes('picture')) parts.push('picture')
  if (fields.includes('pictureThumbnail')) parts.push('pictureThumbnail')
  if (fields.includes('contentGroupRef')) parts.push('contentGroupRef')
  if (fields.includes('contentTypeRef')) parts.push('contentTypeRef')
  if (fields.includes('languageRef')) parts.push('languageRef')
  if (fields.includes('creatorEmployeeId')) parts.push('creatorEmployeeId')
  if (fields.includes('updaterEmployeeId')) parts.push('updaterEmployeeId')
  if (fields.includes('acceptorEmployeeId')) parts.push('acceptorEmployeeId')
  if (fields.includes('parentContentEntryId')) parts.push('parentContentEntryId')
  if (fields.includes('rootContentEntryId')) parts.push('rootContentEntryId')
  if (fields.includes('role')) parts.push('role')
  if (fields.includes('allowComment')) parts.push('allowComment')
  if (fields.includes('allowReaction')) parts.push('allowReaction')
  if (fields.includes('accepted')) parts.push('accepted')
  if (fields.includes('displayCreator')) parts.push('displayCreator')
  if (fields.includes('displayUpdater')) parts.push('displayUpdater')
  if (fields.includes('timeToRead')) parts.push('timeToRead')
  if (fields.includes('entryVersion')) parts.push('entryVersion')
  if (fields.includes('createdAt')) parts.push('createdAt')
  if (fields.includes('updatedAt')) parts.push('updatedAt')
  if (fields.includes('createdBy')) parts.push('createdBy')
  if (fields.includes('updatedBy')) parts.push('updatedBy')
  if (fields.includes('activeFrom')) parts.push('activeFrom')
  if (fields.includes('activeTo')) parts.push('activeTo')
  if (fields.includes('isDeleted')) parts.push('isDeleted')
  if (fields.includes('recordState')) parts.push('recordState')

  // Relation fields
  if (fields.includes('contentGroup')) {
    parts.push(`contentGroup { ${CATALOG_ENTRY_REF} }`)
  }

  if (fields.includes('contentType')) {
    parts.push(`contentType { ${CATALOG_ENTRY_REF} }`)
  }

  if (fields.includes('language')) {
    parts.push(`language { ${CATALOG_ENTRY_REF} }`)
  }

  if (fields.includes('creatorEmployee')) {
    parts.push(`creatorEmployee { ${EMPLOYEE_REF} }`)
  }

  if (fields.includes('updaterEmployee')) {
    parts.push(`updaterEmployee { ${EMPLOYEE_REF} }`)
  }

  if (fields.includes('acceptorEmployee')) {
    parts.push(`acceptorEmployee { ${EMPLOYEE_REF} }`)
  }

  if (fields.includes('contentEntryCategories')) {
    parts.push(`
      contentEntryCategories(
        where: { isDeleted: { _eq: false } }
        limit: ${limit}
        offset: ${offset}
      ) {
        id
        contentCategoryRef
        contentCategory {
          ${CATALOG_ENTRY_REF}
        }
      }
    `)
  }

  if (fields.includes('contentEntryTags')) {
    parts.push(`
      contentEntryTags(
        where: { isDeleted: { _eq: false } }
        limit: ${limit}
        offset: ${offset}
      ) {
        id
        contentTagRef
        contentTag {
          ${CATALOG_ENTRY_REF}
        }
      }
    `)
  }

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

  if (fields.includes('contentEntryReactions')) {
    parts.push(`
      contentEntryReactions(
        where: { isDeleted: { _eq: false } }
        limit: ${limit}
        offset: ${offset}
      ) {
        id
        contentReactionRef
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

  if (fields.includes('childContentEntries')) {
    parts.push(`
      childContentEntries(
        where: { isDeleted: { _eq: false } }
        limit: ${limit}
        offset: ${offset}
        orderBy: { createdAt: DESC }
      ) {
        id
        title
        preview
        content
        role
        creatorEmployeeId
        creatorEmployee {
          ${EMPLOYEE_REF}
        }
        createdAt
        updatedAt
      }
    `)
  }

  if (fields.includes('descendantContentEntriesAggregate')) {
    parts.push(`
      descendantContentEntriesAggregate(
        where: { role: { _eq: "COMMENT" }, isDeleted: { _eq: false } }
      ) {
        aggregate { count }
      }
    `)
  }

  if (fields.includes('childContentEntriesAggregate')) {
    parts.push(`
      childContentEntriesAggregate(
        where: { role: { _eq: "COMMENT" }, isDeleted: { _eq: false } }
      ) {
        aggregate { count }
      }
    `)
  }

  if (fields.includes('contentEntryReactionAggregate')) {
    parts.push(`
      contentEntryReactionAggregate(
        where: { isDeleted: { _eq: false } }
      ) {
        aggregate { count }
      }
    `)
  }

  return parts.join('\n')
}
