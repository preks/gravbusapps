import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { GET_TEAM_MEMBERS_BY_MANAGER } from '../../../queries/expenseRequests'
import type { TeamEmployee } from './expenseCalendarTypes'

export function useTeamMembersByManager(params: { managerId: string; accessToken?: string | null }) {
  const { managerId, accessToken } = params
  const graphqlClient = useGraphQLClient(accessToken || '')

  const [allTeamMembers, setAllTeamMembers] = useState<TeamEmployee[]>([])
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false)
  const [teamMembersError, setTeamMembersError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!managerId || !accessToken) return

      setLoadingTeamMembers(true)
      setTeamMembersError(null)

      try {
        const result = await graphqlClient.request<{ Employee: TeamEmployee[] }>(GET_TEAM_MEMBERS_BY_MANAGER, {
          managerId
        })
        setAllTeamMembers(result.Employee || [])
      } catch (err) {
        console.error('Error fetching team members:', err)
        setTeamMembersError(getTranslationFromI18nKeyAndLabel('lowcoder:common.error', 'Error loading team members'))
      } finally {
        setLoadingTeamMembers(false)
      }
    }

    fetchTeamMembers()
  }, [managerId, accessToken, graphqlClient])

  return { allTeamMembers, loadingTeamMembers, teamMembersError }
}
