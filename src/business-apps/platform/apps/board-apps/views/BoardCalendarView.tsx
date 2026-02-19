/**
 * BoardCalendarView - date-based calendar rendering with agenda mode for mobile.
 */

import React, { useMemo, useState } from 'react'
import { Button, Badge } from '@newwork/nw-design-system'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { BoardRow, BoardColumn, CalendarViewConfig } from '../types'

export interface BoardCalendarViewProps {
  columns: BoardColumn[]
  rows: BoardRow[]
  viewConfig: CalendarViewConfig
  onRowClick?: (row: BoardRow) => void
  compactMode?: boolean
  'data-testid'?: string
}

export const BoardCalendarView: React.FC<BoardCalendarViewProps> = ({
  rows,
  viewConfig,
  onRowClick,
  compactMode = false,
  'data-testid': testId = 'board-calendar'
}) => {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()

  const dateMap = useMemo(() => {
    const map = new Map<string, BoardRow[]>()
    const dateCol = viewConfig.dateColumn || ''

    for (const row of rows) {
      let val = row.data[dateCol]
      if (!val && !dateCol) {
        const anyDateKey = Object.keys(row.data).find(k => {
          const v = row.data[k]
          if (typeof v !== 'string') return false
          return !isNaN(Date.parse(v)) && /\d{4}/.test(v)
        })
        if (anyDateKey) val = row.data[anyDateKey]
      }
      if (!val) continue
      try {
        const d = new Date(String(val))
        if (isNaN(d.getTime())) continue
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(row)
      } catch {
        continue
      }
    }
    return map
  }, [rows, viewConfig.dateColumn])

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const titleCol = viewConfig.titleColumn
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (compactMode) {
    const sortedEntries = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    return (
      <div className="gba:p-3" data-testid={testId}>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-7 gba:w-7"
            onClick={prevMonth}
            data-testid={`${testId}-prev-month`}
          >
            <ChevronLeft className="gba:w-4 gba:h-4" />
          </Button>
          <span className="gba:text-sm gba:font-medium">{monthName}</span>
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-7 gba:w-7"
            onClick={nextMonth}
            data-testid={`${testId}-next-month`}
          >
            <ChevronRight className="gba:w-4 gba:h-4" />
          </Button>
        </div>
        <div className="gba:space-y-2">
          {sortedEntries.map(([dateKey, dateRows]) => (
            <div key={dateKey}>
              <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1">
                {new Date(dateKey).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              {dateRows.map(row => (
                <button
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className="gba:w-full gba:text-left gba:px-2 gba:py-1 gba:text-xs gba:rounded gba:hover:bg-muted/50"
                >
                  {String(row.data[titleCol] || 'Untitled')}
                </button>
              ))}
            </div>
          ))}
          {sortedEntries.length === 0 && (
            <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:py-4">No items this month</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="gba:p-3" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
        <Button
          variant="ghost"
          size="icon"
          className="gba:h-7 gba:w-7"
          onClick={prevMonth}
          data-testid={`${testId}-prev-month`}
        >
          <ChevronLeft className="gba:w-4 gba:h-4" />
        </Button>
        <span className="gba:text-sm gba:font-medium">{monthName}</span>
        <Button
          variant="ghost"
          size="icon"
          className="gba:h-7 gba:w-7"
          onClick={nextMonth}
          data-testid={`${testId}-next-month`}
        >
          <ChevronRight className="gba:w-4 gba:h-4" />
        </Button>
      </div>
      <div className="gba:grid gba:grid-cols-7 gba:gap-px gba:bg-border gba:rounded-lg gba:overflow-hidden">
        {dayNames.map(d => (
          <div
            key={d}
            className="gba:bg-muted/50 gba:px-1 gba:py-1 gba:text-center gba:text-xs gba:font-medium gba:text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="gba:bg-card gba:min-h-16" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayRows = dateMap.get(dateKey) || []
          const isToday = new Date().toISOString().startsWith(dateKey)

          return (
            <div
              key={day}
              className={`gba:bg-card gba:min-h-16 gba:p-1 ${isToday ? 'gba:ring-1 gba:ring-inset gba:ring-primary' : ''}`}
            >
              <span
                className={`gba:text-xs ${isToday ? 'gba:text-primary gba:font-bold' : 'gba:text-muted-foreground'}`}
              >
                {day}
              </span>
              <div className="gba:space-y-0.5 gba:mt-0.5">
                {dayRows.slice(0, 3).map(row => (
                  <button
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    className="gba:w-full gba:text-left gba:text-xs gba:px-1 gba:py-0.5 gba:rounded gba:bg-primary/10 gba:text-primary gba:truncate gba:hover:bg-primary/20"
                  >
                    {String(row.data[titleCol] || 'Untitled')}
                  </button>
                ))}
                {dayRows.length > 3 && (
                  <Badge variant="secondary" className="gba:text-xs gba:px-1 gba:py-0">
                    +{dayRows.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
