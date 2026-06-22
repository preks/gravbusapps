import type { MemoryLensEntry } from './memoryLensModel'

/** Best-effort timestamp (ms) for an entry, preferring when-it-happened over when-saved. */
export const entryTime = (entry: MemoryLensEntry): number => {
  const iso = entry.occurredAt || entry.updatedAt
  if (!iso) return 0
  const ms = new Date(iso).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

/** Local-time day key (YYYY-MM-DD) so grouping matches the viewer's calendar. */
export const dayKey = (value: Date | number): string => {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export interface DayGroup {
  key: string
  timestamp: number
  label: string
  entries: MemoryLensEntry[]
}

const startOfDay = (ms: number): number => {
  const date = new Date(ms)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** Human day heading relative to today ("Today", "Yesterday", "Wed, Jun 11"). */
export const formatDayHeading = (
  timestamp: number,
  t: (key: string, args?: Record<string, unknown>) => string
): string => {
  const today = startOfDay(Date.now())
  const day = startOfDay(timestamp)
  const diffDays = Math.round((today - day) / 86_400_000)
  if (diffDays === 0) return t('sidebar-group-today')
  if (diffDays === 1) return t('sidebar-group-yesterday')
  const sameYear = new Date(timestamp).getFullYear() === new Date().getFullYear()
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric'
  })
}

export interface DayGroups {
  dated: DayGroup[]
  undated: MemoryLensEntry[]
}

/** Group entries by calendar day, newest day first; entries with no date go to `undated`. */
export const groupByDay = (
  entries: MemoryLensEntry[],
  t: (key: string, args?: Record<string, unknown>) => string
): DayGroups => {
  const buckets = new Map<string, DayGroup>()
  const undated: MemoryLensEntry[] = []

  for (const entry of entries) {
    const ms = entryTime(entry)
    if (ms <= 0) {
      undated.push(entry)
      continue
    }
    const key = dayKey(ms)
    const existing = buckets.get(key)
    if (existing) {
      existing.entries.push(entry)
    } else {
      buckets.set(key, { key, timestamp: startOfDay(ms), label: formatDayHeading(ms, t), entries: [entry] })
    }
  }

  const dated = [...buckets.values()].sort((a, b) => b.timestamp - a.timestamp)
  for (const group of dated) {
    group.entries.sort((a, b) => entryTime(b) - entryTime(a))
  }
  return { dated, undated }
}

export interface CalendarCell {
  key: string
  date: Date
  inMonth: boolean
  isToday: boolean
  count: number
}

/** Count of entries per local day key. */
export const countByDay = (entries: MemoryLensEntry[]): Map<string, number> => {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const ms = entryTime(entry)
    if (ms <= 0) continue
    const key = dayKey(ms)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/** Build a 6-week (Mon-first) grid for a given month, annotated with per-day counts. */
export const buildMonthGrid = (year: number, month: number, counts: Map<string, number>): CalendarCell[][] => {
  const firstOfMonth = new Date(year, month, 1)
  const offset = (firstOfMonth.getDay() + 6) % 7 // Monday = 0
  const gridStart = new Date(year, month, 1 - offset)
  const todayKey = dayKey(Date.now())

  const weeks: CalendarCell[][] = []
  for (let week = 0; week < 6; week += 1) {
    const cells: CalendarCell[] = []
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + week * 7 + weekday)
      const key = dayKey(date)
      cells.push({
        key,
        date,
        inMonth: date.getMonth() === month,
        isToday: key === todayKey,
        count: counts.get(key) ?? 0
      })
    }
    weeks.push(cells)
  }
  return weeks
}

/** ISO bounds covering an entire local month (for date-range fetching). */
export const monthRangeIso = (year: number, month: number): { dateFrom: string; dateTo: string } => {
  const start = new Date(year, month, 1, 0, 0, 0, 0)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { dateFrom: start.toISOString(), dateTo: end.toISOString() }
}

export const monthLabel = (year: number, month: number): string =>
  new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

export type FacetKind = 'topic' | 'entity'

export interface FacetIndex {
  items: Array<{ label: string; count: number }>
  byValue: Map<string, MemoryLensEntry[]>
}

/** Index entries by tag (topic) or entity, with counts, sorted by frequency then name. */
export const facetIndex = (entries: MemoryLensEntry[], kind: FacetKind): FacetIndex => {
  const byValue = new Map<string, MemoryLensEntry[]>()
  for (const entry of entries) {
    const values = kind === 'topic' ? (entry.tags ?? []) : (entry.entities ?? [])
    const seen = new Set<string>()
    for (const raw of values) {
      const label = raw.trim()
      if (!label || seen.has(label)) continue
      seen.add(label)
      const bucket = byValue.get(label)
      if (bucket) {
        bucket.push(entry)
      } else {
        byValue.set(label, [entry])
      }
    }
  }
  const items = [...byValue.entries()]
    .map(([label, list]) => ({ label, count: list.length }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  return { items, byValue }
}
