import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { TeamSalesActivity } from './useTeamActivitiesData'
import {
  buildCustomerActivityOrderBy,
  buildCustomerActivityQuery
} from '@/common/data/customer/queries/customerActivityQueries'

interface UseCalendarActivitiesDataProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  employeeIds: string[]
  dateFrom: string // YYYY-MM-DD format
  dateTo: string // YYYY-MM-DD format
  unlinkedOnly?: boolean
}

interface UseCalendarActivitiesDataResult {
  activities: TeamSalesActivity[]
  loading: boolean
  error: string | null
  loadActivities: () => Promise<void>
  retry: () => void
}

/**
 * Hook specifically for calendar view - fetches ALL activities within a date range
 * without enforcing query limits. Safe because date range is typically one month.
 */
export const useCalendarActivitiesData = ({
  employeeIds,
  dateFrom,
  dateTo,
  accessToken,
  userInfo,
  unlinkedOnly = false
}: UseCalendarActivitiesDataProps): UseCalendarActivitiesDataResult => {
  const [activities, setActivities] = useState<TeamSalesActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const loadActivities = useCallback(async () => {
    if (!accessToken || employeeIds.length === 0) {
      setActivities([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Build where conditions for calendar activities
      const baseWhere: any = {
        _and: [
          {
            _or: [
              // Activities owned by specified employees
              { ownerEmployeeId: { _in: employeeIds } },
              // Unassigned activities created by user (if userInfo available and user is in team)
              ...(userInfo && employeeIds.includes(userInfo.id)
                ? [
                    {
                      _and: [{ ownerEmployeeId: { _eq: null } }, { createdBy: { _eq: userInfo.id } }]
                    }
                  ]
                : [])
            ]
          },
          { isDeleted: { _eq: false } },
          // Date range filter - use occurredAt for calendar display
          { occurredAt: { _gte: dateFrom } },
          { occurredAt: { _lte: dateTo } }
        ]
      }

      if (unlinkedOnly) {
        baseWhere._and.push(
          { accountId: { _isNull: true } },
          { contactId: { _isNull: true } },
          { leadId: { _isNull: true } },
          { opportunityId: { _isNull: true } }
        )
      }

      // Order by occurredAt descending
      const orderBy = buildCustomerActivityOrderBy([{ field: 'occurredAt', direction: 'DESC_NULLS_LAST' }])
      const query = buildCustomerActivityQuery()

      const result = await graphqlClient.request<{
        SalesActivity: TeamSalesActivity[]
      }>(query, {
        where: baseWhere,
        orderBy
      })

      setActivities(result.SalesActivity || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load calendar activities'
      console.error('Error loading calendar activities:', err)
      setError(errorMessage)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, employeeIds, dateFrom, dateTo, userInfo, unlinkedOnly, graphqlClient])

  const retry = useCallback(() => {
    loadActivities()
  }, [loadActivities])

  // Auto-load activities when dependencies change
  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  return {
    activities,
    loading,
    error,
    loadActivities,
    retry
  }
}
