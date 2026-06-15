import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { type TeamComparisonData, type TeamRevenueTrendPoint, type TimeFilter, COMPARISON_CHART_COLORS } from '../types'
import {
  buildEmployeeOptionsQuery,
  buildSelectedEmployeesQuery,
  generateTimePeriods,
  type SelectedEmployeesResponse
} from './performanceComparisonQueries'

export interface EmployeeOption {
  id: string
  name: string
  position: string
  department: string
}

interface EmployeePositionRecord {
  jobPosition: { name: string } | null
  organizationalUnit: { id: string; name: string } | null
}

interface EmployeeRecord {
  id: string
  displayName: string
  firstName: string
  lastName: string
  pictureThumbnail: string | null
  employeePosition: EmployeePositionRecord | null
}

interface UseEmployeeComparisonResult {
  availableEmployees: EmployeeOption[]
  selectedEmployees: TeamComparisonData[]
  revenueTrends: TeamRevenueTrendPoint[]
  isLoading: boolean
  isLoadingTrends: boolean
  error: string | null
  selectEmployee: (employeeId: string) => void
  deselectEmployee: (employeeId: string) => void
  selectedEmployeeIds: string[]
  refetch: () => void
  employeesData: EmployeeRecord[]
}

export const useEmployeeComparison = (
  accessToken: string,
  timeFilter: TimeFilter = 'sixMonths',
  selectedCurrencyId?: string,
  selectedCurrencyCode: string = 'EUR',
  selectedPipelineId?: string,
  controlledSelectedEmployeeIds?: string[],
  onEmployeeSelectionChange?: (employeeIds: string[]) => void
): UseEmployeeComparisonResult => {
  const [availableEmployees, setAvailableEmployees] = useState<EmployeeOption[]>([])
  const [internalSelectedEmployeeIds, setInternalSelectedEmployeeIds] = useState<string[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<TeamComparisonData[]>([])
  const [revenueTrends, setRevenueTrends] = useState<TeamRevenueTrendPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTrends, setIsLoadingTrends] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [employeesData, setEmployeesData] = useState<EmployeeRecord[]>([])

  const isControlled = controlledSelectedEmployeeIds !== undefined && onEmployeeSelectionChange !== undefined
  const selectedEmployeeIds = isControlled ? controlledSelectedEmployeeIds : internalSelectedEmployeeIds

  const onEmployeeSelectionChangeRef = useRef(onEmployeeSelectionChange)
  onEmployeeSelectionChangeRef.current = onEmployeeSelectionChange

  const controlledSelectedEmployeeIdsRef = useRef(controlledSelectedEmployeeIds)
  controlledSelectedEmployeeIdsRef.current = controlledSelectedEmployeeIds

  const setSelectedEmployeeIds = useCallback(
    (updater: string[] | ((prev: string[]) => string[])) => {
      if (isControlled && onEmployeeSelectionChangeRef.current) {
        const currentIds = controlledSelectedEmployeeIdsRef.current || []
        const newIds = typeof updater === 'function' ? updater(currentIds) : updater
        onEmployeeSelectionChangeRef.current(newIds)
      } else {
        setInternalSelectedEmployeeIds(updater)
      }
    },
    [isControlled]
  )

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchAvailableEmployees = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<{ Employee: EmployeeRecord[] }>(buildEmployeeOptionsQuery())
      const employees = result.Employee || []
      setEmployeesData(employees)

      const options: EmployeeOption[] = employees.map(employee => {
        const position = employee.employeePosition
        return {
          id: employee.id,
          name: employee.displayName || `${employee.firstName} ${employee.lastName}`.trim(),
          position: position?.jobPosition?.name || 'Unknown Position',
          department: position?.organizationalUnit?.name || 'Unknown Department'
        }
      })

      setAvailableEmployees(options)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employees')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient])

  const fetchSelectedEmployeesData = useCallback(async () => {
    if (selectedEmployeeIds.length === 0 || employeesData.length === 0) {
      setSelectedEmployees([])
      setRevenueTrends([])
      return
    }

    setIsLoadingTrends(true)

    try {
      const periods = generateTimePeriods(timeFilter)

      // Resolve each selected employee, preserving selection order.
      const resolvedEmployees = selectedEmployeeIds.map((employeeId, index) => {
        const employee = employeesData.find(item => item.id === employeeId) ?? null
        return { employeeId, index, employee }
      })

      const employeesToQuery = resolvedEmployees.filter(entry => entry.employee)

      // Fetch metrics + trends for ALL selected employees in a single batched
      // query (aliased per employee), instead of two requests per employee.
      let response: SelectedEmployeesResponse = {}
      if (employeesToQuery.length > 0) {
        const query = buildSelectedEmployeesQuery(
          employeesToQuery.map(entry => ({ index: entry.index, employeeId: entry.employeeId })),
          periods,
          selectedCurrencyId,
          selectedPipelineId
        )
        response = await graphqlClient.request<SelectedEmployeesResponse>(query)
      }

      const employeesWithData: TeamComparisonData[] = []
      resolvedEmployees.forEach(({ employee, index }) => {
        if (!employee) return

        const position = employee.employeePosition
        const totalCount = response[`e${index}_total`]?.aggregate?.count || 0
        const wonCount = response[`e${index}_won`]?.aggregate?.count || 0
        const totalClosed = response[`e${index}_closed`]?.aggregate?.count || 0
        const revenue = response[`e${index}_won`]?.aggregate?.sum?.estimatedAmount || 0

        employeesWithData.push({
          id: employee.id,
          name: employee.displayName || `${employee.firstName} ${employee.lastName}`.trim(),
          leadName: position?.jobPosition?.name || 'Unknown Position',
          revenue,
          memberCount: 1,
          opportunitiesCount: totalCount,
          wonOpportunitiesCount: wonCount,
          winRate: totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0,
          currencyCode: selectedCurrencyCode,
          color: COMPARISON_CHART_COLORS[index % COMPARISON_CHART_COLORS.length]
        })
      })

      const trendsArray: TeamRevenueTrendPoint[] = periods.map((period, periodIndex) => {
        const point: TeamRevenueTrendPoint = { month: period.label }
        resolvedEmployees.forEach(({ employeeId, index }) => {
          point[employeeId] = response[`e${index}_p${periodIndex}`]?.aggregate?.sum?.estimatedAmount || 0
        })
        return point
      })

      setSelectedEmployees(employeesWithData)
      setRevenueTrends(trendsArray)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employee comparison data')
    } finally {
      setIsLoadingTrends(false)
    }
  }, [
    selectedEmployeeIds,
    employeesData,
    timeFilter,
    selectedCurrencyId,
    selectedCurrencyCode,
    selectedPipelineId,
    graphqlClient
  ])

  useEffect(() => {
    fetchAvailableEmployees().catch(() => undefined)
  }, [fetchAvailableEmployees])

  useEffect(() => {
    fetchSelectedEmployeesData().catch(() => undefined)
  }, [fetchSelectedEmployeesData])

  const selectEmployee = useCallback(
    (employeeId: string) => {
      setSelectedEmployeeIds(prev => {
        if (prev.includes(employeeId)) {
          return prev
        }
        return [...prev, employeeId]
      })
    },
    [setSelectedEmployeeIds]
  )

  const deselectEmployee = useCallback(
    (employeeId: string) => {
      setSelectedEmployeeIds(prev => prev.filter(id => id !== employeeId))
    },
    [setSelectedEmployeeIds]
  )

  const refetch = useCallback(() => {
    fetchAvailableEmployees().catch(() => undefined)
    fetchSelectedEmployeesData().catch(() => undefined)
  }, [fetchAvailableEmployees, fetchSelectedEmployeesData])

  return {
    availableEmployees,
    selectedEmployees,
    revenueTrends,
    isLoading,
    isLoadingTrends,
    error,
    selectEmployee,
    deselectEmployee,
    selectedEmployeeIds,
    refetch,
    employeesData
  }
}
