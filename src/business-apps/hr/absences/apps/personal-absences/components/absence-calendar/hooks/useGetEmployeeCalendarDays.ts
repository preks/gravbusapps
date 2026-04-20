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

// Query EmployeeAbsence directly so that APPROVED absences are always included.
// EmployeeAbsenceCalendarView only exposes non-approved (pending/in-approval) rows,
// which caused approved absences to be invisible in the calendar.
const GET_EMPLOYEE_ABSENCES_FOR_MONTH = `
  query CalendarAbsences($employeeId: uuid!, $from: date!, $to: date!) {
    EmployeeAbsence(
      where: {
        employeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
        startDate: { _lte: $to }
        endDate: { _gte: $from }
        status: { _nin: ["CANCELLED", "REJECTED"] }
      }
      orderBy: [{ startDate: asc }]
    ) {
      id
      startDate
      endDate
      status
      description
      type {
        id
        value
        objectValue
      }
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
      .request<any>(GET_EMPLOYEE_ABSENCES_FOR_MONTH, {
        employeeId,
        from: firstDay,
        to: lastDay
      })
      .then(data => {
        const rows = (data as any)?.EmployeeAbsence || []
        const mapped: CalendarLikeAbsence[] = rows.map((r: any) => ({
          id: r.id,
          startDate: r.startDate,
          endDate: r.endDate,
          status: r.status || undefined,
          description: r.description || '',
          type: {
            value: r.type?.value || r.type?.id || '',
            objectValue: r.type?.objectValue
          }
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
