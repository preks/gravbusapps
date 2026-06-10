/** Small date helpers for the workplace week calendar (Monday-based weeks). */

export function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Monday 00:00 of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date)
  const weekday = day.getDay() // 0 Sun .. 6 Sat
  const daysSinceMonday = (weekday + 6) % 7
  return addDays(day, -daysSinceMonday)
}

/** The 7 days (Mon..Sun) of the week containing `date`. */
export function weekDays(date: Date): Date[] {
  const monday = startOfWeek(date)
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Stable per-day key for grouping/lookups. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}
