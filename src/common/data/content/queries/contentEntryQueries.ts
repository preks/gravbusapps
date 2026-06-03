import type { EntityListData } from '@/common/data/common/types/queryTypes'
import type { ContentEntry } from '../types/contentEntryTypes'
import { buildContentEntryFields, type ContentEntryQueryOptions } from './contentEntryQueryBuilder'
import { CONTENT_ENTRY_REACTION_FRAGMENT, CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT } from './fragments/contentFragments'

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

export interface ContentEntriesResponse {
  ContentEntry: ContentEntry[]
  ContentEntryAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface ContentEntryByPkResponse {
  ContentEntryByPk: ContentEntry | null
}

export interface ContentEntriesQueryMeta {
  params: ContentEntryQueryParams
  options?: ContentEntryQueryOptions
  custom?: Record<string, unknown>
  queryKey: readonly [
    'contentEntries',
    'list',
    { params: ContentEntryListQueryKeyParams; options?: ContentEntryQueryOptions }
  ]
  queryKeyString: string
}

export type ContentEntriesData = EntityListData<ContentEntry, ContentEntriesQueryMeta>

export type ContentEntryListQueryKeyParams = Omit<
  ContentEntryQueryParams,
  'categoryIds' | 'contentGroups' | 'tagIds'
> & {
  categoryIds?: string[]
  contentGroups?: string[]
  tagIds?: string[]
}

const sortStringArray = (values?: string[]) => {
  if (!values || values.length === 0) {
    return undefined
  }

  return [...values].sort((leftValue, rightValue) => leftValue.localeCompare(rightValue))
}

export const toContentEntryListQueryKeyParams = (
  params: ContentEntryQueryParams = {}
): ContentEntryListQueryKeyParams => ({
  ...params,
  categoryIds: sortStringArray(params.categoryIds),
  contentGroups: sortStringArray(params.contentGroups),
  tagIds: sortStringArray(params.tagIds)
})

export const toContentEntryQueryKeyOptions = (options?: ContentEntryQueryOptions) => {
  if (!options) {
    return undefined
  }

  return {
    ...options,
    fields: options.fields
      ? [...options.fields].sort((leftField, rightField) => leftField.localeCompare(rightField))
      : undefined
  }
}

export const contentEntryQueryKeys = {
  all: ['contentEntries'] as const,
  list: (params: ContentEntryQueryParams = {}, options?: ContentEntryQueryOptions) =>
    [
      'contentEntries',
      'list',
      { params: toContentEntryListQueryKeyParams(params), options: toContentEntryQueryKeyOptions(options) }
    ] as const,
  detail: (id: string, options?: ContentEntryQueryOptions) =>
    ['contentEntries', 'detail', id, { options: toContentEntryQueryKeyOptions(options) }] as const
}

const buildContentEntryWhereClause = (params: ContentEntryQueryParams): Record<string, any> => {
  const conditions: Record<string, any> = {}

  if (params.role) {
    conditions.role = { _eq: params.role }
  }

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

  if (params.search) {
    const searchPattern = `%${params.search}%`
    conditions._or = [
      { title: { _ilike: searchPattern } },
      { preview: { _ilike: searchPattern } },
      { content: { _ilike: searchPattern } }
    ]
  }

  if (params.categoryIds && params.categoryIds.length > 0) {
    conditions.contentEntryCategories = {
      _or: params.categoryIds.map(id => ({ contentCategoryId: { _eq: id } }))
    }
  }

  if (params.tagIds && params.tagIds.length > 0) {
    conditions.contentEntryTags = {
      _or: params.tagIds.map(id => ({ contentTagId: { _eq: id } }))
    }
  }

  if (params.activeFrom) {
    conditions.activeFrom = { _gte: params.activeFrom }
  }
  if (params.activeTo) {
    conditions.activeTo = { _lte: params.activeTo }
  }

  conditions.isDeleted = { _eq: false }

  return conditions
}

const buildOrderByClause = (params: ContentEntryQueryParams): any[] => {
  const sortBy = params.sortBy || 'createdAt'
  const sortOrder = params.sortOrder || 'DESC'

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

  return [
    {
      [sortBy]: sortOrder
    }
  ]
}

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

export const createContentEntriesQueryMeta = (
  params: ContentEntryQueryParams = {},
  options?: ContentEntryQueryOptions,
  customQueryMeta?: Record<string, unknown>
): ContentEntriesQueryMeta => {
  const queryKey = contentEntryQueryKeys.list(params, options)

  return {
    params: toContentEntryListQueryKeyParams(params),
    options: toContentEntryQueryKeyOptions(options),
    custom: customQueryMeta,
    queryKey,
    queryKeyString: JSON.stringify(queryKey)
  }
}

export const buildContentEntriesRequestQuery = (options?: ContentEntryQueryOptions): string => {
  const fields = buildContentEntryFields(options || { config: 'list' })

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
        ${fields}
      }
      ContentEntryAggregate(where: $where) {
        aggregate {
          count
        }
      }
    }
  `
}

export const mapContentEntriesResponse = (
  response: ContentEntriesResponse,
  params: ContentEntryQueryParams = {},
  options?: ContentEntryQueryOptions,
  customQueryMeta?: Record<string, unknown>
): ContentEntriesData => {
  const entities = response.ContentEntry || []

  return {
    entities,
    totalCount: response.ContentEntryAggregate?.aggregate?.count || entities.length,
    queryMeta: createContentEntriesQueryMeta(params, options, customQueryMeta)
  }
}

export const buildContentEntryByIdQuery = (options?: ContentEntryQueryOptions): string => {
  const queryFields = buildContentEntryFields(options || { config: 'detail' })

  return `
    query getContentEntry($id: uuid!) {
      ContentEntryByPk(id: $id) {
        ${queryFields}
      }
    }
  `
}

export const buildChildContentEntriesVariables = (parentId: string, limit = 50, offset = 0): Record<string, any> => ({
  where: {
    parentContentEntryId: { _eq: parentId },
    isDeleted: { _eq: false }
  },
  limit,
  offset
})

export const buildChildContentEntriesQuery = (): string => {
  return `
    query getChildContentEntries($where: ContentEntryBoolExp!, $limit: Int!, $offset: Int!) {
      ContentEntry(
        where: $where
        orderBy: { createdAt: ASC }
        limit: $limit
        offset: $offset
      ) {
        ${CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT}
        contentEntryReactions {
          ${CONTENT_ENTRY_REACTION_FRAGMENT}
        }
      }
      ContentEntryAggregate(
        where: $where
      ) {
        aggregate {
          count
        }
      }
    }
  `
}
