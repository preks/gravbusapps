import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'

// Employee with aggregated activity statistics
export interface EmployeeComparison {
  id: string
  displayName: string
  fullName: string
  pictureThumbnail?: string
  jobPosition?: string
  organizationalUnit?: string
  totalActivities: number
  thisWeekActivities: number
  thisMonthActivities: number
  last30DaysActivities: number
  prev30DaysActivities: number
  trend: number // Percentage change from previous 30 days
  lastActivityDate?: string
}

interface UseEmployeeComparisonDataProps {
  accessToken: string
  entityId?: string // For filtering by specific entity (account, contact, etc.)
  entityType?: 'accountId' | 'contactId' | 'leadId' | 'opportunityId'
}

interface UseEmployeeComparisonDataResult {
  employees: EmployeeComparison[]
  loading: boolean
  error: string | null
  refetch: () => void
}

// Query to get employee comparison data
const GET_EMPLOYEE_COMPARISON_QUERY = (entityFilter?: { field: string; id: string }) => `
  query GetEmployeeComparison(
    $thisWeekStart: timestamptz!,
    $thisMonthStart: timestamptz!,
    $last30DaysStart: timestamptz!,
    $prev30DaysStart: timestamptz!,
    $prev30DaysEnd: timestamptz!
  ) {
    # Get all employees who have activities
    allActiveEmployees: SalesActivity(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          ${entityFilter ? `{ ${entityFilter.field}: { _eq: "${entityFilter.id}" } }` : ''}
        ]
      }
      distinctOn: [ownerEmployeeId]
      orderBy: [{ ownerEmployeeId: ASC }, { createdAt: DESC }]
    ) {
      ownerEmployeeId
      createdAt
      ownerEmployee {
        id
        displayName
        firstName
        lastName
        pictureThumbnail
        employeePosition {
          jobPosition { name }
          organizationalUnit { name }
        }
      }
    }
    
    # Total activities per employee
    totalActivities: SalesActivity(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          ${entityFilter ? `{ ${entityFilter.field}: { _eq: "${entityFilter.id}" } }` : ''}
        ]
      }
    ) {
      ownerEmployeeId
    }
    
    # This week activities
    thisWeekActivities: SalesActivity(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $thisWeekStart } }
          ${entityFilter ? `{ ${entityFilter.field}: { _eq: "${entityFilter.id}" } }` : ''}
        ]
      }
    ) {
      ownerEmployeeId
    }
    
    # This month activities
    thisMonthActivities: SalesActivity(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $thisMonthStart } }
          ${entityFilter ? `{ ${entityFilter.field}: { _eq: "${entityFilter.id}" } }` : ''}
        ]
      }
    ) {
      ownerEmployeeId
    }
    
    # Last 30 days activities
    last30DaysActivities: SalesActivity(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $last30DaysStart } }
          ${entityFilter ? `{ ${entityFilter.field}: { _eq: "${entityFilter.id}" } }` : ''}
        ]
      }
    ) {
      ownerEmployeeId
    }
    
    # Previous 30 days activities (for trend calculation)
    prev30DaysActivities: SalesActivity(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $prev30DaysStart, _lt: $prev30DaysEnd } }
          ${entityFilter ? `{ ${entityFilter.field}: { _eq: "${entityFilter.id}" } }` : ''}
        ]
      }
    ) {
      ownerEmployeeId
    }
  }
`

export const useEmployeeComparisonData = ({
  accessToken,
  entityId,
  entityType
}: UseEmployeeComparisonDataProps): UseEmployeeComparisonDataResult => {
  const [employees, setEmployees] = useState<EmployeeComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Calculate date ranges
      const now = dayjs()
      const thisWeekStart = now.startOf('week').format('YYYY-MM-DDTHH:mm:ss')
      const thisMonthStart = now.startOf('month').format('YYYY-MM-DDTHH:mm:ss')
      const last30DaysStart = now.subtract(30, 'day').format('YYYY-MM-DDTHH:mm:ss')
      const prev30DaysStart = now.subtract(60, 'day').format('YYYY-MM-DDTHH:mm:ss')
      const prev30DaysEnd = last30DaysStart

      // Build entity filter if provided
      const entityFilter = entityId && entityType ? { field: entityType, id: entityId } : undefined

      // Build and execute query
      const query = GET_EMPLOYEE_COMPARISON_QUERY(entityFilter)
      const result = await graphqlClient.request<{
        allActiveEmployees: Array<{
          ownerEmployeeId: string
          createdAt: string
          ownerEmployee: {
            id: string
            displayName: string
            firstName: string
            lastName: string
            pictureThumbnail?: string
            employeePosition?: Array<{
              jobPosition?: { name: string }
              organizationalUnit?: { name: string }
            }>
          }
        }>
        totalActivities: Array<{ ownerEmployeeId: string }>
        thisWeekActivities: Array<{ ownerEmployeeId: string }>
        thisMonthActivities: Array<{ ownerEmployeeId: string }>
        last30DaysActivities: Array<{ ownerEmployeeId: string }>
        prev30DaysActivities: Array<{ ownerEmployeeId: string }>
      }>(query, {
        thisWeekStart,
        thisMonthStart,
        last30DaysStart,
        prev30DaysStart,
        prev30DaysEnd
      })

      // Aggregate activities by employee
      const employeeMap = new Map<string, EmployeeComparison>()

      // Initialize employees from allActiveEmployees
      result.allActiveEmployees.forEach(item => {
        const emp = item.ownerEmployee
        if (!emp) return

        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
        const position = emp.employeePosition?.[0]

        employeeMap.set(emp.id, {
          id: emp.id,
          displayName: emp.displayName || fullName || 'Unknown Employee',
          fullName: fullName || 'Unknown',
          pictureThumbnail: emp.pictureThumbnail,
          jobPosition: position?.jobPosition?.name,
          organizationalUnit: position?.organizationalUnit?.name,
          totalActivities: 0,
          thisWeekActivities: 0,
          thisMonthActivities: 0,
          last30DaysActivities: 0,
          prev30DaysActivities: 0,
          trend: 0,
          lastActivityDate: item.createdAt
        })
      })

      // Count total activities per employee
      result.totalActivities.forEach(item => {
        if (item.ownerEmployeeId && employeeMap.has(item.ownerEmployeeId)) {
          const emp = employeeMap.get(item.ownerEmployeeId)!
          emp.totalActivities++
        }
      })

      // Count this week activities
      result.thisWeekActivities.forEach(item => {
        if (item.ownerEmployeeId && employeeMap.has(item.ownerEmployeeId)) {
          const emp = employeeMap.get(item.ownerEmployeeId)!
          emp.thisWeekActivities++
        }
      })

      // Count this month activities
      result.thisMonthActivities.forEach(item => {
        if (item.ownerEmployeeId && employeeMap.has(item.ownerEmployeeId)) {
          const emp = employeeMap.get(item.ownerEmployeeId)!
          emp.thisMonthActivities++
        }
      })

      // Count last 30 days activities
      result.last30DaysActivities.forEach(item => {
        if (item.ownerEmployeeId && employeeMap.has(item.ownerEmployeeId)) {
          const emp = employeeMap.get(item.ownerEmployeeId)!
          emp.last30DaysActivities++
        }
      })

      // Count previous 30 days activities
      result.prev30DaysActivities.forEach(item => {
        if (item.ownerEmployeeId && employeeMap.has(item.ownerEmployeeId)) {
          const emp = employeeMap.get(item.ownerEmployeeId)!
          emp.prev30DaysActivities++
        }
      })

      // Calculate trends
      employeeMap.forEach(emp => {
        if (emp.prev30DaysActivities > 0) {
          emp.trend = ((emp.last30DaysActivities - emp.prev30DaysActivities) / emp.prev30DaysActivities) * 100
        } else if (emp.last30DaysActivities > 0) {
          emp.trend = 100 // New activities from 0
        } else {
          emp.trend = 0
        }
      })

      // Convert to array and sort by total activities (descending)
      const employeeList = Array.from(employeeMap.values()).sort((a, b) => b.totalActivities - a.totalActivities)

      setEmployees(employeeList)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load employee comparison data'
      setError(errorMessage)
      console.error('Error loading employee comparison:', err)
    } finally {
      setLoading(false)
    }
  }, [accessToken, entityId, entityType, graphqlClient])

  const refetch = useCallback(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    employees,
    loading,
    error,
    refetch
  }
}
