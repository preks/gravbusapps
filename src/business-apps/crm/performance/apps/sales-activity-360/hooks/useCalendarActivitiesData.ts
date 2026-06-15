import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { TeamSalesActivity } from './useTeamActivitiesData'
import {
  buildCustomerActivityOrderBy,
  buildCustomerActivityQuery
} from '@/common/data/customer/queries/customerActivityQueries'

// Sales Associate capability name. Used to scope activities to the sales team via a
// nested relationship filter, so we never need to pre-fetch the full employee list.
const SALES_ASSOCIATE_CAPABILITY = 'Sales Associate'

interface UseCalendarActivitiesDataProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  employeeIds: string[]
  // When true and no explicit employeeIds are given, scope activities to all Sales
  // Associate owners via a nested where clause instead of an `ownerEmployeeId _in [...]` list.
  scopeToSalesAssociates?: boolean
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
  scopeToSalesAssociates = false,
  dateFrom,
  dateTo,
  accessToken,
  unlinkedOnly = false
}: UseCalendarActivitiesDataProps): UseCalendarActivitiesDataResult => {
  const [activities, setActivities] = useState<TeamSalesActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const loadActivities = useCallback(async () => {
    if (!accessToken || (employeeIds.length === 0 && !scopeToSalesAssociates)) {
      setActivities([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Owner scope:
      // - With explicit employeeIds (e.g. "By Employee"): filter by ownerEmployeeId _in [...].
      // - Otherwise: scope to the sales team via the owner's "Sales Associate" capability,
      //   so the server returns only sales-team activities without a separate employee fetch.
      const ownerCondition =
        employeeIds.length > 0
          ? { ownerEmployeeId: { _in: employeeIds } }
          : {
              ownerEmployee: {
                employeePosition: {
                  employeeCapabilities: { capability: { name: { _eq: SALES_ASSOCIATE_CAPABILITY } } }
                }
              }
            }

      // Build where conditions for calendar activities
      const baseWhere: any = {
        _and: [
          ownerCondition,
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
      console.error(errorMessage)
      setError(errorMessage)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, employeeIds, scopeToSalesAssociates, dateFrom, dateTo, unlinkedOnly, graphqlClient])

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
