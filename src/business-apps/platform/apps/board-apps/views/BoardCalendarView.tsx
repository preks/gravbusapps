/**
 * BoardCalendarView - full month-grid calendar with rich event cards in day cells.
 */

import React, { useMemo, useState } from 'react'
import { Button, Badge, Card, CardContent } from '@newwork/nw-design-system'
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

function parseDateValue(val: unknown): Date | null {
  if (!val) return null
  try {
    const d = new Date(String(val))
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getBadgeVariant(token: string | undefined) {
  switch (token) {
    case 'success':
      return 'success' as const
    case 'destructive':
      return 'destructive' as const
    case 'warning':
      return 'warning' as const
    case 'info':
      return 'info' as const
    default:
      return 'secondary' as const
  }
}

export const BoardCalendarView: React.FC<BoardCalendarViewProps> = ({
  columns,
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
  const firstDayRaw = new Date(year, month, 1).getDay()
  const firstDayOfWeek = firstDayRaw === 0 ? 6 : firstDayRaw - 1

  const dateCol = viewConfig.dateColumn || ''
  const titleCol = viewConfig.titleColumn

  const dateMap = useMemo(() => {
    const map = new Map<string, BoardRow[]>()
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
      const d = parseDateValue(val)
      if (!d) continue
      const key = toDateKey(d)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }
    return map
  }, [rows, dateCol])

  const statusColumn = useMemo(
    () => columns.find(c => c.type === 'status' || c.type === 'priority' || c.type === 'select'),
    [columns]
  )

  const getStatusBadge = (row: BoardRow) => {
    if (!statusColumn) return null
    const val = String(row.data[statusColumn.name] || '')
    if (!val) return null
    const opt = statusColumn.selectOptions?.find(o => o.value === val || o.label === val)
    if (!opt) return null
    return (
      <Badge variant={getBadgeVariant(opt.colorToken)} className="gba:text-[10px] gba:px-1 gba:py-0 gba:leading-tight">
        {opt.label}
      </Badge>
    )
  }

  const getSecondaryInfo = (row: BoardRow): string | null => {
    const secondary = columns.find(
      c =>
        c.name !== titleCol &&
        c.name !== dateCol &&
        c.name !== (statusColumn?.name || '') &&
        c.type !== 'attachment' &&
        row.data[c.name] != null &&
        row.data[c.name] !== ''
    )
    if (!secondary) return null
    return String(row.data[secondary.name])
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => setCurrentDate(new Date())

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const todayKey = toDateKey(new Date())

  const MAX_VISIBLE = compactMode ? 2 : 3

  if (compactMode) {
    const sortedEntries = [...dateMap.entries()]
      .filter(([key]) => key.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
      .sort((a, b) => a[0].localeCompare(b[0]))
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
          <span className="gba:text-sm gba:font-medium">{monthLabel}</span>
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
                {new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
              {dateRows.map(row => (
                <Card
                  key={row.id}
                  className="gba:cursor-pointer gba:mb-1"
                  onClick={() => onRowClick?.(row)}
                  data-testid={`${testId}-card-${row.id}`}
                >
                  <CardContent className="gba:p-2 gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-xs gba:font-medium gba:truncate gba:flex-1">
                      {String(row.data[titleCol] || 'Untitled')}
                    </span>
                    {getStatusBadge(row)}
                  </CardContent>
                </Card>
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
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:flex-shrink-0">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-8 gba:w-8"
            onClick={prevMonth}
            data-testid={`${testId}-prev-month`}
          >
            <ChevronLeft className="gba:w-4 gba:h-4" />
          </Button>
          <h2 className="gba:text-base gba:font-semibold gba:min-w-40 gba:text-center">{monthLabel}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-8 gba:w-8"
            onClick={nextMonth}
            data-testid={`${testId}-next-month`}
          >
            <ChevronRight className="gba:w-4 gba:h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gba:text-xs gba:h-7 gba:ml-2"
            onClick={goToday}
            data-testid={`${testId}-today`}
          >
            Today
          </Button>
        </div>
        <span className="gba:text-xs gba:text-muted-foreground">
          {rows.length} item{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-auto gba:px-2 gba:pb-2">
        <div className="gba:grid gba:grid-cols-7 gba:border-l gba:border-t gba:border-border gba:min-h-full">
          {/* Day headers */}
          {DAY_NAMES.map(d => (
            <div
              key={d}
              className="gba:border-b gba:border-r gba:border-border gba:bg-muted/40 gba:px-2 gba:py-1.5 gba:text-xs gba:font-medium gba:text-muted-foreground gba:text-center"
            >
              {d}
            </div>
          ))}

          {/* Empty leading cells */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="gba:border-b gba:border-r gba:border-border gba:bg-muted/10 gba:min-h-28"
            />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayRows = dateMap.get(dateKey) || []
            const isToday = dateKey === todayKey
            const overflow = dayRows.length - MAX_VISIBLE

            return (
              <div
                key={day}
                className={`gba:border-b gba:border-r gba:border-border gba:min-h-28 gba:p-1.5 gba:flex gba:flex-col ${
                  isToday ? 'gba:bg-primary/5' : ''
                }`}
              >
                {/* Day number */}
                <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                  <span
                    className={`gba:text-xs gba:leading-5 gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center gba:rounded-full ${
                      isToday ? 'gba:bg-primary gba:text-primary-foreground gba:font-bold' : 'gba:text-muted-foreground'
                    }`}
                  >
                    {day}
                  </span>
                  {dayRows.length > 0 && (
                    <span className="gba:text-[10px] gba:text-muted-foreground">{dayRows.length}</span>
                  )}
                </div>

                {/* Event cards */}
                <div className="gba:flex gba:flex-col gba:gap-0.5 gba:flex-1 gba:min-h-0">
                  {dayRows.slice(0, MAX_VISIBLE).map(row => {
                    const secondaryText = getSecondaryInfo(row)
                    return (
                      <button
                        key={row.id}
                        onClick={() => onRowClick?.(row)}
                        className="gba:w-full gba:text-left gba:rounded gba:bg-primary/8 gba:hover:bg-primary/15 gba:border gba:border-primary/10 gba:px-1.5 gba:py-1 gba:transition-colors gba:cursor-pointer gba:group/card"
                        data-testid={`${testId}-card-${row.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <span className="gba:text-[11px] gba:font-medium gba:text-foreground gba:truncate gba:flex-1 gba:leading-tight">
                            {String(row.data[titleCol] || 'Untitled')}
                          </span>
                          {getStatusBadge(row)}
                        </div>
                        {secondaryText && (
                          <p className="gba:text-[10px] gba:text-muted-foreground gba:truncate gba:leading-tight gba:mt-0.5">
                            {secondaryText}
                          </p>
                        )}
                      </button>
                    )
                  })}
                  {overflow > 0 && (
                    <span className="gba:text-[10px] gba:text-muted-foreground gba:px-1 gba:font-medium">
                      +{overflow} more
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {/* Trailing empty cells to complete the last row */}
          {(() => {
            const totalCells = firstDayOfWeek + daysInMonth
            const trailingEmpty = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7)
            return Array.from({ length: trailingEmpty }).map((_, i) => (
              <div
                key={`trail-${i}`}
                className="gba:border-b gba:border-r gba:border-border gba:bg-muted/10 gba:min-h-28"
              />
            ))
          })()}
        </div>
      </div>
    </div>
  )
}
