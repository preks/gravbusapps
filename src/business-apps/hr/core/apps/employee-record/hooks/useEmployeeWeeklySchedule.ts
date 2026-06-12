import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_WEEKLY_SCHEDULE } from '../queries/queries'
import { getActiveWorkingHours } from '@/business-apps/hr/core/utils/workingHoursUtils'

type WeeklyWorkingHours = {
  activeFrom?: string | null
  activeTo?: string | null
  sundayHours?: number | null
  mondayHours?: number | null
  tuesdayHours?: number | null
  wednesdayHours?: number | null
  thursdayHours?: number | null
  fridayHours?: number | null
  saturdayHours?: number | null
}

/**
 * Compute non-working dates for the visible month from the employee's weekly schedule.
 * Returns a Set of 'YYYY-MM-DD' strings where planned hours <= 0.
 */
export function useEmployeeWeeklySchedule(
  accessToken: string | undefined,
  employeeId: string | undefined,
  currentDate: dayjs.Dayjs
): Set<string> | null {
  const client = useGraphQLClient(accessToken)
  const [nonWorkingDates, setNonWorkingDates] = useState<Set<string> | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        if (!client || !employeeId) {
          setNonWorkingDates(null)
          return
        }
        const res: any = await client.request(GET_EMPLOYEE_WEEKLY_SCHEDULE as any, { employeeId })
        const monthStart = currentDate.startOf('month')
        const wh = getActiveWorkingHours<WeeklyWorkingHours>(res?.Employee?.[0]?.workingHours, monthStart.toDate())
        if (!wh) {
          setNonWorkingDates(null)
          return
        }
        const hoursByDow: number[] = [
          Number(wh.sundayHours ?? 0),
          Number(wh.mondayHours ?? 0),
          Number(wh.tuesdayHours ?? 0),
          Number(wh.wednesdayHours ?? 0),
          Number(wh.thursdayHours ?? 0),
          Number(wh.fridayHours ?? 0),
          Number(wh.saturdayHours ?? 0)
        ]
        const start = monthStart
        const end = currentDate.endOf('month')
        const set = new Set<string>()
        let d = start
        while (d.isBefore(end) || d.isSame(end, 'day')) {
          const dow = d.day() // 0..6 (Sun..Sat)
          const hrs = hoursByDow[dow]
          if (!hrs || Number.isNaN(hrs) || hrs <= 0) {
            set.add(d.format('YYYY-MM-DD'))
          }
          d = d.add(1, 'day')
        }
        setNonWorkingDates(set)
      } catch {
        setNonWorkingDates(null)
      }
    }
    run()
  }, [client, employeeId, currentDate])

  return nonWorkingDates
}
