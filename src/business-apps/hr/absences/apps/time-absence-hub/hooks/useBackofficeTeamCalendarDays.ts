import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_CALENDAR_DAYS } from '../queries/CalendarViewQueries'
import { getAbsenceStatusColor, getAbsenceStatusType } from '@/business-apps/hr/absences/utils/absenceStatusUtils'

interface ViewRow {
  employeeId: string
  dayDate: string
  typeRef: string
  status: string
  employeeAbsenceId?: string
}

export interface CalendarEventItem {
  id: string
  itemId: string
  title: string
  startDate: string
  endDate: string
  color: string
  status: string
  type: string
  note?: string
}

export function useBackofficeTeamCalendarDays(
  accessToken: string | undefined,
  employeeIds: string[] | undefined,
  from?: string,
  to?: string,
  mapType?: (code: string) => { label?: string; color?: string }
) {
  const client = useGraphQLClient(accessToken)
  const [events, setEvents] = useState<CalendarEventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!client || !employeeIds || employeeIds.length === 0) return
    const fromDate = from || dayjs().startOf('month').format('YYYY-MM-DD')
    const toDate = to || dayjs().endOf('month').format('YYYY-MM-DD')

    setLoading(true)
    setError(null)

    client
      .request<any>(GET_TEAM_CALENDAR_DAYS, {
        employeeIds,
        from: fromDate,
        to: toDate
      })
      .then(res => {
        const rows: ViewRow[] = res?.EmployeeAbsenceCalendarView || []
        const mapped: CalendarEventItem[] = rows.map(r => {
          const label = mapType ? mapType(r.typeRef)?.label || r.typeRef : r.typeRef
          // Represent each day as an event from day start to day start (CalendarTimeline will render a marker)
          const start = dayjs(r.dayDate).startOf('day').toISOString()
          // Render as a full-day span to ensure pill coloring follows visualization patterns
          const end = dayjs(start).add(1, 'day').toISOString()
          const typeColor = mapType ? mapType(r.typeRef)?.color : undefined
          return {
            id: `${r.employeeId}-${r.dayDate}-${r.typeRef}-${r.status}-${r.employeeAbsenceId || 'x'}`,
            itemId: r.employeeId,
            title: label,
            startDate: start,
            endDate: end,
            color: typeColor || getAbsenceStatusColor(r.status),
            status: r.status,
            // Use the same semantic type strings as Manager calendar ('approved' | 'pending' | 'rejected' | 'cancelled')
            type: getAbsenceStatusType(r.status),
            note: label
          }
        })
        setEvents(mapped)
      })
      .catch(err => setError(err as Error))
      .finally(() => setLoading(false))
  }, [client, Array.isArray(employeeIds) ? employeeIds.join(',') : '', from, to, mapType])

  return useMemo(() => ({ events, loading, error }), [events, loading, error])
}
