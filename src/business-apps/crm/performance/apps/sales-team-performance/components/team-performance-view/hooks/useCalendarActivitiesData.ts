import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { TeamSalesActivity } from './useTeamActivitiesData'

interface UseCalendarActivitiesDataProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  employeeIds: string[]
  dateFrom: string // YYYY-MM-DD format
  dateTo: string // YYYY-MM-DD format
}

interface UseCalendarActivitiesDataResult {
  activities: TeamSalesActivity[]
  loading: boolean
  error: string | null
  loadActivities: () => Promise<void>
  retry: () => void
}

// GraphQL query for calendar activities (no limit enforcement)
const GET_CALENDAR_ACTIVITIES_QUERY = `
  query GetCalendarActivities($where: SalesActivityBoolExp, $orderBy: [SalesActivityOrderBy!]) {
    SalesActivity(
      where: $where,
      orderBy: $orderBy
    ) {
      id
      contactId
      leadId
      accountId
      opportunityId
      source
      description
      createdAt
      occurredAt
      createdBy
      ownerEmployeeId
      ownerEmployee {
        fullName
        pictureThumbnail
      }
      title
      activityType {
        value
      }
      account {
        email
        name
        pictureUrl
      }
      contact {
        firstName
        lastName
        phone
        pictureUrl
        email
      }
      lead {
        name
        companyEmail
        companyPhone
        contact {
          firstName
          lastName
        }
      }
      opportunity {
        name
        ownerEmployee {
          fullName
        }
      }
    }
  }
`

/**
 * Hook specifically for calendar view - fetches ALL activities within a date range
 * without enforcing query limits. Safe because date range is typically one month.
 */
export const useCalendarActivitiesData = ({
  employeeIds,
  dateFrom,
  dateTo,
  accessToken,
  userInfo
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

      // Order by occurredAt descending
      const orderBy = [{ occurredAt: 'DESC' }]

      const result = await graphqlClient.request<{
        SalesActivity: TeamSalesActivity[]
      }>(GET_CALENDAR_ACTIVITIES_QUERY, {
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
  }, [accessToken, employeeIds, dateFrom, dateTo, userInfo, graphqlClient])

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
