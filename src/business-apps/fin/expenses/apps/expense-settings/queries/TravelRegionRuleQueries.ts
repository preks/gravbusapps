import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCallback } from 'react'

export interface TravelRegionRuleQueryVariables {
  offset?: number
  limit?: number
  search?: string
  orderBy?: any[]
}

export interface AllowanceRegionRuleDetail {
  id: string
  amount: number
  country?: {
    id: string
    value: string
    code: string
  }
  currency?: {
    id: string
    value: string
    code: string
  }
  travelRegion?: {
    id: string
    value: string
    code: string
  }
  countryRef?: string
  currencyRef?: string
  travelRegionRef?: string
  activeFrom?: string
  activeTo?: string
  home?: boolean
  version?: number
  isDeleted: boolean
}

export interface TravelRegionRuleData {
  id: string
  code: string
  name: string
  activeFrom?: string
  activeTo?: string
  version?: number
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  allowanceRegionRuleDetail: AllowanceRegionRuleDetail[]
}

export interface TravelRegionRuleResponse {
  AllowanceRegionRule: TravelRegionRuleData[]
  AllowanceRegionRuleAggregate: {
    aggregate: {
      count: number
    }
  }
}

export const GET_TRAVEL_REGION_RULES = (): string => {
  return `
    query GetTravelRegionRules(
      $offset: Int!
      $limit: Int!
      $search: String
      $orderBy: [AllowanceRegionRule_order_by!]
    ) {
      AllowanceRegionRule(
        where: { 
          isDeleted: { _eq: false }
          _or: [
            { name: { _ilike: $search } }
            { code: { _ilike: $search } }
          ]
        }
        orderBy: $orderBy
        limit: $limit
        offset: $offset
      ) {
        id
        code
        name
        activeFrom
        activeTo
        version
        isDeleted
        createdAt
        updatedAt
        allowanceRegionRuleDetail(
          where: { isDeleted: { _eq: false } }
        ) {
          id
          amount
          countryRef
          currencyRef
          travelRegionRef
          home
          country {
            id
            value
            code
          }
          currency {
            id
            value
            code
          }
          travelRegion {
            id
            value
            code
          }
          activeFrom
          activeTo
          version
          isDeleted
        }
      }
      AllowanceRegionRuleAggregate(
        where: { 
          isDeleted: { _eq: false }
          _or: [
            { name: { _ilike: $search } }
            { code: { _ilike: $search } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

export const useGetTravelRegionRulesData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchTravelRegionRules = useCallback(
    async (variables: TravelRegionRuleQueryVariables = {}) => {
      const query = GET_TRAVEL_REGION_RULES()
      const { offset = 0, limit = 20, search, orderBy = [] } = variables

      // Prepare search pattern with wildcards (only if search is provided)
      const searchPattern = search?.trim() ? `%${search.trim()}%` : null

      // Prepare orderBy with default if empty
      const orderByClause = orderBy.length > 0 ? orderBy : [{ name: 'ASC' }]

      try {
        const result = await graphqlClient.request<TravelRegionRuleResponse>(query, {
          offset,
          limit,
          search: searchPattern,
          orderBy: orderByClause
        })
        return result
      } catch (error) {
        console.error('Error fetching travel region rules:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchTravelRegionRules }
}
