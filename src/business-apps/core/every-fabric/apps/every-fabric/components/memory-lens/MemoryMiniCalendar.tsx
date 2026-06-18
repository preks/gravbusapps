import React from 'react'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { monthLabel, type CalendarCell } from './memoryLensDimensions'

interface MemoryMiniCalendarProps {
  year: number
  month: number
  weeks: CalendarCell[][]
  selectedDay: string | null
  loading?: boolean
  onPrev: () => void
  onNext: () => void
  onSelectDay: (key: string | null) => void
}

const WEEKDAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' }
]

const cellClass = (cell: CalendarCell, selected: boolean): string => {
  if (selected) return 'gba:bg-foreground gba:text-background gba:font-semibold'
  if (!cell.inMonth) return 'gba:text-muted-foreground/30'
  if (cell.count === 0) return 'gba:text-foreground/70'
  if (cell.count < 3) return 'gba:bg-muted/60 gba:text-foreground'
  return 'gba:bg-foreground/15 gba:text-foreground gba:font-semibold'
}

const navButtonClass =
  'gba:flex gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-full gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground gba:transition-colors'

export const MemoryMiniCalendar: React.FC<MemoryMiniCalendarProps> = ({
  year,
  month,
  weeks,
  selectedDay,
  loading,
  onPrev,
  onNext,
  onSelectDay
}) => (
  <div
    className="gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-3"
    data-testid="memory-lens-mini-calendar"
  >
    <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
      <span className="gba:text-[13px] gba:font-semibold gba:text-foreground">{monthLabel(year, month)}</span>
      <div className="gba:flex gba:items-center gba:gap-0.5">
        <button
          type="button"
          onClick={onPrev}
          className={navButtonClass}
          aria-label="Previous month"
          data-testid="memory-lens-calendar-prev"
        >
          <CaretLeftIcon className="gba:h-3.5 gba:w-3.5" />
        </button>
        <button
          type="button"
          onClick={onNext}
          className={navButtonClass}
          aria-label="Next month"
          data-testid="memory-lens-calendar-next"
        >
          <CaretRightIcon className="gba:h-3.5 gba:w-3.5" />
        </button>
      </div>
    </div>

    <div className="gba:mt-2 gba:grid gba:grid-cols-7 gba:gap-0.5">
      {WEEKDAYS.map(weekday => (
        <div
          key={weekday.key}
          className="gba:py-1 gba:text-center gba:text-[9px] gba:font-medium gba:text-muted-foreground/50"
        >
          {weekday.label}
        </div>
      ))}
      {weeks.flat().map(cell => {
        const selected = cell.key === selectedDay
        const clickable = cell.count > 0
        return (
          <button
            key={cell.key}
            type="button"
            disabled={!clickable}
            onClick={() => onSelectDay(selected ? null : cell.key)}
            className={`gba:relative gba:flex gba:aspect-square gba:items-center gba:justify-center gba:rounded-md gba:text-[11px] gba:transition-colors ${
              clickable ? 'gba:cursor-pointer' : 'gba:cursor-default'
            } ${cellClass(cell, selected)} ${
              cell.isToday && !selected ? 'gba:ring-1 gba:ring-inset gba:ring-border' : ''
            }`}
            data-testid={`memory-lens-calendar-day-${cell.key}`}
          >
            {cell.date.getDate()}
          </button>
        )
      })}
    </div>

    {loading && <p className="gba:mt-2 gba:text-center gba:text-[10px] gba:text-muted-foreground">Loading…</p>}
  </div>
)
