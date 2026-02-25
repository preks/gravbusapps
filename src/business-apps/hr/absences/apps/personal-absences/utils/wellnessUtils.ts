import dayjs from 'dayjs'
import type { AbsenceRow } from '../types/personalAbsences'

export function computeLongestWorkStreak(yearAbsences: AbsenceRow[]): number {
  const sortedAbsences = [...yearAbsences].sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)))
  let longestWorkStreak = 0
  let lastEnd = dayjs().startOf('year')
  for (const a of sortedAbsences) {
    const gap = dayjs(a.startDate).diff(lastEnd, 'day')
    if (gap > longestWorkStreak) longestWorkStreak = gap
    const end = dayjs(a.endDate)
    if (end.isAfter(lastEnd)) lastEnd = end
  }
  const gapToToday = dayjs().diff(lastEnd, 'day')
  return gapToToday > longestWorkStreak ? gapToToday : longestWorkStreak
}
