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
  /** Per-employee allocation totals (sum of EmployeeMatrixUnit percentages) */
  employeeAllocations: Array<{ id: string; allocationPercent: number }>
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

function toNum(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Hook to fetch team project allocation data from EmployeeMatrixUnit.
 *
 * When a structureId is available (from window.lowcoder) the query is scoped
 * to that structure. Otherwise it fetches ALL EmployeeMatrixUnit records for
 * the direct reports so allocation / unallocated data is always available.
 */
export const useTeamProjectAllocation = ({
  accessToken,
  managerId
}: UseTeamProjectAllocationProps): TeamProjectAllocationResult => {
  const [allocations, setAllocations] = useState<TeamAllocationData[]>([])
  const [employeeAllocations, setEmployeeAllocations] = useState<Array<{ id: string; allocationPercent: number }>>([])
  const [totalAllocatedPercentage, setTotalAllocatedPercentage] = useState(0)
  const [averageAllocationPercentage, setAverageAllocationPercentage] = useState(0)
  const [unallocatedCount, setUnallocatedCount] = useState(0)
  const [unallocatedEmployeeIds, setUnallocatedEmployeeIds] = useState<string[]>([])
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphqlClient(accessToken)

  const fetchTeamProjectAllocation = useCallback(async () => {
    if (!managerId || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
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
        setEmployeeAllocations([])
        setTotalAllocatedPercentage(0)
        setAverageAllocationPercentage(0)
        setUnallocatedCount(0)
        setUnallocatedEmployeeIds([])
        setTotalEmployees(0)
        setLoading(false)
        return
      }

      setTotalEmployees(employeeIds.length)

      const structureId = getCurrentActiveStructureId()

      const allocationQueryWithStructure = `
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

      const allocationQueryWithoutStructure = `
        query GetTeamAllocationsAll($employeeIds: [uuid!]!) {
          EmployeeMatrixUnit(
            where: {
              employeeId: { _in: $employeeIds }
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

      let allocationResponse: any
      if (structureId) {
        allocationResponse = await graphQLClient.request(allocationQueryWithStructure, {
          employeeIds,
          structureId
        })
      } else {
        allocationResponse = await graphQLClient.request(allocationQueryWithoutStructure, {
          employeeIds
        })
      }

      const matrixUnits = allocationResponse?.EmployeeMatrixUnit || []

      const employeeAllocationMap = new Map<string, number>()

      for (const empId of employeeIds) {
        employeeAllocationMap.set(empId, 0)
      }

      const teamAllocationMap = new Map<string, { teamName: string; totalPercentage: number; employeeCount: number }>()

      for (const allocation of matrixUnits) {
        const employeeId = allocation.employeeId
        const teamId = allocation.matrixUnitId
        const teamName = allocation.matrixUnit?.name || 'Unknown Team'
        const percentage = toNum(allocation.percentage)

        const currentEmployeeAllocation = employeeAllocationMap.get(employeeId) ?? 0
        employeeAllocationMap.set(employeeId, currentEmployeeAllocation + percentage)

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

      let totalEmployeeAllocation = 0
      let notAllocatedCount = 0
      const notAllocatedIds: string[] = []

      for (const [empId, raw] of employeeAllocationMap) {
        const allocation = Number.isFinite(raw) ? raw : 0
        totalEmployeeAllocation += allocation
        if (allocation === 0) {
          notAllocatedCount++
          notAllocatedIds.push(empId)
        }
      }

      const avgAllocation =
        employeeIds.length > 0 && Number.isFinite(totalEmployeeAllocation)
          ? Math.round(totalEmployeeAllocation / employeeIds.length)
          : 0

      setAverageAllocationPercentage(avgAllocation)
      setUnallocatedCount(notAllocatedCount)
      setUnallocatedEmployeeIds(notAllocatedIds)
      setEmployeeAllocations(
        employeeIds.map(id => ({
          id,
          allocationPercent: employeeAllocationMap.get(id) || 0
        }))
      )

      const aggregatedAllocations: TeamAllocationData[] = Array.from(teamAllocationMap.entries()).map(
        ([teamId, data]) => ({
          teamId,
          teamName: data.teamName,
          percentage: Math.round(data.totalPercentage / data.employeeCount),
          employeeCount: data.employeeCount
        })
      )

      aggregatedAllocations.sort((a, b) => b.percentage - a.percentage)

      setAllocations(aggregatedAllocations)
      setTotalAllocatedPercentage(avgAllocation)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team project allocation'))
      console.error('Error fetching team project allocation:', err)
      setAllocations([])
      setEmployeeAllocations([])
    } finally {
      setLoading(false)
    }
  }, [managerId, accessToken, graphQLClient])

  useEffect(() => {
    void fetchTeamProjectAllocation()
  }, [fetchTeamProjectAllocation])

  return {
    allocations,
    employeeAllocations,
    totalAllocatedPercentage,
    averageAllocationPercentage,
    unallocatedCount,
    unallocatedEmployeeIds,
    totalEmployees,
    loading,
    error,
    refetch: () => {
      void fetchTeamProjectAllocation()
    }
  }
}
