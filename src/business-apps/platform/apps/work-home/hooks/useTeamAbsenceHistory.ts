import { useState, useEffect, useRef, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_ABSENCES } from '@/business-apps/hr/absences/apps/personal-absences/queries/graphql'
import { getAbsenceStatusLabel } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { getCatalogValue, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type { TeamMember } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useTeamAvailability'

interface RawAbsenceRecord {
  id: string
  type?: { objectValue?: { color?: string }; [key: string]: unknown }
  startDate: string
  endDate: string
  status?: string
  effectiveDays?: number
  workingDays?: number
  calendarDays?: number
  description?: string
}

export interface AbsenceHistoryRow {
  id: string
  employeeName: string
  employeeId: string
  type: string
  typeColor: string
  startDate: string
  endDate: string
  status: string
  originalStatus: string
  workingDays: number
  description: string
}

export interface AbsentMemberWithHistory {
  member: TeamMember
  absences: AbsenceHistoryRow[]
}

interface UseTeamAbsenceHistoryResult {
  data: AbsentMemberWithHistory[]
  isLoading: boolean
  error: string | null
}

type GraphQLClient = ReturnType<typeof useGraphQLClient>

function mapAbsenceRecord(member: TeamMember, absence: RawAbsenceRecord): AbsenceHistoryRow {
  return {
    id: absence.id,
    employeeName: member.fullName,
    employeeId: member.id,
    type: absence.type ? getCatalogValue(absence.type) || '' : '',
    typeColor: absence.type?.objectValue?.color || '6366f1',
    startDate: absence.startDate,
    endDate: absence.endDate,
    status: getAbsenceStatusLabel(absence.status || ''),
    originalStatus: absence.status || '',
    workingDays: absence.effectiveDays ?? absence.workingDays ?? absence.calendarDays ?? 0,
    description: absence.description || ''
  }
}

async function fetchMemberAbsenceHistory(
  client: GraphQLClient,
  member: TeamMember,
  activeUserLocale: string
): Promise<AbsentMemberWithHistory> {
  const res = await client.request(GET_EMPLOYEE_ABSENCES, {
    where: { employee: { id: { _eq: member.id } }, isDeleted: { _eq: false } },
    offset: 0,
    limit: 20,
    orderBy: [{ startDate: 'DESC' }],
    activeUserLocale
  })

  const absences: AbsenceHistoryRow[] = (res?.EmployeeAbsence || []).map((absence: RawAbsenceRecord) =>
    mapAbsenceRecord(member, absence)
  )

  return { member, absences }
}

function shouldApplyHistoryResponse(cancelled: boolean, currentRequestId: number, latestRequestId: number) {
  return !cancelled && currentRequestId === latestRequestId
}

export function useTeamAbsenceHistory(
  accessToken: string,
  absentMembers: TeamMember[],
  isActive: boolean
): UseTeamAbsenceHistoryResult {
  const [data, setData] = useState<AbsentMemberWithHistory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const client = useGraphQLClient(accessToken)
  const requestIdRef = useRef(0)

  const memberIds = useMemo(() => absentMembers.map(m => m.id).join(','), [absentMembers])

  useEffect(() => {
    if (!isActive || absentMembers.length === 0 || !accessToken) {
      setData([])
      return
    }

    const currentRequestId = ++requestIdRef.current
    let cancelled = false

    const fetchHistory = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const activeUserLocale = getCurrentActiveUserLocale()
        const results = await Promise.all(
          absentMembers.map(member => fetchMemberAbsenceHistory(client, member, activeUserLocale))
        )

        if (shouldApplyHistoryResponse(cancelled, currentRequestId, requestIdRef.current)) {
          setData(results)
        }
      } catch {
        if (shouldApplyHistoryResponse(cancelled, currentRequestId, requestIdRef.current)) {
          setError('Failed to load absence history')
        }
      } finally {
        if (shouldApplyHistoryResponse(cancelled, currentRequestId, requestIdRef.current)) {
          setIsLoading(false)
        }
      }
    }

    fetchHistory()

    return () => {
      cancelled = true
    }
  }, [accessToken, memberIds, isActive, client])

  return { data, isLoading, error }
}
