import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface TeamAllocationData {
  teamId: string
  teamName: string
  percentage: number
  employeeCount: number
}

type EmployeeAllocation = { id: string; allocationPercent: number }

export interface TeamProjectAllocationResult {
  allocations: TeamAllocationData[]
  /** Per-employee allocation totals (sum of EmployeeMatrixUnit percentages) */
  employeeAllocations: EmployeeAllocation[]
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

const DIRECT_REPORT_IDS_QUERY = `
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

const ALLOCATION_QUERY_WITH_STRUCTURE = `
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

const ALLOCATION_QUERY_WITHOUT_STRUCTURE = `
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

const employeeIdsFromResponse = (response: any): string[] =>
  response?.Employee?.map((employee: any) => employee.id) ?? []

const baseEmployeeAllocationMap = (employeeIds: string[]): Map<string, number> => {
  const map = new Map<string, number>()
  for (const employeeId of employeeIds) {
    map.set(employeeId, 0)
  }
  return map
}

const addTeamAllocation = (
  teamAllocationMap: Map<string, { teamName: string; totalPercentage: number; employeeCount: number }>,
  teamId: string,
  teamName: string,
  percentage: number
): void => {
  const existing = teamAllocationMap.get(teamId)
  if (existing) {
    existing.totalPercentage += percentage
    existing.employeeCount += 1
    return
  }

  teamAllocationMap.set(teamId, {
    teamName,
    totalPercentage: percentage,
    employeeCount: 1
  })
}

const summarizeEmployees = (
  employeeIds: string[],
  employeeAllocationMap: Map<string, number>
): { averageAllocation: number; unallocatedEmployeeIds: string[]; employeeAllocations: EmployeeAllocation[] } => {
  let totalEmployeeAllocation = 0
  const unallocatedEmployeeIds: string[] = []

  for (const employeeId of employeeIds) {
    const raw = employeeAllocationMap.get(employeeId) ?? 0
    const allocation = Number.isFinite(raw) ? raw : 0
    totalEmployeeAllocation += allocation
    if (allocation === 0) {
      unallocatedEmployeeIds.push(employeeId)
    }
  }

  const averageAllocation =
    employeeIds.length > 0 && Number.isFinite(totalEmployeeAllocation)
      ? Math.round(totalEmployeeAllocation / employeeIds.length)
      : 0

  const employeeAllocations = employeeIds.map(id => ({
    id,
    allocationPercent: employeeAllocationMap.get(id) ?? 0
  }))

  return { averageAllocation, unallocatedEmployeeIds, employeeAllocations }
}

const toTeamAllocations = (
  teamAllocationMap: Map<string, { teamName: string; totalPercentage: number; employeeCount: number }>
): TeamAllocationData[] =>
  Array.from(teamAllocationMap.entries())
    .map(([teamId, data]) => ({
      teamId,
      teamName: data.teamName,
      percentage: Math.round(data.totalPercentage / data.employeeCount),
      employeeCount: data.employeeCount
    }))
    .toSorted((a, b) => b.percentage - a.percentage)

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
  const [employeeAllocations, setEmployeeAllocations] = useState<EmployeeAllocation[]>([])
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
      const directReportsResponse = await graphQLClient.request(DIRECT_REPORT_IDS_QUERY, { managerId })
      const employeeIds = employeeIdsFromResponse(directReportsResponse)

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
      const allocationQuery = structureId ? ALLOCATION_QUERY_WITH_STRUCTURE : ALLOCATION_QUERY_WITHOUT_STRUCTURE
      const variables = structureId ? { employeeIds, structureId } : { employeeIds }
      const allocationResponse = await graphQLClient.request(allocationQuery, variables)
      const matrixUnits = allocationResponse?.EmployeeMatrixUnit ?? []

      const employeeAllocationMap = baseEmployeeAllocationMap(employeeIds)
      const teamAllocationMap = new Map<string, { teamName: string; totalPercentage: number; employeeCount: number }>()

      for (const allocation of matrixUnits) {
        const employeeId = allocation.employeeId
        const teamId = allocation.matrixUnitId
        const teamName = allocation.matrixUnit?.name || 'Unknown Team'
        const percentage = toNum(allocation.percentage)

        const currentEmployeeAllocation = employeeAllocationMap.get(employeeId) ?? 0
        employeeAllocationMap.set(employeeId, currentEmployeeAllocation + percentage)
        addTeamAllocation(teamAllocationMap, teamId, teamName, percentage)
      }

      const {
        averageAllocation,
        unallocatedEmployeeIds: notAllocatedIds,
        employeeAllocations: byEmployee
      } = summarizeEmployees(employeeIds, employeeAllocationMap)

      setAverageAllocationPercentage(averageAllocation)
      setUnallocatedCount(notAllocatedIds.length)
      setUnallocatedEmployeeIds(notAllocatedIds)
      setEmployeeAllocations(byEmployee)

      const aggregatedAllocations = toTeamAllocations(teamAllocationMap)
      setAllocations(aggregatedAllocations)
      setTotalAllocatedPercentage(averageAllocation)
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
