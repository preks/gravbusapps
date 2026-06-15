import { useMemo } from 'react'
import { useTeamsData, type TeamsSortColumn } from './useTeamsData'
import { useTeamPerformanceData } from './useTeamPerformanceData'
import type { TeamListItem } from '../types/teamTypes'

export type TeamsListSortColumn = TeamsSortColumn

export interface UseTeamsListDataProps {
  accessToken: string
  currencyCode?: string
  limit: number
  offset: number
  search?: string
  sortColumn: TeamsListSortColumn
  sortDesc: boolean
}

export interface UseTeamsListDataResult {
  teams: TeamListItem[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Server-side paginated Team Insights list.
 *
 * The DB sorts + paginates a single page (by name or member count) and revenue
 * is computed only for those visible rows. Total Sales is display-only.
 */
export function useTeamsListData({
  accessToken,
  currencyCode = 'EUR',
  limit,
  offset,
  search,
  sortColumn,
  sortDesc
}: UseTeamsListDataProps): UseTeamsListDataResult {
  const {
    teams: rawTeams,
    totalCount,
    isLoading: teamsLoading,
    error: teamsError,
    refetch: refetchTeams
  } = useTeamsData({
    accessToken,
    limit,
    offset,
    search,
    sortColumn,
    sortDesc
  })

  const teamsWithMembers = useMemo(() => rawTeams.filter(team => team.memberIds.length > 0), [rawTeams])

  const {
    teamsData: performanceData,
    isLoading: performanceLoading,
    error: performanceError,
    refetch: refetchPerformance
  } = useTeamPerformanceData({
    accessToken,
    teams: teamsWithMembers,
    currencyCode
  })

  const teams = useMemo<TeamListItem[]>(
    () =>
      rawTeams.map(team => {
        const performance = performanceData.find(item => item.teamId === team.id)

        return {
          id: team.id,
          name: team.name,
          memberCount: team.memberCount,
          totalSales: performance?.totalRevenue ?? 0,
          currencyCode: performance?.currencyCode ?? currencyCode
        }
      }),
    [rawTeams, performanceData, currencyCode]
  )

  const refetch = () => {
    refetchTeams()
    refetchPerformance()
  }

  return {
    teams,
    totalCount,
    isLoading: teamsLoading || performanceLoading,
    error: teamsError || performanceError,
    refetch
  }
}
