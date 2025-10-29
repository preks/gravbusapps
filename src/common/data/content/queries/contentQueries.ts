/**
 * Content Query Functions
 * Builds GraphQL queries for content entries and related entities
 */
import type {
  ContentEntryQueryParams,
  ContentDocumentQueryParams,
  ContentReactionQueryParams
} from '../types/contentTypes'
import {
  CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT,
  CONTENT_ENTRY_FULL_FRAGMENT,
  CONTENT_DOCUMENT_FRAGMENT,
  CONTENT_ENTRY_REACTION_FRAGMENT,
  CATALOG_ENTRY_FRAGMENT
} from './fragments/contentFragments'

/**
 * Build WHERE clause for content entry queries
 */
const buildContentEntryWhereClause = (params: ContentEntryQueryParams): string => {
  const conditions: string[] = []

  // Basic filters
  if (params.role) {
    conditions.push(`role: { _eq: "${params.role}" }`)
  }

  if (params.contentGroupRef) {
    conditions.push(`contentGroupRef: { _eq: "${params.contentGroupRef}" }`)
  }

  if (params.contentTypeRef) {
    conditions.push(`contentTypeRef: { _eq: "${params.contentTypeRef}" }`)
  }

  if (params.creatorEmployeeId) {
    conditions.push(`creatorEmployeeId: { _eq: "${params.creatorEmployeeId}" }`)
  }

  if (params.parentContentEntryId !== undefined && params.parentContentEntryId !== null) {
    // Only filter by parent if a specific parent ID is provided
    // If null is passed, we don't filter by parent (returns all entries including nested)
    conditions.push(`parentContentEntryId: { _eq: "${params.parentContentEntryId}" }`)
  }

  // Search across multiple fields
  if (params.search) {
    const searchPattern = params.search.replace(/"/g, '\\"')
    const searchConditions = [
      `{ title: { _ilike: "%${searchPattern}%" } }`,
      `{ preview: { _ilike: "%${searchPattern}%" } }`,
      `{ content: { _ilike: "%${searchPattern}%" } }`
    ]
    conditions.push(`_or: [${searchConditions.join(', ')}]`)
  }

  // Category filter (relation) - FIXED: use singular form
  if (params.categoryRefs && params.categoryRefs.length > 0) {
    const categoryConditions = params.categoryRefs.map(ref => `{ contentCategoryRef: { _eq: "${ref}" } }`)
    conditions.push(`contentEntryCategory: { _or: [${categoryConditions.join(', ')}] }`)
  }

  // Tag filter (relation) - FIXED: use singular form
  if (params.tagRefs && params.tagRefs.length > 0) {
    const tagConditions = params.tagRefs.map(ref => `{ contentTagRef: { _eq: "${ref}" } }`)
    conditions.push(`contentEntryTag: { _or: [${tagConditions.join(', ')}] }`)
  }

  // Active period filters
  if (params.activeFrom) {
    conditions.push(`activeFrom: { _gte: "${params.activeFrom}" }`)
  }
  if (params.activeTo) {
    conditions.push(`activeTo: { _lte: "${params.activeTo}" }`)
  }

  // Always exclude deleted
  conditions.push(`isDeleted: { _eq: false }`)

  return conditions.length > 0 ? `where: { ${conditions.join(', ')} }` : ''
}

/**
 * Build ORDER BY clause
 */
const buildOrderByClause = (params: ContentEntryQueryParams): string => {
  const sortBy = params.sortBy || 'createdAt'
  const sortOrder = params.sortOrder || 'DESC'
  return `orderBy: { ${sortBy}: ${sortOrder} }`
}

/**
 * Query content entries with filters
 * NOTE: includeChildren is not used here - use separate query for children/comments
 */
export const buildContentEntriesQuery = (params: ContentEntryQueryParams = {}): string => {
  const limit = params.limit || 20
  const offset = params.offset || 0
  const whereClause = buildContentEntryWhereClause(params)
  const orderByClause = buildOrderByClause(params)

  return `
    query getContentEntries {
      ContentEntry(
        ${whereClause}
        ${orderByClause}
        limit: ${limit}
        offset: ${offset}
      ) {
        ${CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT}
        contentEntryCategory {
          id
          contentCategoryRef
          contentCategory {
            ${CATALOG_ENTRY_FRAGMENT}
          }
        }
        contentEntryTag {
          id
          contentTagRef
          contentTag {
            ${CATALOG_ENTRY_FRAGMENT}
          }
        }
        contentEntryReaction {
          ${CONTENT_ENTRY_REACTION_FRAGMENT}
        }
        descendantContentEntryAggregate(
          where: {
            role: { _eq: "COMMENT" }
            isDeleted: { _eq: false }
          }
        ) {
          aggregate {
            count
          }
        }
      }
      ContentEntryAggregate(${whereClause}) {
        aggregate {
          count
        }
      }
    }
  `
}

/**
 * Query single content entry with full details
 * NOTE: To load comments/children, make a separate query with parentContentEntryId filter
 */
export const buildContentEntryQuery = (id: string): string => {
  return `
    query getContentEntry {
      ContentEntry(
        where: { 
          id: { _eq: "${id}" }
          isDeleted: { _eq: false }
        }
      ) {
        ${CONTENT_ENTRY_FULL_FRAGMENT}
        descendantContentEntryAggregate(
          where: {
            role: { _eq: "COMMENT" }
            isDeleted: { _eq: false }
          }
        ) {
          aggregate {
            count
          }
        }
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
        contentEntryReaction {
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
      conditions.push(`parentDocumentId: { _is_null: true }`)
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
            pictureThumbnail
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
          role: { _eq: "ROOT" }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      totalComments: ContentEntryAggregate(
        where: { 
          role: { _eq: "COMMENT" }
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
