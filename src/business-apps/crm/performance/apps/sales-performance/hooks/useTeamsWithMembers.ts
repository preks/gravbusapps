import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { buildTeamsWithMembersQuery, type TeamWithMembers } from './teamsWithMembers'

interface UseTeamsWithMembersResult {
  teams: TeamWithMembers[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Fetches teams (with their Sales Associate members) for the active structure exactly once.
 * Shared by the Top Teams and Teams Needing Attention cards so the GetTeamsWithMembers
 * query is only sent a single time.
 *
 * @param accessToken - The access token for API authentication
 */
export const useTeamsWithMembers = (accessToken: string): UseTeamsWithMembersResult => {
  const [teams, setTeams] = useState<TeamWithMembers[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const structureId = getCurrentActiveStructureId()

  const fetchTeams = useCallback(async () => {
    if (!accessToken || !structureId) {
      setError('Access token and structure ID are required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<{
        OrganizationalUnit: TeamWithMembers[]
      }>(buildTeamsWithMembersQuery(), { structureId })

      setTeams(result.OrganizationalUnit || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teams')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient, structureId])

  useEffect(() => {
    fetchTeams().catch(() => undefined)
  }, [fetchTeams])

  return {
    teams,
    isLoading,
    error,
    refetch: () => {
      fetchTeams().catch(() => undefined)
    }
  }
}
