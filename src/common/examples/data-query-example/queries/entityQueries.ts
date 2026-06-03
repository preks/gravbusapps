import type { ExampleEntity, ExampleEntitiesData, ExampleEntityListParams } from '../types/entityTypes'

export const entityQueryKeys = {
  all: ['entities'] as const,
  list: (params: ExampleEntityListParams = {}) => ['entities', 'list', { params }] as const,
  detail: (id: string) => ['entities', 'detail', id] as const
}

export interface ExampleEntitiesResponse {
  ContentEntry: ExampleEntity[]
  ContentEntryAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface ExampleEntityResponse {
  ContentEntryByPk: ExampleEntity | null
}

export const buildEntitiesVariables = (params: ExampleEntityListParams = {}): Record<string, any> => {
  const where: Record<string, any> = {
    role: { _eq: 'ROOT' },
    isDeleted: { _eq: false }
  }

  if (params.search) {
    const searchPattern = `%${params.search}%`
    where._or = [{ title: { _ilike: searchPattern } }, { preview: { _ilike: searchPattern } }]
  }

  if (params.status && params.status !== 'all') {
    where.recordState = { _ilike: `%${params.status}%` }
  }

  return {
    where,
    limit: 20,
    offset: 0
  }
}

export const buildEntitiesQuery = (): string => `
  query getExampleEntities($where: ContentEntryBoolExp!, $limit: Int!, $offset: Int!) {
    ContentEntry(
      where: $where
      orderBy: { updatedAt: DESC }
      limit: $limit
      offset: $offset
    ) {
      id
      name: title
      summary: preview
      status: recordState
      category: contentGroup
      updatedAt
    }
    ContentEntryAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

export const buildEntityQuery = (): string => `
  query getExampleEntity($id: uuid!) {
    ContentEntryByPk(id: $id) {
      id
      name: title
      summary: preview
      status: recordState
      category: contentGroup
      updatedAt
    }
  }
`

export const mapEntitiesResponse = (
  response: ExampleEntitiesResponse,
  params: ExampleEntityListParams = {}
): ExampleEntitiesData => {
  const entities = response.ContentEntry || []

  return {
    entities,
    totalCount: response.ContentEntryAggregate?.aggregate?.count || entities.length,
    queryMeta: {
      params,
      queryKeyString: JSON.stringify(entityQueryKeys.list(params))
    }
  }
}

export const mapEntityResponse = (response: ExampleEntityResponse): ExampleEntity | null =>
  response.ContentEntryByPk ?? null
