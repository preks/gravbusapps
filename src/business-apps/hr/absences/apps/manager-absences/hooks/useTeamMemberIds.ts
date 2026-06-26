import { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_MEMBER_IDS } from '../queries/StatisticsQueries'

interface UseTeamMemberIdsReturn {
  teamMemberIds: string[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useTeamMemberIds = (context: BusinessAppContextProps): UseTeamMemberIdsReturn => {
  const { accessToken, userInfo } = context
  const supervisorId = userInfo?.employeeDetails?.employeeId
  const graphqlClient = useGraphQLClient(accessToken)

  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeamMemberIds = useCallback(async () => {
    if (!supervisorId || !graphqlClient) {
      setTeamMemberIds([])
      setError('Supervisor ID or GraphQL client not available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request(GET_TEAM_MEMBER_IDS, { supervisorId })
      const employees = result?.employees || []
      const ids: string[] = employees.map((employee: any) => employee?.id).filter(Boolean)

      setTeamMemberIds(ids)
    } catch (err) {
      console.error('Error fetching team member IDs:', err)
      setTeamMemberIds([])
      setError(err instanceof Error ? err.message : 'Failed to fetch team member IDs')
    } finally {
      setIsLoading(false)
    }
  }, [supervisorId, graphqlClient])

  useEffect(() => {
    if (accessToken && supervisorId) {
      fetchTeamMemberIds()
    }
  }, [accessToken, supervisorId, fetchTeamMemberIds])

  return {
    teamMemberIds,
    isLoading,
    error,
    refetch: fetchTeamMemberIds
  }
}
