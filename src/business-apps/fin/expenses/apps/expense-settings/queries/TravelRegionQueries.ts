import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface TravelRegionQueryVariables {
  parentEntryId: string
  limit: number
  offset: number
  search?: string
}

export interface TravelRegion {
  id: string
  code: string
  value: string
  objectValue?: {
    destination_country_ref?: string
  }
}

export interface TravelRegionCountResponse {
  CatalogEntry: Array<{
    id: string
    childEntriesAggregate: {
      aggregate: {
        count: number
      }
    }
  }>
}

export interface TravelRegionListResponse {
  CatalogEntry: TravelRegion[]
}

/**
 * GraphQL query to get total count of travel regions
 */
export const GET_TRAVEL_REGION_COUNT = `
  query GetTravelRegionSetCount($parentEntryId: String!) {
    CatalogEntry(
      where: {
        id: { _eq: $parentEntryId }
        catalog: {
          identifier: { _eq: "TravelRegionSet" }
          version: { _eq: "v1" }
        }
        isDeleted: { _eq: false }
      }
    ) {
      id
      childEntriesAggregate(
        where: { 
          isDeleted: { _eq: false },
          catalog: { 
            identifier: { _eq: "TravelRegion" }, 
            version: { _eq: "v1" } 
          }
        }
      ) {
        aggregate {
          count
        }
      }
    }
  }
`

/**
 * GraphQL query to get travel regions with search
 */
export const GET_TRAVEL_REGIONS_WITH_SEARCH = `
  query GetTravelRegionsByParent($parentEntryId: String!, $limit: Int!, $offset: Int!, $search: String!) {
    CatalogEntry(
      where: {
        catalog: {
          identifier: { _eq: "TravelRegion" }
          version: { _eq: "v1" }
        }
        parentEntryId: { _eq: $parentEntryId }
        isDeleted: { _eq: false }
        _or: [
          { value: { _ilike: $search } }
          { code: { _ilike: $search } }
        ]
      }
      orderBy: { value: ASC }
      limit: $limit
      offset: $offset
    ) {
      id
      code
      value
      objectValue
    }
  }
`

/**
 * GraphQL query to get travel regions without search
 */
export const GET_TRAVEL_REGIONS = `
  query GetTravelRegionsByParent($parentEntryId: String!, $limit: Int!, $offset: Int!) {
    CatalogEntry(
      where: {
        catalog: {
          identifier: { _eq: "TravelRegion" }
          version: { _eq: "v1" }
        }
        parentEntryId: { _eq: $parentEntryId }
        isDeleted: { _eq: false }
      }
      orderBy: { value: ASC }
      limit: $limit
      offset: $offset
    ) {
      id
      code
      value
      objectValue
    }
  }
`

/**
 * Hook to fetch travel regions with pagination and search
 */
export const useGetTravelRegions = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchTravelRegionCount = useCallback(
    async (parentEntryId: string) => {
      try {
        const result = await graphqlClient.request<TravelRegionCountResponse>(GET_TRAVEL_REGION_COUNT, {
          parentEntryId
        })
        return result.CatalogEntry[0]?.childEntriesAggregate?.aggregate?.count || 0
      } catch (error) {
        console.error('Error fetching travel region count:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchTravelRegions = useCallback(
    async (variables: TravelRegionQueryVariables) => {
      try {
        // Use search query only if search term is provided and not empty
        const hasSearch = variables.search && variables.search.trim().length > 0
        const query = hasSearch ? GET_TRAVEL_REGIONS_WITH_SEARCH : GET_TRAVEL_REGIONS
        const queryVariables = hasSearch
          ? { ...variables, search: `%${variables.search}%` }
          : { parentEntryId: variables.parentEntryId, limit: variables.limit, offset: variables.offset }

        const result = await graphqlClient.request<TravelRegionListResponse>(query, queryVariables)

        return result.CatalogEntry.map(item => ({
          id: item.id,
          code: item.code,
          value: item.value,
          objectValue: item.objectValue
        }))
      } catch (error) {
        console.error('Error fetching travel regions:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return {
    fetchTravelRegionCount,
    fetchTravelRegions
  }
}
