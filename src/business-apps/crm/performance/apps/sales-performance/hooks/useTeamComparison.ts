import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { type TeamComparisonData, type TeamRevenueTrendPoint, type TimeFilter, TEAM_COLORS } from '../types'

export interface TeamOption {
  id: string
  name: string
  leadName: string
  memberCount: number
}

interface UseTeamComparisonResult {
  availableTeams: TeamOption[]
  selectedTeams: TeamComparisonData[]
  revenueTrends: TeamRevenueTrendPoint[]
  isLoading: boolean
  isLoadingTrends: boolean
  error: string | null
  selectTeam: (teamId: string) => void
  deselectTeam: (teamId: string) => void
  selectedTeamIds: string[]
  refetch: () => void
  teamsData: OrganizationalUnit[]
}

interface OrganizationalUnitEmployee {
  employeeId: string
  managerLevel: string | null
  role: string | null
  employee: {
    id: string
    displayName: string
    firstName: string
    lastName: string
  } | null
}

interface OrganizationalUnit {
  id: string
  name: string
  organizationalUnitEmployee: OrganizationalUnitEmployee[]
}

type TeamAggregateResponse = Record<
  string,
  { aggregate?: { count?: number; sum?: { estimatedAmount?: number | null } } }
>

// Generate time periods based on filter
function generateTimePeriods(timeFilter: TimeFilter): { start: string; end: string; label: string }[] {
  const currentDate = new Date()
  const periods: { start: string; end: string; label: string }[] = []

  switch (timeFilter) {
    case 'month':
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(currentDate)
        weekStart.setDate(currentDate.getDate() - (i * 7 + 7))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)

        periods.push({
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
          label: `Week ${4 - i}`
        })
      }
      break

    case 'quarter':
      // Last 3 months
      for (let i = 2; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const monthStart = date.toISOString()
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString()

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: date.toLocaleDateString('en-US', { month: 'short' })
        })
      }
      break

    case 'sixMonths':
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const monthStart = date.toISOString()
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString()

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: date.toLocaleDateString('en-US', { month: 'short' })
        })
      }
      break

    case 'year':
      // Last 12 months - include year for clarity
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const monthStart = date.toISOString()
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString()

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        })
      }
      break

    case 'historical':
      // Last 24 months - include year to avoid duplicate labels
      for (let i = 23; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const monthStart = date.toISOString()
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString()

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        })
      }
      break

    default:
      // Default to 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const monthStart = date.toISOString()
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString()

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: date.toLocaleDateString('en-US', { month: 'short' })
        })
      }
  }

  return periods
}

/**
 * Find the team lead/manager from organizational unit employees
 * Looks for employees with managerLevel or role indicating leadership
 */
const findTeamLead = (employees: OrganizationalUnitEmployee[]): string => {
  // First try to find someone with managerLevel set
  const managerByLevel = employees.find(
    emp =>
      emp.employee &&
      emp.managerLevel &&
      ['MANAGER', 'LEAD', 'HEAD', 'DIRECTOR', '1', '2'].includes(emp.managerLevel.toUpperCase())
  )
  if (managerByLevel?.employee) {
    return (
      managerByLevel.employee.displayName ||
      `${managerByLevel.employee.firstName} ${managerByLevel.employee.lastName}`.trim()
    )
  }

  // Then try to find someone with role indicating management
  const managerByRole = employees.find(
    emp =>
      emp.employee && emp.role && ['MANAGER', 'LEAD', 'HEAD', 'DIRECTOR', 'SUPERVISOR'].includes(emp.role.toUpperCase())
  )
  if (managerByRole?.employee) {
    return (
      managerByRole.employee.displayName ||
      `${managerByRole.employee.firstName} ${managerByRole.employee.lastName}`.trim()
    )
  }

  // Fallback to first employee with valid data
  const firstEmployee = employees.find(emp => emp.employee)
  if (firstEmployee?.employee) {
    return (
      firstEmployee.employee.displayName ||
      `${firstEmployee.employee.firstName} ${firstEmployee.employee.lastName}`.trim()
    )
  }

  return 'No Lead Assigned'
}

// Sales Associate capability name for filtering
const SALES_ASSOCIATE_CAPABILITY = 'Sales Associate'

const buildTeamsQuery = (): string => `
  query GetAllTeams($structureId: uuid!) {
    OrganizationalUnit(
      where: {
        isDeleted: {_eq: false}
        structureId: {_eq: $structureId}
        type: {_in: ["TEAM", "DEPARTMENT", "UNIT"]}
        organizationalUnitEmployee: {
          employee: {
            isDeleted: {_eq: false}
            employeePosition: {
              employeeCapabilities: {
                capability: {
                  name: {_eq: "${SALES_ASSOCIATE_CAPABILITY}"}
                }
              }
            }
          }
        }
      }
      orderBy: {name: ASC}
    ) {
      id
      name
      organizationalUnitEmployee(
        where: {
          employee: {
            isDeleted: {_eq: false}
            employeePosition: {
              employeeCapabilities: {
                capability: {
                  name: {_eq: "${SALES_ASSOCIATE_CAPABILITY}"}
                }
              }
            }
          }
        }
      ) {
        employeeId
        managerLevel
        role
        employee {
          id
          displayName
          firstName
          lastName
        }
      }
    }
  }
`

interface TeamQueryInput {
  index: number
  memberIds: string[]
}

// Build a single query that returns metrics + per-period trends for every
// selected team at once (aliased per team index), so adding/removing a team
// triggers exactly one network request instead of one request per team.
const buildSelectedTeamsQuery = (
  teams: TeamQueryInput[],
  periods: { start: string; end: string }[],
  selectedCurrencyId?: string,
  selectedPipelineId?: string
): string => {
  const currencyFilter = selectedCurrencyId ? `\n          currencyRef: {_eq: "${selectedCurrencyId}"}` : ''
  const pipelineFilter = selectedPipelineId ? `\n          salesPipelineRef: {_eq: "${selectedPipelineId}"}` : ''

  const teamBlocks = teams
    .map(({ index, memberIds }) => {
      const memberIdsJson = JSON.stringify(memberIds)

      const metricsBase = `isDeleted: {_eq: false}
          ownerEmployeeId: {_in: ${memberIdsJson}}${currencyFilter}${pipelineFilter}`

      const trendsBase = `isDeleted: {_eq: false}
          opportunityStatus: {code: {_eq: "WON"}}
          ownerEmployeeId: {_in: ${memberIdsJson}}
          estimatedAmount: {_isNull: false}${currencyFilter}${pipelineFilter}`

      const periodBlocks = periods
        .map(
          (period, periodIndex) => `
      t${index}_p${periodIndex}: OpportunityAggregate(where: {
          ${trendsBase}
          closeDate: {_gte: "${period.start}", _lt: "${period.end}"}
        }) {
        aggregate { sum { estimatedAmount } }
      }`
        )
        .join('\n')

      return `
      t${index}_total: OpportunityAggregate(where: { ${metricsBase} }) {
        aggregate { count }
      }
      t${index}_won: OpportunityAggregate(where: {
          ${metricsBase}
          opportunityStatus: {code: {_eq: "WON"}}
        }) {
        aggregate { count sum { estimatedAmount } }
      }
      t${index}_closed: OpportunityAggregate(where: {
          ${metricsBase}
          opportunityStatus: {code: {_in: ["WON", "LOST"]}}
        }) {
        aggregate { count }
      }
${periodBlocks}`
    })
    .join('\n')

  return `
    query GetTeamTrends {
${teamBlocks}
    }
  `
}

export interface UseTeamComparisonOptions {
  accessToken: string
  timeFilter?: TimeFilter
  selectedCurrencyId?: string
  selectedCurrencyCode?: string
  selectedPipelineId?: string
  maxTeams?: number
  // Controlled state - if provided, the hook uses these instead of internal state
  controlledSelectedTeamIds?: string[]
  onTeamSelectionChange?: (teamIds: string[]) => void
  // Auto-select user's team on first load
  userTeamId?: string
}

/**
 * Hook to fetch and manage team comparison data
 * Allows selecting up to 4 teams and viewing their revenue trends
 *
 * Supports both controlled and uncontrolled modes:
 * - Uncontrolled: manages selectedTeamIds internally
 * - Controlled: uses controlledSelectedTeamIds and onTeamSelectionChange
 *
 * @param options - Configuration options for the hook
 */
export const useTeamComparison = (
  accessToken: string,
  timeFilter: TimeFilter = 'sixMonths',
  selectedCurrencyId?: string,
  selectedCurrencyCode: string = 'EUR',
  selectedPipelineId?: string,
  maxTeams: number = 4,
  controlledSelectedTeamIds?: string[],
  onTeamSelectionChange?: (teamIds: string[]) => void,
  userTeamId?: string
): UseTeamComparisonResult => {
  const [availableTeams, setAvailableTeams] = useState<TeamOption[]>([])
  // Internal state for uncontrolled mode
  const [internalSelectedTeamIds, setInternalSelectedTeamIds] = useState<string[]>([])
  const [selectedTeams, setSelectedTeams] = useState<TeamComparisonData[]>([])
  const [revenueTrends, setRevenueTrends] = useState<TeamRevenueTrendPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTrends, setIsLoadingTrends] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teamsData, setTeamsData] = useState<OrganizationalUnit[]>([])
  const [hasAutoSelectedUserTeam, setHasAutoSelectedUserTeam] = useState(false)

  // Determine if we're in controlled mode
  const isControlled = controlledSelectedTeamIds !== undefined && onTeamSelectionChange !== undefined
  const selectedTeamIds = isControlled ? controlledSelectedTeamIds : internalSelectedTeamIds

  // Use ref to avoid stale closures in callbacks
  const onTeamSelectionChangeRef = useRef(onTeamSelectionChange)
  onTeamSelectionChangeRef.current = onTeamSelectionChange

  const controlledSelectedTeamIdsRef = useRef(controlledSelectedTeamIds)
  controlledSelectedTeamIdsRef.current = controlledSelectedTeamIds

  // Memoized setter that works for both controlled and uncontrolled modes
  const setSelectedTeamIds = useCallback(
    (updater: string[] | ((prev: string[]) => string[])) => {
      if (isControlled && onTeamSelectionChangeRef.current) {
        const currentIds = controlledSelectedTeamIdsRef.current || []
        const newIds = typeof updater === 'function' ? updater(currentIds) : updater
        onTeamSelectionChangeRef.current(newIds)
      } else {
        setInternalSelectedTeamIds(updater)
      }
    },
    [isControlled]
  )

  const graphqlClient = useGraphQLClient(accessToken)
  const structureId = getCurrentActiveStructureId()

  // Fetch all available teams
  const fetchAvailableTeams = useCallback(async () => {
    if (!accessToken || !structureId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<{
        OrganizationalUnit: OrganizationalUnit[]
      }>(buildTeamsQuery(), { structureId })

      const teams = result.OrganizationalUnit || []
      setTeamsData(teams)

      const teamOptions: TeamOption[] = teams.map(team => ({
        id: team.id,
        name: team.name,
        leadName: findTeamLead(team.organizationalUnitEmployee),
        memberCount: team.organizationalUnitEmployee.filter(e => e.employee).length
      }))

      setAvailableTeams(teamOptions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teams')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient, structureId])

  // Fetch metrics + trends for ALL selected teams in a single batched query.
  // Adding/removing a team triggers exactly one request (not one per team).
  const fetchSelectedTeamsData = useCallback(async () => {
    if (selectedTeamIds.length === 0 || teamsData.length === 0) {
      setSelectedTeams([])
      setRevenueTrends([])
      return
    }

    setIsLoadingTrends(true)

    try {
      const periods = generateTimePeriods(timeFilter)

      // Resolve each selected team and its members, preserving selection order.
      const resolvedTeams = selectedTeamIds.map((teamId, index) => {
        const team = teamsData.find(t => t.id === teamId) ?? null
        const memberIds = team ? team.organizationalUnitEmployee.filter(e => e.employee).map(e => e.employeeId) : []
        return { teamId, index, team, memberIds }
      })

      const teamsToQuery = resolvedTeams.filter(entry => entry.team && entry.memberIds.length > 0)

      let response: TeamAggregateResponse = {}
      if (teamsToQuery.length > 0) {
        const query = buildSelectedTeamsQuery(
          teamsToQuery.map(entry => ({ index: entry.index, memberIds: entry.memberIds })),
          periods,
          selectedCurrencyId,
          selectedPipelineId
        )
        response = await graphqlClient.request<TeamAggregateResponse>(query)
      }

      const teamsWithData: TeamComparisonData[] = []
      resolvedTeams.forEach(({ index, team, memberIds }) => {
        if (!team) return

        const wonCount = response[`t${index}_won`]?.aggregate?.count || 0
        const totalClosed = response[`t${index}_closed`]?.aggregate?.count || 0

        teamsWithData.push({
          id: team.id,
          name: team.name,
          leadName: findTeamLead(team.organizationalUnitEmployee),
          revenue: response[`t${index}_won`]?.aggregate?.sum?.estimatedAmount || 0,
          memberCount: memberIds.length,
          opportunitiesCount: response[`t${index}_total`]?.aggregate?.count || 0,
          wonOpportunitiesCount: wonCount,
          winRate: totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0,
          currencyCode: selectedCurrencyCode,
          color: TEAM_COLORS[index % TEAM_COLORS.length]
        })
      })

      const trendsArray: TeamRevenueTrendPoint[] = periods.map((period, periodIndex) => {
        const point: TeamRevenueTrendPoint = { month: period.label }
        resolvedTeams.forEach(({ teamId, index }) => {
          point[teamId] = response[`t${index}_p${periodIndex}`]?.aggregate?.sum?.estimatedAmount || 0
        })
        return point
      })

      setSelectedTeams(teamsWithData)
      setRevenueTrends(trendsArray)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team data')
    } finally {
      setIsLoadingTrends(false)
    }
  }, [
    selectedTeamIds,
    teamsData,
    graphqlClient,
    selectedCurrencyId,
    selectedCurrencyCode,
    selectedPipelineId,
    timeFilter
  ])

  // Select a team (max 4)
  const selectTeam = useCallback(
    (teamId: string) => {
      setSelectedTeamIds(prev => {
        if (prev.includes(teamId)) return prev
        if (prev.length >= maxTeams) return prev
        return [...prev, teamId]
      })
    },
    [maxTeams, setSelectedTeamIds]
  )

  // Deselect a team
  const deselectTeam = useCallback(
    (teamId: string) => {
      setSelectedTeamIds(prev => prev.filter(id => id !== teamId))
    },
    [setSelectedTeamIds]
  )

  // Initial fetch of available teams
  useEffect(() => {
    fetchAvailableTeams().catch(() => undefined)
  }, [fetchAvailableTeams])

  // Auto-select user's team on first load (only if no teams are selected yet)
  useEffect(() => {
    if (userTeamId && !hasAutoSelectedUserTeam && !isLoading && teamsData.length > 0 && selectedTeamIds.length === 0) {
      // Check if user's team exists in available teams
      const userTeamExists = teamsData.some(team => team.id === userTeamId)
      if (userTeamExists) {
        setSelectedTeamIds([userTeamId])
      }
      setHasAutoSelectedUserTeam(true)
    }
  }, [userTeamId, hasAutoSelectedUserTeam, isLoading, teamsData, selectedTeamIds.length, setSelectedTeamIds])

  // Fetch data when selected teams change or filters change
  useEffect(() => {
    fetchSelectedTeamsData().catch(() => undefined)
  }, [fetchSelectedTeamsData])

  return {
    availableTeams,
    selectedTeams,
    revenueTrends,
    isLoading,
    isLoadingTrends,
    error,
    selectTeam,
    deselectTeam,
    selectedTeamIds,
    refetch: () => {
      fetchAvailableTeams().catch(() => undefined)
    },
    teamsData
  }
}
