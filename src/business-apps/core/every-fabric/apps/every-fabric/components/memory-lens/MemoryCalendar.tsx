import React, { useEffect, useMemo, useState } from 'react'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import type { MemoryNamespace } from '../settings/agentSettings.types'
import type { MemoryLensEntry } from './memoryLensModel'
import { buildMonthGrid, countByDay, dayKey, monthLabel, monthRangeIso } from './memoryLensDimensions'
import { MemoryEntryCard } from './MemoryEntryCard'

interface MemoryCalendarProps {
  fetchRange: (dateFrom: string, dateTo: string) => Promise<MemoryLensEntry[]>
  onDelete: (key: string, namespace: MemoryNamespace) => void
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const intensityClass = (count: number, selected: boolean, inMonth: boolean): string => {
  if (selected) return 'gba:bg-foreground gba:text-background'
  if (!inMonth) return 'gba:text-muted-foreground/40'
  if (count === 0) return 'gba:text-foreground'
  if (count < 3) return 'gba:bg-muted/60 gba:text-foreground'
  return 'gba:bg-foreground/15 gba:text-foreground gba:font-semibold'
}

export const MemoryCalendar: React.FC<MemoryCalendarProps> = ({ fetchRange, onDelete }) => {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [entries, setEntries] = useState<MemoryLensEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setSelectedDay(null)
    const { dateFrom, dateTo } = monthRangeIso(year, month)
    fetchRange(dateFrom, dateTo)
      .then(result => {
        if (active) setEntries(result)
      })
      .catch(() => {
        if (active) setEntries([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [year, month, fetchRange])

  const counts = useMemo(() => countByDay(entries), [entries])
  const weeks = useMemo(() => buildMonthGrid(year, month, counts), [year, month, counts])
  const dayEntries = useMemo(
    () =>
      selectedDay
        ? entries.filter(entry => dayKey(new Date(entry.occurredAt || entry.updatedAt || 0)) === selectedDay)
        : [],
    [entries, selectedDay]
  )

  const goPrev = () => {
    if (month === 0) {
      setMonth(11)
      setYear(y => y - 1)
    } else {
      setMonth(m => m - 1)
    }
  }
  const goNext = () => {
    if (month === 11) {
      setMonth(0)
      setYear(y => y + 1)
    } else {
      setMonth(m => m + 1)
    }
  }

  return (
    <section className="gba:space-y-4" data-testid="memory-lens-calendar">
      <div className="gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
          <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">{monthLabel(year, month)}</h2>
          <div className="gba:flex gba:items-center gba:gap-1">
            <button
              type="button"
              onClick={goPrev}
              className="gba:flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded-full gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground gba:transition-colors"
              aria-label="Previous month"
              data-testid="memory-lens-calendar-prev"
            >
              <CaretLeftIcon className="gba:h-4 gba:w-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="gba:flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded-full gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground gba:transition-colors"
              aria-label="Next month"
              data-testid="memory-lens-calendar-next"
            >
              <CaretRightIcon className="gba:h-4 gba:w-4" />
            </button>
          </div>
        </div>

        <div className="gba:mt-3 gba:grid gba:grid-cols-7 gba:gap-1">
          {WEEKDAYS.map(weekday => (
            <div
              key={weekday}
              className="gba:py-1 gba:text-center gba:text-[10px] gba:font-medium gba:text-muted-foreground/60"
            >
              {weekday}
            </div>
          ))}
          {weeks.flat().map(cell => (
            <button
              key={cell.key}
              type="button"
              disabled={cell.count === 0}
              onClick={() => setSelectedDay(cell.key)}
              className={`gba:relative gba:flex gba:aspect-square gba:flex-col gba:items-center gba:justify-center gba:rounded-lg gba:text-[12px] gba:transition-colors disabled:gba:cursor-default ${intensityClass(
                cell.count,
                cell.key === selectedDay,
                cell.inMonth
              )} ${cell.isToday && cell.key !== selectedDay ? 'gba:ring-1 gba:ring-inset gba:ring-border' : ''}`}
              data-testid={`memory-lens-calendar-day-${cell.key}`}
            >
              <span>{cell.date.getDate()}</span>
              {cell.count > 0 && cell.key !== selectedDay && (
                <span className="gba:mt-0.5 gba:h-1 gba:w-1 gba:rounded-full gba:bg-foreground/50" />
              )}
            </button>
          ))}
        </div>

        {loading && (
          <p className="gba:mt-3 gba:text-center gba:text-[11px] gba:text-muted-foreground">Loading month…</p>
        )}
      </div>

      {selectedDay && (
        <div className="gba:space-y-2" data-testid="memory-lens-calendar-day-detail">
          <h3 className="gba:text-[13px] gba:font-semibold gba:text-foreground">
            {new Date(`${selectedDay}T00:00:00`).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </h3>
          {dayEntries.length === 0 ? (
            <p className="gba:py-4 gba:text-center gba:text-xs gba:text-muted-foreground">Nothing recorded this day.</p>
          ) : (
            dayEntries.map(entry => (
              <MemoryEntryCard
                key={`${entry.namespace}-${entry.key}`}
                entry={entry}
                showDate={false}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}
    </section>
  )
}
