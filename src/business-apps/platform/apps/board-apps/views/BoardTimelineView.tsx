/**
 * BoardTimelineView - Gantt-style timeline with horizontal scrolling.
 */

import React, { useMemo } from 'react'
import type { BoardRow, TimelineViewConfig } from '../types'

export interface BoardTimelineViewProps {
  rows: BoardRow[]
  viewConfig: TimelineViewConfig
  onRowClick?: (row: BoardRow) => void
  'data-testid'?: string
}

export const BoardTimelineView: React.FC<BoardTimelineViewProps> = ({
  rows,
  viewConfig,
  onRowClick,
  'data-testid': testId = 'board-timeline'
}) => {
  const { startDateColumn, endDateColumn, titleColumn } = viewConfig

  const { items, minDate, totalDays } = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    const parsed: Array<{ row: BoardRow; start: Date; end: Date; title: string }> = []

    for (const row of rows) {
      const startVal = row.data[startDateColumn]
      const endVal = row.data[endDateColumn]
      if (!startVal || !endVal) continue

      const start = new Date(String(startVal))
      const end = new Date(String(endVal))
      if (isNaN(start.getTime()) || isNaN(end.getTime())) continue

      min = Math.min(min, start.getTime())
      max = Math.max(max, end.getTime())
      parsed.push({ row, start, end, title: String(row.data[titleColumn] || 'Untitled') })
    }

    if (parsed.length === 0) {
      const now = new Date()
      return { items: [], minDate: now, maxDate: new Date(now.getTime() + 30 * 86400000), totalDays: 30 }
    }

    const minD = new Date(min)
    const maxD = new Date(max)
    const days = Math.ceil((max - min) / 86400000) + 1

    return { items: parsed, minDate: minD, maxDate: maxD, totalDays: Math.max(days, 7) }
  }, [rows, startDateColumn, endDateColumn, titleColumn])

  const dayWidth = 24
  const rowHeight = 28

  const monthHeaders = useMemo(() => {
    const headers: Array<{ label: string; left: number; width: number }> = []
    let currentMonth = -1
    let monthStart = 0

    for (let d = 0; d < totalDays; d++) {
      const date = new Date(minDate.getTime() + d * 86400000)
      const m = date.getMonth()
      if (m !== currentMonth) {
        if (currentMonth >= 0) {
          headers[headers.length - 1].width = d * dayWidth - monthStart
        }
        currentMonth = m
        monthStart = d * dayWidth
        headers.push({
          label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          left: monthStart,
          width: 0
        })
      }
    }
    if (headers.length > 0) {
      headers[headers.length - 1].width = totalDays * dayWidth - headers[headers.length - 1].left
    }
    return headers
  }, [minDate, totalDays])

  if (items.length === 0) {
    return (
      <div className="gba:p-8 gba:text-center gba:text-muted-foreground gba:text-sm">No items with start/end dates</div>
    )
  }

  const timelineWidth = totalDays * dayWidth
  const svgHeight = (items.length + 1) * rowHeight

  return (
    <div className="gba:flex gba:h-full gba:min-h-0" data-testid={testId}>
      <div className="gba:w-40 gba:flex-shrink-0 gba:border-r">
        <div className="gba:h-7 gba:border-b gba:bg-muted/50 gba:px-2 gba:flex gba:items-center gba:text-xs gba:font-medium gba:text-muted-foreground">
          Item
        </div>
        <div className="gba:overflow-hidden">
          {items.map(({ row, title }) => (
            <div
              key={row.id}
              className="gba:h-7 gba:border-b gba:px-2 gba:flex gba:items-center gba:text-xs gba:text-foreground gba:truncate gba:cursor-pointer gba:hover:bg-muted/30"
              onClick={() => onRowClick?.(row)}
              data-testid={`${testId}-label-${row.id}`}
            >
              {title}
            </div>
          ))}
        </div>
      </div>

      <div className="gba:flex-1 gba:min-w-0 gba:overflow-x-auto gba:overflow-y-hidden">
        <svg width={timelineWidth} height={svgHeight} className="gba:block" role="img" aria-label="Timeline">
          {/* Header background */}
          <rect x={0} y={0} width={timelineWidth} height={rowHeight} className="gba:fill-muted" opacity={0.35} />
          <line x1={0} y1={rowHeight} x2={timelineWidth} y2={rowHeight} className="gba:stroke-border" />

          {/* Month headers */}
          {monthHeaders.map((mh, i) => (
            <g key={i}>
              <text x={mh.left + 6} y={18} className="gba:fill-muted-foreground" fontSize="12">
                {mh.label}
              </text>
              <line
                x1={mh.left + mh.width}
                y1={0}
                x2={mh.left + mh.width}
                y2={svgHeight}
                className="gba:stroke-border"
                opacity={0.6}
              />
            </g>
          ))}

          {/* Row separators */}
          {items.map((_, idx) => (
            <line
              key={idx}
              x1={0}
              y1={(idx + 2) * rowHeight}
              x2={timelineWidth}
              y2={(idx + 2) * rowHeight}
              className="gba:stroke-border"
              opacity={0.6}
            />
          ))}

          {/* Bars */}
          {items.map(({ row, start, end }, idx) => {
            const startOffset = Math.floor((start.getTime() - minDate.getTime()) / 86400000)
            const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
            const x = startOffset * dayWidth
            const w = duration * dayWidth
            const y = (idx + 1) * rowHeight + 4
            const h = rowHeight - 8

            return (
              <rect
                key={row.id}
                x={x}
                y={y}
                width={w}
                height={h}
                rx={4}
                className="gba:fill-primary gba:cursor-pointer"
                opacity={0.75}
                onClick={() => onRowClick?.(row)}
                data-testid={`${testId}-bar-${row.id}`}
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}
