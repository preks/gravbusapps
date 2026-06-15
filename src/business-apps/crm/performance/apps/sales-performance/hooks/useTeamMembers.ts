import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface GetTeamMembersResult {
  OrganizationalUnit: Array<{
    id: string
    name: string
    organizationalUnitEmployee: Array<{ employeeId: string }>
  }>
}

interface UseTeamMembersProps {
  accessToken: string
  teamId?: string | null
  enabled?: boolean
}

interface UseTeamMembersResult {
  teamName: string | null
  memberIds: string[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

const buildTeamMembersQuery = (): string => `
  query GetTeamMembers($teamId: uuid!) {
    OrganizationalUnit(where: { id: { _eq: $teamId }, isDeleted: { _eq: false } }) {
      id
      name
      organizationalUnitEmployee(where: { employee: { isDeleted: { _eq: false } } }) {
        employeeId
      }
    }
  }
`

/**
 * Fetches a single team's name + member IDs by teamId. Intended for the team
 * drill-down detail, so member data is only loaded when a specific team is opened
 * (the paginated teams list intentionally omits member IDs).
 *
 * @param accessToken - The access token for API authentication
 * @param teamId - The organizational unit (team) ID to load members for
 * @param enabled - When false, skip the fetch (e.g. no team selected)
 */
export const useTeamMembers = ({ accessToken, teamId, enabled = true }: UseTeamMembersProps): UseTeamMembersResult => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [teamName, setTeamName] = useState<string | null>(null)
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTeamMembers = useCallback(async () => {
    if (!enabled || !accessToken || !teamId) {
      setTeamName(null)
      setMemberIds([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await graphqlClient.request<GetTeamMembersResult>(buildTeamMembersQuery(), { teamId })
      const unit = response?.OrganizationalUnit?.[0]

      setTeamName(unit?.name ?? null)
      setMemberIds(unit?.organizationalUnitEmployee.map(member => member.employeeId) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team members')
      setTeamName(null)
      setMemberIds([])
    } finally {
      setIsLoading(false)
    }
  }, [enabled, accessToken, teamId, graphqlClient])

  useEffect(() => {
    fetchTeamMembers().catch(() => undefined)
  }, [fetchTeamMembers])

  return {
    teamName,
    memberIds,
    isLoading,
    error,
    refetch: () => {
      fetchTeamMembers().catch(() => undefined)
    }
  }
}
