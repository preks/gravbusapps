import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import dayjs from 'dayjs'

interface RecentAbsenceRequest {
  id: string
  startDate: string
  endDate: string
  calendarDays: number
  effectiveDays: number
  status: string
  createdAt: string
  employee: {
    id: string
    lastName: string
    firstName: string
    pictureThumbnail?: string
    employeePosition: {
      organizationalUnit: {
        name: string
      }
    }
  }
  type: {
    objectValue: string
    translations: { localeCode: string; value: string }[]
    id: string
    value: string
    parentEntryId: string
    groupName?: string
  }
}

interface UseRecentAbsenceRequestsReturn {
  recentRequests: RecentAbsenceRequest[]
  totalCount: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const GET_RECENT_ABSENCE_REQUESTS = `
  query GetRecentAbsenceRequests($supervisorId: uuid!, $startDate: timestamptz!, $endDate: timestamptz!) {
    EmployeeAbsence(
      limit: 10
      where: {
        isDeleted: {_eq: false}
        createdAt: {_gte: $startDate, _lte: $endDate}
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}}
      }
      orderBy: {createdAt: DESC}
    ) {
      id
      startDate
      endDate
      calendarDays
      effectiveDays
      status
      createdAt
      employee {
        id
        lastName
        firstName
        pictureThumbnail
        employeePosition {
          organizationalUnit {
            name
          }
        }
      }
      type {
        objectValue
        translations {
          localeCode
          value
        }
        id
        value
        parentEntryId
      }
    }
    
    # Get total count for the month
    EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false}
        createdAt: {_gte: $startDate, _lte: $endDate}
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const useRecentAbsenceRequests = (context: BusinessAppContextProps): UseRecentAbsenceRequestsReturn => {
  const [recentRequests, setRecentRequests] = useState<RecentAbsenceRequest[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)
  const catalogClient = useCatalogManagerClient(context.accessToken)
  const supervisorId = context.userInfo?.employeeDetails?.employeeId

  const fetchRecentRequests = useCallback(async () => {
    if (!supervisorId) {
      setError('Supervisor ID not found')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get current month start and end dates
      const now = dayjs()
      const startOfMonth = now.startOf('month').format('YYYY-MM-DD') + ' 00:00:00+00'
      const endOfMonth = now.endOf('month').format('YYYY-MM-DD') + ' 23:59:59+00'

      // Fetch recent absence requests (all statuses for current month)
      const result = await graphqlClient.request<{
        EmployeeAbsence: RecentAbsenceRequest[]
        EmployeeAbsenceAggregate: { aggregate: { count: number } }
      }>(GET_RECENT_ABSENCE_REQUESTS, {
        supervisorId,
        startDate: startOfMonth,
        endDate: endOfMonth
      })

      // Fetch absence groups for data enhancement
      const catalogData = await catalogClient.getCatalogEntriesList({
        catalogIdentifier: 'AbsenceGroup',
        version: 'v1'
      })

      const groupsMap: Record<string, string> = {}
      catalogData.data.forEach((entry: any) => {
        groupsMap[entry.id] = entry.value
      })

      // Enhance absence data with group names
      const enhancedRequests = result.EmployeeAbsence.map(absence => ({
        ...absence,
        type: {
          ...absence.type,
          groupName: groupsMap[absence.type.parentEntryId] || 'Unknown'
        }
      }))

      setRecentRequests(enhancedRequests)
      setTotalCount(result.EmployeeAbsenceAggregate?.aggregate?.count || 0)
    } catch (err) {
      console.error('Error fetching recent absence requests:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch recent requests')
    } finally {
      setLoading(false)
    }
  }, [graphqlClient, catalogClient, supervisorId])

  useEffect(() => {
    fetchRecentRequests()
  }, [fetchRecentRequests])

  return {
    recentRequests,
    totalCount,
    loading,
    error,
    refetch: fetchRecentRequests
  }
}
