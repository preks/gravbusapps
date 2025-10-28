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
  CONTENT_ENTRY_CORE_FRAGMENT,
  CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT,
  CONTENT_ENTRY_FULL_FRAGMENT,
  CONTENT_DOCUMENT_FRAGMENT,
  CONTENT_ENTRY_REACTION_FRAGMENT
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

  if (params.parentContentEntryId !== undefined) {
    if (params.parentContentEntryId === null) {
      conditions.push(`parentContentEntryId: { _is_null: true }`)
    } else {
      conditions.push(`parentContentEntryId: { _eq: "${params.parentContentEntryId}" }`)
    }
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

  // Category filter (relation)
  if (params.categoryRefs && params.categoryRefs.length > 0) {
    const categoryConditions = params.categoryRefs.map(ref => `{ contentCategoryRef: { _eq: "${ref}" } }`)
    conditions.push(`categories: { _or: [${categoryConditions.join(', ')}] }`)
  }

  // Tag filter (relation)
  if (params.tagRefs && params.tagRefs.length > 0) {
    const tagConditions = params.tagRefs.map(ref => `{ contentTagRef: { _eq: "${ref}" } }`)
    conditions.push(`tags: { _or: [${tagConditions.join(', ')}] }`)
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
        contentEntryCategories {
          id
          contentCategoryRef
          contentCategory {
            id
            key
            value
          }
        }
        contentEntryTags {
          id
          contentTagRef
          contentTag {
            id
            key
            value
          }
        }
        ${
          params.includeChildren
            ? `
          childContentEntries {
            ${CONTENT_ENTRY_CORE_FRAGMENT}
            creatorEmployee {
              id
              displayName
              picture
            }
            contentEntryReactions {
              id
              reaction
              creatorEmployeeId
            }
          }
        `
            : ''
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
 */
export const buildContentEntryQuery = (id: string, includeChildren = true): string => {
  return `
    query getContentEntry {
      ContentEntry(
        where: { 
          id: { _eq: "${id}" }
          isDeleted: { _eq: false }
        }
      ) {
        ${CONTENT_ENTRY_FULL_FRAGMENT}
        ${
          includeChildren
            ? `
          childContentEntries(
            where: { isDeleted: { _eq: false } }
            orderBy: { createdAt: ASC }
          ) {
            ${CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT}
            contentEntryReactions {
              ${CONTENT_ENTRY_REACTION_FRAGMENT}
            }
            childContentEntries(
              where: { isDeleted: { _eq: false } }
              orderBy: { createdAt: ASC }
            ) {
              ${CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT}
              contentEntryReactions {
                ${CONTENT_ENTRY_REACTION_FRAGMENT}
              }
              childContentEntries(
                where: { isDeleted: { _eq: false } }
                orderBy: { createdAt: ASC }
              ) {
                ${CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT}
                contentEntryReactions {
                  ${CONTENT_ENTRY_REACTION_FRAGMENT}
                }
              }
            }
          }
        `
            : ''
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
