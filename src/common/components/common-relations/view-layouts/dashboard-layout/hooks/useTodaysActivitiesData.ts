import { useCallback } from 'react'
import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { useBaseGraphQLDataFetch } from './useBaseGraphQLDataFetch'

export interface TodaysActivitiesConfig {
  activityTable: string
  activityAggregateTable: string
  activityTypeField: string
  activityTypeRefField: string
  leadField: string
  opportunityField: string
  leadNameFields: string
}

export interface TodaysActivityItem {
  id: string
  title: string
  description: string
  version: string
  createdAt: string
  completedAt: string | null
  activeFrom: string | null
  activeTo: string | null
  activityTypeRef: string | null
  activityType: {
    id: string
    value: string
    code: string
  } | null
  ownerEmployee: {
    id: string
    firstName: string
    lastName: string
    fullName?: string
    displayName?: string
  } | null
  ownerEmployeeId: string | null
  lead: {
    id: string
    name?: string | null
    firstName?: string | null
    lastName?: string | null
  } | null
  opportunity: {
    id: string
    name: string
  } | null
  account: {
    id: string
    name: string
  } | null
  contact: {
    id: string
    firstName: string
    lastName: string
  } | null
}

export interface UseTodaysActivitiesDataProps {
  accessToken: string
  enabled: boolean
  config: TodaysActivitiesConfig
  limit: number
  offset: number
  currentEmployeeId?: string // Optional: filter activities owned by specific employee
}

export interface UseTodaysActivitiesDataReturn {
  activities: TodaysActivityItem[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: (limit?: number, offset?: number) => void
}

/**
 * Shared hook for fetching today's activities
 * Supports both CRM (SalesActivity) and IRM (InvestmentActivity) modules
 *
 * Features:
 * - Pagination support (limit/offset)
 * - Total count for pagination
 * - Module-specific table and field selection
 * - Shows ALL activities (no employee filter)
 * - Handles different lead field structures (CRM: name, IRM: firstName/lastName)
 *
 * @example CRM
 * const { activities, totalCount, isLoading, error, refetch } = useTodaysActivitiesData({
 *   accessToken: context.accessToken,
 *   enabled: true,
 *   module: 'crm',
 *   limit: 20,
 *   offset: 0
 * })
 *
 * @example IRM
 * const { activities, totalCount, isLoading, error, refetch } = useTodaysActivitiesData({
 *   accessToken: context.accessToken,
 *   enabled: true,
 *   module: 'irm',
 *   limit: 20,
 *   offset: 0
 * })
 */
export const useTodaysActivitiesData = ({
  accessToken,
  enabled,
  config,
  limit,
  offset,
  currentEmployeeId
}: UseTodaysActivitiesDataProps): UseTodaysActivitiesDataReturn => {
  const fetchActivities = useCallback(
    async ({
      graphqlClient,
      limit: fetchLimit,
      offset: fetchOffset
    }: {
      graphqlClient: GraphQLClient
      limit: number
      offset: number
    }) => {
      // Calculate today's date range
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()

      // Build GraphQL query dynamically
      const query = `
        query GetTodaysActivities($startDate: timestamptz!, $endDate: timestamptz!, $limit: Int, $offset: Int${currentEmployeeId ? ', $currentEmployeeId: uuid' : ''}) {
          activities: ${config.activityTable}(
            where: {
              isDeleted: { _eq: false }
              createdAt: { _gte: $startDate, _lte: $endDate }
              ${currentEmployeeId ? 'ownerEmployeeId: { _eq: $currentEmployeeId }' : ''}
            }
            limit: $limit
            offset: $offset
            orderBy: { createdAt: DESC }
          ) {
            id
            title
            description
            version
            createdAt
            completedAt
            activeFrom
            activeTo
            ${config.activityTypeRefField}
            ${config.activityTypeField} {
              id
              value
              code
            }
            ownerEmployee {
              id
              firstName
              lastName
              fullName
              displayName
            }
            ownerEmployeeId
            ${config.leadField} {
              id
              ${config.leadNameFields}
            }
            ${config.opportunityField} {
              id
              name
            }
            account {
              id
              name
            }
            contact {
              id
              firstName
              lastName
            }
          }
          activitiesAggregate: ${config.activityAggregateTable}(
            where: {
              isDeleted: { _eq: false }
              createdAt: { _gte: $startDate, _lte: $endDate }
              ${currentEmployeeId ? 'ownerEmployeeId: { _eq: $currentEmployeeId }' : ''}
            }
          ) {
            aggregate {
              count
            }
          }
        }
      `

      const variables: any = {
        startDate: startOfDay,
        endDate: endOfDay,
        limit: fetchLimit,
        offset: fetchOffset
      }

      if (currentEmployeeId) {
        variables.currentEmployeeId = currentEmployeeId
      }

      const result = await graphqlClient.request<{
        activities: TodaysActivityItem[]
        activitiesAggregate: { aggregate: { count: number } }
      }>(query, variables)

      const fetchedActivities = result.activities || []
      const totalCount = result.activitiesAggregate?.aggregate?.count || 0

      return {
        data: fetchedActivities,
        totalCount
      }
    },
    [config, currentEmployeeId]
  )

  const { data, totalCount, isLoading, error, refetch } = useBaseGraphQLDataFetch<TodaysActivityItem>({
    accessToken,
    enabled,
    limit,
    offset,
    fetchFn: fetchActivities
  })

  return {
    activities: data,
    totalCount,
    isLoading,
    error,
    refetch
  }
}
