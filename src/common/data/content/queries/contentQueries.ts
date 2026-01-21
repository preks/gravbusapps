/**
 * Content Query Functions
 * Builds GraphQL queries for content entries and related entities
 */
import { ContentRole } from '../types/contentEnums'
import {
  CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT,
  CONTENT_DOCUMENT_FRAGMENT,
  CONTENT_ENTRY_REACTION_FRAGMENT,
  DESCENDANT_COMMENT_COUNT_FRAGMENT,
  CHILD_ANSWER_COUNT_FRAGMENT
} from './fragments/contentFragments'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

// =====================================================
// QUERY PARAMETER INTERFACES
// =====================================================

export interface ContentEntryQueryParams {
  offset?: number
  limit?: number
  search?: string
  role?: string | null
  contentGroupRef?: string | null
  contentGroupRefs?: string[]
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

/**
 * Build WHERE clause as object for GraphQL variables
 */
const buildContentEntryWhereClause = (params: ContentEntryQueryParams): Record<string, any> => {
  const conditions: Record<string, any> = {}

  // Basic filters
  if (params.role) {
    conditions.role = { _eq: params.role }
  }

  // Support both single and multiple content groups
  if (params.contentGroupRefs && params.contentGroupRefs.length > 0) {
    conditions.contentGroupRef = { _in: params.contentGroupRefs }
  } else if (params.contentGroupRef) {
    conditions.contentGroupRef = { _eq: params.contentGroupRef }
  }

  if (params.contentTypeRef) {
    conditions.contentTypeRef = { _eq: params.contentTypeRef }
  }

  if (params.creatorEmployeeId) {
    conditions.creatorEmployeeId = { _eq: params.creatorEmployeeId }
  }

  if (params.parentContentEntryId !== undefined && params.parentContentEntryId !== null) {
    // Only filter by parent if a specific parent ID is provided
    // If null is passed, we don't filter by parent (returns all entries including nested)
    conditions.parentContentEntryId = { _eq: params.parentContentEntryId }
  }

  // Search across multiple fields
  if (params.search) {
    const searchPattern = `%${params.search}%`
    conditions._or = [
      { title: { _ilike: searchPattern } },
      { preview: { _ilike: searchPattern } },
      { content: { _ilike: searchPattern } }
    ]
  }

  // Category filter (relation)
  if (params.categoryRefs && params.categoryRefs.length > 0) {
    conditions.contentEntryCategories = {
      _or: params.categoryRefs.map(ref => ({ contentCategoryRef: { _eq: ref } }))
    }
  }

  // Tag filter (relation)
  if (params.tagRefs && params.tagRefs.length > 0) {
    conditions.contentEntryTags = {
      _or: params.tagRefs.map(ref => ({ contentTagRef: { _eq: ref } }))
    }
  }

  // Active period filters
  if (params.activeFrom) {
    conditions.activeFrom = { _gte: params.activeFrom }
  }
  if (params.activeTo) {
    conditions.activeTo = { _lte: params.activeTo }
  }

  // Always exclude deleted
  conditions.isDeleted = { _eq: false }

  return conditions
}

/**
 * Build ORDER BY clause as array for GraphQL variables
 * Supports both direct field sorting and aggregate sorting
 */
const buildOrderByClause = (params: ContentEntryQueryParams): any[] => {
  const sortBy = params.sortBy || 'createdAt'
  const sortOrder = params.sortOrder || 'DESC'

  // Handle aggregate sorting (e.g., "contentEntryReactionAggregate.count")
  if (sortBy.includes('.')) {
    const [aggregateName, aggregateField] = sortBy.split('.')
    return [
      {
        [aggregateName]: {
          [aggregateField]: sortOrder
        }
      }
    ]
  }

  // Regular field sorting
  return [
    {
      [sortBy]: sortOrder
    }
  ]
}

/**
 * Query content entries with filters (using GraphQL variables)
 * @param _params - Query parameters (not used directly, variables are built separately)
 * @param useChildCount - If true, uses childContentEntriesAggregate (direct answers for Questions)
 *                        If false, uses descendantContentEntriesAggregate (all nested comments)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const buildContentEntriesQuery = (_params: ContentEntryQueryParams = {}, useChildCount = false): string => {
  const commentCountFragment = useChildCount ? CHILD_ANSWER_COUNT_FRAGMENT : DESCENDANT_COMMENT_COUNT_FRAGMENT
  const localeCode = getCurrentActiveUserLocale()
  const catalogFields = `
  id
  code
  value
  alternativeCode
  description
  additionalValue1
  additionalValue2
  additionalValue3
  ${
    localeCode
      ? `translations(where: { localeCode: { _eq: "${localeCode}" } }) {
    id
    localeCode
    value
    additionalValue1
    additionalValue2
    additionalValue3
    objectValue
  }`
      : `translations {
    id
    localeCode
    value
    additionalValue1
    additionalValue2
    additionalValue3
    objectValue
  }`
  }
  type
  displayOrder
  objectValue
  activeFrom
  activeTo
  catalogId
  parentEntryId
  isDeleted
  recordState
  createdAt
  createdBy
  updatedAt
  updatedBy
`

  return `
    query getContentEntries(
      $where: ContentEntryBoolExp
      $orderBy: [ContentEntryOrderBy!]
      $limit: Int
      $offset: Int
    ) {
      ContentEntry(
        where: $where
        orderBy: $orderBy
        limit: $limit
        offset: $offset
      ) {
        ${CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT}
        contentEntryCategories {
          id
          contentCategoryRef
          contentCategory {
            ${catalogFields}
          }
        }
        contentEntryTags {
          id
          contentTagRef
          contentTag {
            ${catalogFields}
          }
        }
        contentEntryReactionCounts {
          contentReactionRef
          count
          contentReaction {
            ${catalogFields}
          }
        }
        ${commentCountFragment}
      }
      ContentEntryAggregate(where: $where) {
        aggregate {
          count
        }
      }
    }
  `
}

/**
 * Build variables object for content entries query
 */
export const buildContentEntriesVariables = (params: ContentEntryQueryParams = {}): Record<string, any> => {
  const where = buildContentEntryWhereClause(params)
  const orderBy = buildOrderByClause(params)
  const limit = params.limit || 20
  const offset = params.offset || 0

  return {
    where,
    orderBy,
    limit,
    offset
  }
}

/**
 * Query single content entry with full details
 * @param id - Content entry ID
 * @param useChildCount - If true, uses childContentEntriesAggregate (direct answers for Questions)
 *                        If false, uses descendantContentEntriesAggregate (all nested comments)
 */
export const buildContentEntryQuery = (id: string, useChildCount = false): string => {
  const commentCountFragment = useChildCount ? CHILD_ANSWER_COUNT_FRAGMENT : DESCENDANT_COMMENT_COUNT_FRAGMENT
  const localeCode = getCurrentActiveUserLocale()
  const catalogFields = `
  id
  code
  value
  alternativeCode
  description
  additionalValue1
  additionalValue2
  additionalValue3
  ${
    localeCode
      ? `translations(where: { localeCode: { _eq: "${localeCode}" } }) {
    id
    localeCode
    value
    additionalValue1
    additionalValue2
    additionalValue3
    objectValue
  }`
      : `translations {
    id
    localeCode
    value
    additionalValue1
    additionalValue2
    additionalValue3
    objectValue
  }`
  }
  type
  displayOrder
  objectValue
  activeFrom
  activeTo
  catalogId
  parentEntryId
  isDeleted
  recordState
  createdAt
  createdBy
  updatedAt
  updatedBy
`

  return `
    query getContentEntry {
      ContentEntry(
        where: { 
          id: { _eq: "${id}" }
          isDeleted: { _eq: false }
        }
      ) {
        ${CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT}
        contentEntryCategories {
          id
          contentCategoryRef
          contentCategory {
            ${catalogFields}
          }
        }
        contentEntryTags {
          id
          contentTagRef
          contentTag {
            ${catalogFields}
          }
        }
        contentDocuments {
          ${CONTENT_DOCUMENT_FRAGMENT}
        }
        contentEntryReactions {
          ${CONTENT_ENTRY_REACTION_FRAGMENT}
        }
        ${commentCountFragment}
      }
    }
  `
}

/**
 * Query child content entries (comments) for a parent entry
 */
export const buildChildContentEntriesQuery = (parentId: string, limit = 50, offset = 0): string => {
  return `
    query getChildContentEntries {
      ContentEntry(
        where: { 
          parentContentEntryId: { _eq: "${parentId}" }
          isDeleted: { _eq: false }
        }
        orderBy: { createdAt: ASC }
        limit: ${limit}
        offset: ${offset}
      ) {
        ${CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT}
        contentEntryReactions {
          ${CONTENT_ENTRY_REACTION_FRAGMENT}
        }
      }
      ContentEntryAggregate(
        where: { 
          parentContentEntryId: { _eq: "${parentId}" }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

/**
 * Query content documents
 */
export const buildContentDocumentsQuery = (params: ContentDocumentQueryParams): string => {
  const conditions: string[] = []

  if (params.contentEntryId) {
    conditions.push(`contentEntryId: { _eq: "${params.contentEntryId}" }`)
  }

  if (params.parentDocumentId !== undefined) {
    if (params.parentDocumentId === null) {
      // For root level, exclude documents that have a parentDocumentId
      // Since _is_null doesn't work for UUID, we need to filter client-side OR use a different approach
      // For now, don't add a filter - we'll filter all documents and show root ones
    } else {
      conditions.push(`parentDocumentId: { _eq: "${params.parentDocumentId}" }`)
    }
  }

  if (params.folder !== undefined) {
    conditions.push(`folder: { _eq: ${params.folder} }`)
  }

  if (params.search) {
    const searchPattern = params.search.replace(/"/g, '\\"')
    conditions.push(`_or: [
      { name: { _ilike: "%${searchPattern}%" } },
      { description: { _ilike: "%${searchPattern}%" } }
    ]`)
  }

  conditions.push(`isDeleted: { _eq: false }`)

  const whereClause = `where: { ${conditions.join(', ')} }`
  const limit = params.limit || 50
  const offset = params.offset || 0

  return `
    query getContentDocuments {
      ContentDocument(
        ${whereClause}
        orderBy: { createdAt: DESC }
        limit: ${limit}
        offset: ${offset}
      ) {
        ${CONTENT_DOCUMENT_FRAGMENT}
      }
      ContentDocumentAggregate(${whereClause}) {
        aggregate {
          count
        }
      }
    }
  `
}

/**
 * Query content reactions with aggregation
 */
export const buildContentReactionsQuery = (params: ContentReactionQueryParams): string => {
  const conditions: string[] = [`contentEntryId: { _eq: "${params.contentEntryId}" }`, `isDeleted: { _eq: false }`]

  if (params.reaction) {
    conditions.push(`reaction: { _eq: "${params.reaction}" }`)
  }

  const whereClause = `where: { ${conditions.join(', ')} }`

  if (params.groupBy) {
    return `
      query getContentReactionsGrouped {
        ContentEntryReaction(${whereClause}) {
          reaction
          creatorEmployeeId
          creatorEmployee {
            id
            displayName
            picture
          }
        }
      }
    `
  }

  return `
    query getContentReactions {
      ContentEntryReaction(${whereClause} orderBy: { createdAt: DESC }) {
        ${CONTENT_ENTRY_REACTION_FRAGMENT}
      }
      ContentEntryReactionAggregate(${whereClause}) {
        aggregate {
          count
        }
      }
    }
  `
}

/**
 * Query content entry statistics
 */
export const buildContentStatisticsQuery = (): string => {
  return `
    query getContentStatistics {
      totalEntries: ContentEntryAggregate(
        where: { 
          role: { _eq: "${ContentRole.ROOT}" }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      totalComments: ContentEntryAggregate(
        where: { 
          role: { _eq: "${ContentRole.COMMENT}" }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      totalReactions: ContentEntryReactionAggregate(
        where: { isDeleted: { _eq: false } }
      ) {
        aggregate {
          count
        }
      }
      totalDocuments: ContentDocumentAggregate(
        where: { isDeleted: { _eq: false } }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}
