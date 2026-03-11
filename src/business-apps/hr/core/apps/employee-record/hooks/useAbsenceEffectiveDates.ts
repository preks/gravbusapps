import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { GET_ABSENCE_DAILY_FACTS } from '../queries/queries'

interface UseAbsenceEffectiveDatesResult {
  effectiveDates: Set<string> | null
  allowWeekendPaintingInFallback: boolean
}

export function useAbsenceEffectiveDates(
  graphqlClient: { request: (query: string, variables: Record<string, unknown>) => Promise<any> } | null,
  employeeId: string | undefined,
  currentDate: dayjs.Dayjs
): UseAbsenceEffectiveDatesResult {
  const [effectiveDates, setEffectiveDates] = useState<Set<string> | null>(null)
  const [allowWeekendPaintingInFallback, setAllowWeekendPaintingInFallback] = useState(false)

  useEffect(() => {
    const loadDailyFacts = async () => {
      try {
        if (!graphqlClient || !employeeId) {
          setEffectiveDates(null)
          setAllowWeekendPaintingInFallback(false)
          return
        }

        const from = currentDate.startOf('month').format('YYYY-MM-DD')
        const to = currentDate.endOf('month').format('YYYY-MM-DD')
        const res: any = await graphqlClient.request(GET_ABSENCE_DAILY_FACTS, {
          employeeId,
          from,
          to
        })
        const facts: Array<{
          dayDate?: string
          day_date?: string
          dayFraction?: number | string | null
          day_fraction?: number | string | null
          signedDayFraction?: number | string | null
          signed_day_fraction?: number | string | null
        }> = res?.DailyAbsenceFactView || res?.daily_absence_fact_view || []

        const dates = new Set<string>()
        let hasDefinedFraction = false
        let hasWeekendEffective = false
        const perDayNet: Record<string, number> = {}

        facts.forEach(f => {
          const rawDate = (f.dayDate ?? f.day_date) as string | undefined
          const rawSigned = (f.signedDayFraction ?? f.signed_day_fraction) as number | string | null | undefined
          const rawFrac = (f.dayFraction ?? f.day_fraction) as number | string | null | undefined
          const value =
            rawSigned !== null && rawSigned !== undefined
              ? typeof rawSigned === 'number'
                ? rawSigned
                : Number(rawSigned)
              : rawFrac !== null && rawFrac !== undefined
                ? typeof rawFrac === 'number'
                  ? rawFrac
                  : Number(rawFrac)
                : null

          if (value === null || rawDate === undefined) return
          hasDefinedFraction = true
          perDayNet[rawDate] = (perDayNet[rawDate] || 0) + value
        })

        Object.entries(perDayNet).forEach(([date, sum]) => {
          if (sum > 0) {
            dates.add(date)
            const d = dayjs(date)
            if (d.day() === 0 || d.day() === 6) hasWeekendEffective = true
          }
        })

        if (facts.length === 0 || !hasDefinedFraction) {
          setEffectiveDates(null)
          setAllowWeekendPaintingInFallback(false)
          return
        }

        setEffectiveDates(dates)
        setAllowWeekendPaintingInFallback(hasWeekendEffective)
      } catch {
        setEffectiveDates(null)
        setAllowWeekendPaintingInFallback(false)
      }
    }

    loadDailyFacts()
  }, [graphqlClient, employeeId, currentDate])

  return { effectiveDates, allowWeekendPaintingInFallback }
}
