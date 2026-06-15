import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { TeamInfo } from '../types/teamTypes'

interface OrganizationalUnitResponse {
  id: string
  name: string
  code: string
  type: string
  description: string | null
  organizationalUnitEmployeeAggregate: {
    aggregate: {
      count: number
    }
  }
  organizationalUnitEmployee: Array<{ employeeId: string }>
}

interface GetTeamsDataResult {
  OrganizationalUnit: OrganizationalUnitResponse[]
  OrganizationalUnitAggregate: {
    aggregate: {
      count: number
    }
  }
}

const DEFAULT_LIMIT = 20

export type TeamsSortColumn = 'name' | 'memberCount'

export interface UseTeamsDataProps {
  accessToken: string
  structureId?: string // Optional - will auto-detect from window if not provided
  limit?: number // Page size (default 20)
  offset?: number // Page offset (default 0)
  search?: string // Case-insensitive name filter
  sortColumn?: TeamsSortColumn // DB-sortable column (default 'name')
  sortDesc?: boolean // Sort direction (default false = ASC)
  enabled?: boolean // When false, skip the fetch
}

export interface UseTeamsDataResult {
  teams: TeamInfo[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

const buildOrderByClause = (sortColumn: TeamsSortColumn, sortDesc: boolean): string => {
  const direction = sortDesc ? 'DESC' : 'ASC'

  if (sortColumn === 'memberCount') {
    return `{ organizationalUnitEmployeeAggregate: { count: ${direction} } }`
  }

  return `{ name: ${direction} }`
}

/**
 * Paginated teams list from the OrganizationalUnit table.
 *
 * Returns one page of teams (name + member count + member IDs for that page).
 * Member IDs are included only for the current page so callers can compute
 * per-team revenue for the visible rows without fetching every team's members.
 * Sorting/paginating/searching all happen server-side.
 */
export const useTeamsData = ({
  accessToken,
  structureId: propStructureId,
  limit = DEFAULT_LIMIT,
  offset = 0,
  search,
  sortColumn = 'name',
  sortDesc = false,
  enabled = true
}: UseTeamsDataProps): UseTeamsDataResult => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get structure ID from prop or window context
  const structureId = propStructureId || getCurrentActiveStructureId()

  const fetchTeams = useCallback(async () => {
    if (!enabled || !accessToken || !structureId) {
      setTeams([])
      setTotalCount(0)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const orderByClause = buildOrderByClause(sortColumn, sortDesc)
      const trimmedSearch = search?.trim() ?? ''
      const searchPattern = trimmedSearch ? `%${trimmedSearch}%` : '%'

      const query = `
        query GetTeams($structureId: uuid!, $limit: Int!, $offset: Int!, $search: String!) {
          OrganizationalUnit(
            where: {
              isDeleted: { _eq: false },
              structureId: { _eq: $structureId },
              type: { _in: ["TEAM", "DEPARTMENT", "UNIT"] },
              name: { _ilike: $search }
            }
            orderBy: ${orderByClause}
            limit: $limit
            offset: $offset
          ) {
            id
            name
            code
            type
            description

            organizationalUnitEmployeeAggregate {
              aggregate {
                count
              }
            }

            # Member IDs for the current page only, used to compute page revenue.
            organizationalUnitEmployee(where: { employee: { isDeleted: { _eq: false } } }) {
              employeeId
            }
          }

          # Total matching teams, for pagination controls
          OrganizationalUnitAggregate(
            where: {
              isDeleted: { _eq: false },
              structureId: { _eq: $structureId },
              type: { _in: ["TEAM", "DEPARTMENT", "UNIT"] },
              name: { _ilike: $search }
            }
          ) {
            aggregate {
              count
            }
          }
        }
      `

      const response = await graphqlClient.request<GetTeamsDataResult>(query, {
        structureId,
        limit,
        offset,
        search: searchPattern
      })

      if (!response?.OrganizationalUnit) {
        throw new Error('No teams data received from server')
      }

      const teamsData: TeamInfo[] = response.OrganizationalUnit.map(unit => ({
        id: unit.id,
        name: unit.name,
        code: unit.code,
        type: unit.type,
        description: unit.description || '',
        memberCount: unit.organizationalUnitEmployeeAggregate?.aggregate?.count ?? 0,
        memberIds: unit.organizationalUnitEmployee?.map(member => member.employeeId) ?? []
      }))

      setTeams(teamsData)
      setTotalCount(response.OrganizationalUnitAggregate?.aggregate?.count ?? teamsData.length)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch teams data'
      setError(errorMessage)
      setTeams([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, accessToken, structureId, graphqlClient, limit, offset, search, sortColumn, sortDesc])

  useEffect(() => {
    fetchTeams().catch(() => undefined)
  }, [fetchTeams])

  return {
    teams,
    totalCount,
    isLoading,
    error,
    refetch: () => {
      fetchTeams().catch(() => undefined)
    }
  }
}
