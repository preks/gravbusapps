import React, { useEffect, useMemo, useState } from 'react'
import { XIcon } from '@phosphor-icons/react'
import type { MemoryNamespace } from '../settings/agentSettings.types'
import type { MemoryLensEntry } from './memoryLensModel'
import { buildMonthGrid, countByDay, dayKey, entryTime, groupByDay, monthRangeIso } from './memoryLensDimensions'
import { MemoryMiniCalendar } from './MemoryMiniCalendar'
import { MemoryDiaryRow } from './MemoryDiaryRow'
import { MemoryDetailPanel } from './MemoryDetailPanel'

interface MemoryDiaryProps {
  fetchRange: (dateFrom: string, dateTo: string) => Promise<MemoryLensEntry[]>
  accessToken: string
  onDelete: (key: string, namespace: MemoryNamespace) => void
}

const entryId = (entry: MemoryLensEntry): string => `${entry.namespace}-${entry.key}`

const DayHeading: React.FC<{ label: string; count: number }> = ({ label, count }) => (
  <div className="gba:flex gba:items-baseline gba:gap-2 gba:px-3 gba:pb-0.5 gba:pt-1">
    <span className="gba:text-[11px] gba:font-semibold gba:text-foreground">{label}</span>
    <span className="gba:text-[10px] gba:text-muted-foreground/50">{count}</span>
  </div>
)

export const MemoryDiary: React.FC<MemoryDiaryProps> = ({ fetchRange, accessToken, onDelete }) => {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [monthEntries, setMonthEntries] = useState<MemoryLensEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setSelectedDay(null)
    const { dateFrom, dateTo } = monthRangeIso(year, month)
    fetchRange(dateFrom, dateTo)
      .then(result => {
        if (!active) return
        setMonthEntries(result)
        const newest = [...result].sort((a, b) => entryTime(b) - entryTime(a))[0]
        setSelectedId(newest ? entryId(newest) : null)
      })
      .catch(() => {
        if (!active) return
        setMonthEntries([])
        setSelectedId(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [year, month, fetchRange])

  const counts = useMemo(() => countByDay(monthEntries), [monthEntries])
  const weeks = useMemo(() => buildMonthGrid(year, month, counts), [year, month, counts])

  const visible = useMemo(
    () =>
      selectedDay
        ? monthEntries.filter(entry => dayKey(new Date(entry.occurredAt || entry.updatedAt || 0)) === selectedDay)
        : monthEntries,
    [monthEntries, selectedDay]
  )
  const { dated, undated } = useMemo(() => groupByDay(visible), [visible])
  const selectedEntry = useMemo(
    () => monthEntries.find(entry => entryId(entry) === selectedId) ?? null,
    [monthEntries, selectedId]
  )

  const goPrev = () => {
    if (month === 0) {
      setMonth(11)
      setYear(value => value - 1)
    } else {
      setMonth(value => value - 1)
    }
  }
  const goNext = () => {
    if (month === 11) {
      setMonth(0)
      setYear(value => value + 1)
    } else {
      setMonth(value => value + 1)
    }
  }

  const handleDelete = (key: string, namespace: MemoryNamespace) => {
    setMonthEntries(prev => prev.filter(entry => !(entry.key === key && entry.namespace === namespace)))
    if (selectedId === `${namespace}-${key}`) setSelectedId(null)
    onDelete(key, namespace)
  }

  const selectedDayLabel = selectedDay
    ? new Date(`${selectedDay}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })
    : null
  const isEmpty = !loading && dated.length === 0 && undated.length === 0

  return (
    <section className="gba:flex gba:flex-col gba:gap-4 gba:md:flex-row" data-testid="memory-lens-diary">
      <div className="gba:order-2 gba:min-w-0 gba:flex-1 gba:md:order-1">
        <div className="gba:mb-2 gba:flex gba:items-center gba:gap-2">
          <h2 className="gba:text-[13px] gba:font-semibold gba:text-foreground">
            {selectedDayLabel ?? 'All of this month'}
          </h2>
          <span className="gba:text-[11px] gba:text-muted-foreground/60">
            {visible.length} {visible.length === 1 ? 'memory' : 'memories'}
          </span>
          {selectedDay && (
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="gba:ml-auto gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground gba:transition-colors"
              data-testid="memory-lens-diary-clear-day"
            >
              <XIcon className="gba:h-3 gba:w-3" /> Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="gba:space-y-1.5">
            {['a', 'b', 'c', 'd', 'e'].map(token => (
              <div key={token} className="gba:h-12 gba:rounded-lg gba:bg-muted/30 gba:animate-pulse" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-8 gba:text-center">
            <p className="gba:text-sm gba:text-muted-foreground">
              No memories recorded {selectedDay ? 'on this day' : 'this month'}.
            </p>
          </div>
        ) : (
          <div className="gba:space-y-3">
            {dated.map(group => (
              <div key={group.key} className="gba:space-y-0.5">
                <DayHeading label={group.label} count={group.entries.length} />
                {group.entries.map(entry => (
                  <MemoryDiaryRow
                    key={entryId(entry)}
                    entry={entry}
                    active={entryId(entry) === selectedId}
                    onSelect={() => setSelectedId(entryId(entry))}
                  />
                ))}
              </div>
            ))}
            {undated.length > 0 && (
              <div className="gba:space-y-0.5">
                <DayHeading label="No date" count={undated.length} />
                {undated.map(entry => (
                  <MemoryDiaryRow
                    key={entryId(entry)}
                    entry={entry}
                    active={entryId(entry) === selectedId}
                    onSelect={() => setSelectedId(entryId(entry))}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <aside className="gba:order-1 gba:w-full gba:shrink-0 gba:space-y-3 gba:md:order-2 gba:md:w-72 gba:md:self-start gba:md:sticky gba:md:top-0">
        <MemoryMiniCalendar
          year={year}
          month={month}
          weeks={weeks}
          selectedDay={selectedDay}
          loading={loading}
          onPrev={goPrev}
          onNext={goNext}
          onSelectDay={setSelectedDay}
        />
        <MemoryDetailPanel entry={selectedEntry} accessToken={accessToken} onDelete={handleDelete} />
      </aside>
    </section>
  )
}
