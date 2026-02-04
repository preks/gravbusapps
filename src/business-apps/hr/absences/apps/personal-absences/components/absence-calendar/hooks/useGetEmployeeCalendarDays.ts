import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface UseGetEmployeeCalendarDaysProps {
  employeeId?: string
  accessToken: string
  month?: dayjs.Dayjs
}

export interface CalendarDayRow {
  day_date: string
  type_ref: string
  status?: string | null
  employee_absence_id?: string | null
}

export interface CalendarLikeAbsence {
  id: string
  description?: string
  startDate: string
  endDate: string
  status?: string
  type: {
    value: string
    objectValue?: any
  }
}

const GET_EMPLOYEE_CALENDAR_DAYS = `
  query CalendarDays($employeeId: uuid!, $from: date!, $to: date!) {
    EmployeeAbsenceCalendarView(
      where: {
        employeeId: { _eq: $employeeId }
        dayDate: { _gte: $from, _lte: $to }
      }
      orderBy: [{ dayDate: asc }, { typeRef: asc }]
    ) {
      dayDate
      typeRef
      status
      employeeAbsenceId
    }
  }
`

export function useGetEmployeeCalendarDays({ employeeId, accessToken, month }: UseGetEmployeeCalendarDaysProps) {
  const client = useGraphQLClient(accessToken)
  const [absences, setAbsences] = useState<CalendarLikeAbsence[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!employeeId || !client) return
    setLoading(true)
    setError(null)

    const firstDay = (month || dayjs()).startOf('month').format('YYYY-MM-DD')
    const lastDay = (month || dayjs()).endOf('month').format('YYYY-MM-DD')

    client
      .request<{ employee_absence_calendar_view: CalendarDayRow[] }>(GET_EMPLOYEE_CALENDAR_DAYS, {
        employeeId,
        from: firstDay,
        to: lastDay
      })
      .then(data => {
        const rows = (data as any)?.EmployeeAbsenceCalendarView || (data as any)?.employee_absence_calendar_view || []
        const mapped: CalendarLikeAbsence[] = rows.map((r: any, idx: number) => ({
          id: `${r.employeeAbsenceId || 'none'}-${r.dayDate}-${idx}`,
          startDate: r.dayDate,
          endDate: r.dayDate,
          status: r.status || undefined,
          type: { value: r.typeRef }
        }))
        setAbsences(mapped)
      })
      .catch(err => {
        setError(err as Error)
        setAbsences([])
      })
      .finally(() => setLoading(false))
  }, [client, employeeId, month])

  return { absences, loading, error }
}
