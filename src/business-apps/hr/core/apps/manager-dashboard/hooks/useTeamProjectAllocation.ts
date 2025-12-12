import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface TeamAllocationData {
  teamId: string
  teamName: string
  percentage: number
  employeeCount: number
}

export interface TeamProjectAllocationResult {
  allocations: TeamAllocationData[]
  totalAllocatedPercentage: number
  averageAllocationPercentage: number
  unallocatedCount: number
  /** List of employee IDs that have no project allocation */
  unallocatedEmployeeIds: string[]
  totalEmployees: number
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface UseTeamProjectAllocationProps {
  accessToken: string
  managerId: string
}

/**
 * Hook to fetch team project allocation data from EmployeeMatrixUnit
 * Calculates average allocation percentage across all team members
 * Each employee's allocation = sum of all their EmployeeMatrixUnit.percentage values
 * Team average = average of all employee allocations
 */
export const useTeamProjectAllocation = ({
  accessToken,
  managerId
}: UseTeamProjectAllocationProps): TeamProjectAllocationResult => {
  const [allocations, setAllocations] = useState<TeamAllocationData[]>([])
  const [totalAllocatedPercentage, setTotalAllocatedPercentage] = useState(0)
  const [averageAllocationPercentage, setAverageAllocationPercentage] = useState(0)
  const [unallocatedCount, setUnallocatedCount] = useState(0)
  const [unallocatedEmployeeIds, setUnallocatedEmployeeIds] = useState<string[]>([])
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphqlClient(accessToken)
  const structureId = getCurrentActiveStructureId()

  const fetchTeamProjectAllocation = useCallback(async () => {
    if (!managerId || !accessToken || !structureId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // First get all direct reports
      const directReportsQuery = `
        query GetDirectReportIds($managerId: uuid!) {
          Employee(
            where: {
              employeePosition: { supervisorEmployeeId: { _eq: $managerId } },
              isDeleted: { _eq: false }
            }
          ) {
            id
          }
        }
      `

      const directReportsResponse = await graphQLClient.request(directReportsQuery, { managerId })
      const employeeIds = directReportsResponse?.Employee?.map((e: any) => e.id) || []

      if (employeeIds.length === 0) {
        setAllocations([])
        setTotalAllocatedPercentage(0)
        setAverageAllocationPercentage(0)
        setUnallocatedCount(0)
        setUnallocatedEmployeeIds([])
        setTotalEmployees(0)
        setLoading(false)
        return
      }

      setTotalEmployees(employeeIds.length)

      // Get matrix unit allocations for all direct reports
      const allocationQuery = `
        query GetTeamAllocations($employeeIds: [uuid!]!, $structureId: uuid!) {
          EmployeeMatrixUnit(
            where: {
              employeeId: { _in: $employeeIds },
              structureId: { _eq: $structureId }
            }
          ) {
            id
            employeeId
            matrixUnitId
            percentage
            matrixUnit {
              id
              name
            }
          }
        }
      `

      const allocationResponse = await graphQLClient.request(allocationQuery, {
        employeeIds,
        structureId
      })

      const matrixUnits = allocationResponse?.EmployeeMatrixUnit || []

      // Calculate per-employee allocation totals
      const employeeAllocationMap = new Map<string, number>()

      // Initialize all employees with 0 allocation
      for (const empId of employeeIds) {
        employeeAllocationMap.set(empId, 0)
      }

      // Aggregate allocations by matrix unit for breakdown display
      const teamAllocationMap = new Map<string, { teamName: string; totalPercentage: number; employeeCount: number }>()

      for (const allocation of matrixUnits) {
        const employeeId = allocation.employeeId
        const teamId = allocation.matrixUnitId
        const teamName = allocation.matrixUnit?.name || 'Unknown Team'
        const percentage = allocation.percentage || 0

        // Sum up each employee's total allocation
        const currentEmployeeAllocation = employeeAllocationMap.get(employeeId) || 0
        employeeAllocationMap.set(employeeId, currentEmployeeAllocation + percentage)

        // Aggregate by team for breakdown
        if (teamAllocationMap.has(teamId)) {
          const existing = teamAllocationMap.get(teamId)!
          existing.totalPercentage += percentage
          existing.employeeCount += 1
        } else {
          teamAllocationMap.set(teamId, {
            teamName,
            totalPercentage: percentage,
            employeeCount: 1
          })
        }
      }

      // Calculate team average allocation
      // Sum all employee allocations and divide by number of employees
      let totalEmployeeAllocation = 0
      let notAllocatedCount = 0
      const notAllocatedIds: string[] = []

      for (const [employeeId, allocation] of employeeAllocationMap) {
        totalEmployeeAllocation += allocation
        if (allocation === 0) {
          notAllocatedCount++
          notAllocatedIds.push(employeeId)
        }
      }

      const avgAllocation = employeeIds.length > 0 ? Math.round(totalEmployeeAllocation / employeeIds.length) : 0

      setAverageAllocationPercentage(avgAllocation)
      setUnallocatedCount(notAllocatedCount)
      setUnallocatedEmployeeIds(notAllocatedIds)

      // Build team breakdown
      const aggregatedAllocations: TeamAllocationData[] = Array.from(teamAllocationMap.entries()).map(
        ([teamId, data]) => ({
          teamId,
          teamName: data.teamName,
          percentage: Math.round(data.totalPercentage / data.employeeCount),
          employeeCount: data.employeeCount
        })
      )

      // Sort by percentage descending
      aggregatedAllocations.sort((a, b) => b.percentage - a.percentage)

      setAllocations(aggregatedAllocations)
      setTotalAllocatedPercentage(avgAllocation)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team project allocation'))
      console.error('Error fetching team project allocation:', err)
    } finally {
      setLoading(false)
    }
  }, [managerId, accessToken, structureId, graphQLClient])

  useEffect(() => {
    fetchTeamProjectAllocation()
  }, [fetchTeamProjectAllocation])

  return {
    allocations,
    totalAllocatedPercentage,
    averageAllocationPercentage,
    unallocatedCount,
    unallocatedEmployeeIds,
    totalEmployees,
    loading,
    error,
    refetch: () => {
      fetchTeamProjectAllocation()
    }
  }
}
