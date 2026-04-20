import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_PENDING_ABSENCES } from '../queries/queries'
import { employeeAttendanceCorrectionsForRangeQuery } from '@/business-apps/hr/core/apps/employee-record/queries/attendanceQueries'
import { PendingAbsenceRequest, PendingActionItem, TeamMember } from '../types/types'
import { toLocalDateKey } from '../utils/timeUtils'

interface UseTeamPendingActionsReturn {
  pendingAbsences: PendingAbsenceRequest[]
  pendingActions: PendingActionItem[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useTeamPendingActions = (
  context: BusinessAppContextProps,
  members: TeamMember[] = []
): UseTeamPendingActionsReturn => {
  const { accessToken, userInfo } = context
  const supervisorId = userInfo?.employeeDetails?.employeeId
  const graphqlClient = useGraphQLClient(accessToken)

  const [pendingAbsences, setPendingAbsences] = useState<PendingAbsenceRequest[]>([])
  const [pendingActions, setPendingActions] = useState<PendingActionItem[]>([])
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
      const today = new Date()
      const currentYear = today.getFullYear()
      const dateFrom = toLocalDateKey(new Date(currentYear - 1, 0, 1))
      const dateTo = toLocalDateKey(new Date(currentYear, 11, 31))
      const memberMap = new Map(members.map(member => [member.id, member]))

      const [absenceResult, correctionResults] = await Promise.all([
        graphqlClient.request<any>(GET_TEAM_PENDING_ABSENCES, { supervisorId }),
        Promise.all(
          members.map(member =>
            graphqlClient
              .request<any>(employeeAttendanceCorrectionsForRangeQuery, {
                employeeId: member.id,
                dateFrom,
                dateTo
              })
              .then(result => ({ employeeId: member.id, rows: result?.EmployeeAttendanceCorrectionRequest ?? [] }))
              .catch(() => ({ employeeId: member.id, rows: [] }))
          )
        )
      ])

      const absences = absenceResult?.EmployeeAbsence ?? []
      const mappedAbsences = absences.map((a: any) => ({
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

      const pendingCorrectionItems: PendingActionItem[] = correctionResults.flatMap(({ employeeId, rows }) => {
        const member = memberMap.get(employeeId)
        const terminalStatuses = new Set(['APPROVED_CORRECTION_REQUEST', 'REJECTED_CORRECTION_REQUEST'])

        return rows
          .filter((row: any) => !terminalStatuses.has(String(row?.status)))
          .map((row: any) => ({
            id: row.id,
            kind: 'time-correction' as const,
            status: String(row?.status ?? ''),
            createdAt: row.attendanceDate,
            attendanceDate: row.attendanceDate,
            employee: {
              id: employeeId,
              firstName: member?.firstName ?? '',
              lastName: member?.lastName ?? '',
              pictureThumbnail: member?.pictureThumbnail
            }
          }))
      })

      const absenceItems: PendingActionItem[] = mappedAbsences.map(absence => ({
        id: absence.id,
        kind: 'absence',
        status: absence.status,
        createdAt: absence.createdAt,
        startDate: absence.startDate,
        endDate: absence.endDate,
        effectiveDays: absence.effectiveDays,
        typeLabel: absence.type.value,
        employee: absence.employee
      }))

      setPendingAbsences(mappedAbsences)
      setPendingActions(
        [...absenceItems, ...pendingCorrectionItems].sort((left, right) => {
          return String(right.createdAt).localeCompare(String(left.createdAt))
        })
      )
    } catch (err) {
      console.error('Error fetching pending actions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch pending actions')
    } finally {
      setIsLoading(false)
    }
  }, [members, supervisorId, graphqlClient])

  useEffect(() => {
    if (accessToken && supervisorId) {
      fetchPending()
    }
  }, [accessToken, supervisorId, fetchPending])

  return { pendingAbsences, pendingActions, isLoading, error, refetch: fetchPending }
}
