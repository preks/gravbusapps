/**
 * Content Query Functions
 * Builds GraphQL queries for content entries and related entities
 */
import { ContentRole } from '../constants/contentConstants'
import {
  CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT,
  CONTENT_DOCUMENT_FRAGMENT,
  CONTENT_ENTRY_REACTION_FRAGMENT,
  DESCENDANT_COMMENT_COUNT_FRAGMENT,
  CHILD_ANSWER_COUNT_FRAGMENT
} from './fragments/contentFragments'

// =====================================================
// QUERY PARAMETER INTERFACES
// =====================================================

export interface ContentEntryQueryParams {
  offset?: number
  limit?: number
  search?: string
  role?: string | null
  contentGroup?: string | null
  contentGroups?: string[]
  contentTypeId?: string | null
  categoryIds?: string[]
  tagIds?: string[]
  creatorEmployeeId?: string | null
  createdBy?: string | null
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
  if (params.contentGroups && params.contentGroups.length > 0) {
    conditions.contentGroup = { _in: params.contentGroups }
  } else if (params.contentGroup) {
    conditions.contentGroup = { _eq: params.contentGroup }
  }

  if (params.contentTypeId) {
    conditions.contentTypeId = { _eq: params.contentTypeId }
  }

  if (params.creatorEmployeeId) {
    conditions.creatorEmployeeId = { _eq: params.creatorEmployeeId }
  }

  if (params.createdBy) {
    conditions.createdBy = { _eq: params.createdBy }
  }

  if (params.parentContentEntryId !== undefined && params.parentContentEntryId !== null) {
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

  // Category filter (relation, by UUID)
  if (params.categoryIds && params.categoryIds.length > 0) {
    conditions.contentEntryCategories = {
      _or: params.categoryIds.map(id => ({ contentCategoryId: { _eq: id } }))
    }
  }

  // Tag filter (relation, by UUID)
  if (params.tagIds && params.tagIds.length > 0) {
    conditions.contentEntryTags = {
      _or: params.tagIds.map(id => ({ contentTagId: { _eq: id } }))
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
          contentCategoryId
          contentCategory {
            id
            name
            nameI18n
          }
        }
        contentEntryTags {
          id
          contentTagId
          contentTag {
            id
            name
            nameI18n
          }
        }
        contentEntryReactionCounts {
          contentReactionRef
          count
          contentReaction {
            id
            code
            value
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
          contentCategoryId
          contentCategory {
            id
            name
            nameI18n
          }
        }
        contentEntryTags {
          id
          contentTagId
          contentTag {
            id
            name
            nameI18n
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
    if (params.parentDocumentId !== null) {
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

// =====================================================
// CONTENT TYPE / CATEGORY / TAG QUERIES
// =====================================================

export const CONTENT_TYPE_FIELDS = `
  id
  name
  nameI18n
  contentGroup
`

export const CONTENT_CATEGORY_FIELDS = `
  id
  name
  nameI18n
`

export const CONTENT_TAG_FIELDS = `
  id
  name
  nameI18n
`

export const buildContentTypesQuery = (contentGroup?: string | null): string => {
  const where = contentGroup
    ? `where: { contentGroup: { _eq: "${contentGroup}" }, isDeleted: { _eq: false } }`
    : `where: { isDeleted: { _eq: false } }`

  return `
    query getContentTypes {
      ContentType(${where} orderBy: { name: ASC }) {
        ${CONTENT_TYPE_FIELDS}
      }
    }
  `
}

export const buildContentCategoriesQuery = (): string => {
  return `
    query getContentCategories {
      ContentCategory(where: { isDeleted: { _eq: false } } orderBy: { name: ASC }) {
        ${CONTENT_CATEGORY_FIELDS}
      }
    }
  `
}

export const buildContentTagsQuery = (): string => {
  return `
    query getContentTags {
      ContentTag(where: { isDeleted: { _eq: false } } orderBy: { name: ASC }) {
        ${CONTENT_TAG_FIELDS}
      }
    }
  `
}

export const buildContentTypesPaginatedQuery = (): string => `
  query getContentTypesPaginated($where: ContentTypeBoolExp!, $limit: Int!, $offset: Int!) {
    ContentType(where: $where, limit: $limit, offset: $offset, orderBy: { name: ASC }) {
      ${CONTENT_TYPE_FIELDS}
    }
    ContentTypeAggregate(where: $where) {
      aggregate { count }
    }
  }
`

export const buildContentCategoriesPaginatedQuery = (): string => `
  query getContentCategoriesPaginated($where: ContentCategoryBoolExp!, $limit: Int!, $offset: Int!) {
    ContentCategory(where: $where, limit: $limit, offset: $offset, orderBy: { name: ASC }) {
      ${CONTENT_CATEGORY_FIELDS}
    }
    ContentCategoryAggregate(where: $where) {
      aggregate { count }
    }
  }
`

export const buildContentTagsPaginatedQuery = (): string => `
  query getContentTagsPaginated($where: ContentTagBoolExp!, $limit: Int!, $offset: Int!) {
    ContentTag(where: $where, limit: $limit, offset: $offset, orderBy: { name: ASC }) {
      ${CONTENT_TAG_FIELDS}
    }
    ContentTagAggregate(where: $where) {
      aggregate { count }
    }
  }
`

export const buildInsertContentTypeMutation = (): string => {
  return `
    mutation insertContentType($name: String!, $contentGroup: String) {
      InsertContentTypeOne(object: { name: $name, contentGroup: $contentGroup }) {
        id
        name
        contentGroup
      }
    }
  `
}

export const buildUpdateContentTypeMutation = (): string => {
  return `
    mutation updateContentType($id: UUID!, $name: String!, $contentGroup: String) {
      UpdateContentTypeByPk(pkColumns: { id: $id }, _set: { name: $name, contentGroup: $contentGroup }) {
        id
        name
        contentGroup
      }
    }
  `
}

export const buildDeleteContentTypeMutation = (): string => {
  return `
    mutation deleteContentType($id: UUID!) {
      DeleteContentTypeByPk(id: $id) {
        id
      }
    }
  `
}

export const buildInsertContentCategoryMutation = (): string => {
  return `
    mutation insertContentCategory($name: String!) {
      InsertContentCategoryOne(object: { name: $name }) {
        id
        name
      }
    }
  `
}

export const buildUpdateContentCategoryMutation = (): string => {
  return `
    mutation updateContentCategory($id: UUID!, $name: String!) {
      UpdateContentCategoryByPk(pkColumns: { id: $id }, _set: { name: $name }) {
        id
        name
      }
    }
  `
}

export const buildDeleteContentCategoryMutation = (): string => {
  return `
    mutation deleteContentCategory($id: UUID!) {
      DeleteContentCategoryByPk(id: $id) {
        id
      }
    }
  `
}

export const buildInsertContentTagMutation = (): string => {
  return `
    mutation insertContentTag($name: String!) {
      InsertContentTagOne(object: { name: $name }) {
        id
        name
      }
    }
  `
}

export const buildUpdateContentTagMutation = (): string => {
  return `
    mutation updateContentTag($id: UUID!, $name: String!) {
      UpdateContentTagByPk(pkColumns: { id: $id }, _set: { name: $name }) {
        id
        name
      }
    }
  `
}

export const buildDeleteContentTagMutation = (): string => {
  return `
    mutation deleteContentTag($id: UUID!) {
      DeleteContentTagByPk(id: $id) {
        id
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
