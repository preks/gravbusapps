import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_PENDING_ABSENCES } from '../queries/queries'
import { PendingAbsenceRequest } from '../types/types'

interface UseTeamPendingActionsReturn {
  pendingAbsences: PendingAbsenceRequest[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useTeamPendingActions = (context: BusinessAppContextProps): UseTeamPendingActionsReturn => {
  const { accessToken, userInfo } = context
  const supervisorId = userInfo?.employeeDetails?.employeeId
  const graphqlClient = useGraphQLClient(accessToken)

  const [pendingAbsences, setPendingAbsences] = useState<PendingAbsenceRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    if (!supervisorId || !graphqlClient) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<any>(GET_TEAM_PENDING_ABSENCES, { supervisorId })
      const absences = result?.EmployeeAbsence ?? []

      setPendingAbsences(
        absences.map((a: any) => ({
          id: a.id,
          startDate: a.startDate,
          endDate: a.endDate,
          effectiveDays: a.effectiveDays,
          status: a.status,
          createdAt: a.createdAt,
          type: {
            id: a.type?.id ?? '',
            value: a.type?.value ?? '',
            parentEntryId: a.type?.parentEntryId ?? ''
          },
          employee: {
            id: a.employee?.id ?? '',
            firstName: a.employee?.firstName ?? '',
            lastName: a.employee?.lastName ?? '',
            pictureThumbnail: a.employee?.pictureThumbnail
          }
        }))
      )
    } catch (err) {
      console.error('Error fetching pending actions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch pending actions')
    } finally {
      setIsLoading(false)
    }
  }, [supervisorId, graphqlClient])

  useEffect(() => {
    if (accessToken && supervisorId) {
      fetchPending()
    }
  }, [accessToken, supervisorId, fetchPending])

  return { pendingAbsences, isLoading, error, refetch: fetchPending }
}
