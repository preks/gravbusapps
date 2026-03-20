/**
 * TimelineSvg - Interactive Gantt-style SVG with drag, resize,
 * dependency creation, zoom levels, and smooth transitions.
 */

import React, { useMemo, useState } from 'react'
import type { BoardRow } from '../../types'
import { ElbowConnector } from './ElbowConnector'
import type { ConnectorEdge } from './ElbowConnector'
import { useTimelineDrag } from './useTimelineDrag'
import type { BarGeo } from './useTimelineDrag'

export type { BarGeo }
export type TimelineEdge = ConnectorEdge
export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter'

export const ZOOM_DAY_WIDTH: Record<ZoomLevel, number> = { day: 32, week: 10, month: 3.5, quarter: 1.2 }

export interface TimelineSvgProps {
  rows: BoardRow[]
  startDateColumn: string
  endDateColumn: string
  titleColumn: string
  edges: TimelineEdge[]
  zoom?: ZoomLevel
  selectedRowId?: string | null
  onLabelClick?: (row: BoardRow) => void
  onBarSelect?: (row: BoardRow) => void
  onBarDrag?: (rowId: string, newStart: string, newEnd: string) => void
  onBarResizeStart?: (rowId: string, newStart: string) => void
  onBarResizeEnd?: (rowId: string, newEnd: string) => void
  onDependencyCreate?: (fromRowId: string, toRowId: string) => void
  testId?: string
}

interface ParsedItem {
  row: BoardRow
  start: Date
  end: Date
  title: string
}

const ROW_HEIGHT = 36
const BAR_PADDING = 5
const HANDLE_WIDTH = 7
const CONNECTOR_R = 5
const MS_PER_DAY = 86_400_000
const DATE_COL_W = 68
const LEFT_PANE_WIDTH = 192 + DATE_COL_W * 2

function shortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const TimelineSvg: React.FC<TimelineSvgProps> = ({
  rows,
  startDateColumn,
  endDateColumn,
  titleColumn,
  edges,
  zoom = 'day',
  selectedRowId,
  onLabelClick,
  onBarSelect,
  onBarDrag,
  onBarResizeStart,
  onBarResizeEnd,
  onDependencyCreate,
  testId = 'board-timeline'
}) => {
  const dayW = ZOOM_DAY_WIDTH[zoom]

  const { items, minDate, totalDays } = useMemo(() => {
    let min = Infinity,
      max = -Infinity
    const parsed: ParsedItem[] = []
    for (const row of rows) {
      const sv = row.data[startDateColumn],
        ev = row.data[endDateColumn]
      if (!sv || !ev) continue
      const s = new Date(String(sv)),
        e = new Date(String(ev))
      if (isNaN(s.getTime()) || isNaN(e.getTime())) continue
      min = Math.min(min, s.getTime())
      max = Math.max(max, e.getTime())
      parsed.push({ row, start: s, end: e, title: String(row.data[titleColumn] || 'Untitled') })
    }
    parsed.sort((a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime())
    if (!parsed.length) return { items: [], minDate: new Date(), totalDays: 30 }
    return { items: parsed, minDate: new Date(min), totalDays: Math.max(Math.ceil((max - min) / MS_PER_DAY) + 1, 7) }
  }, [rows, startDateColumn, endDateColumn, titleColumn])

  const monthHeaders = useMemo(() => {
    const h: Array<{ label: string; left: number; width: number }> = []
    let curM = -1,
      mStart = 0
    for (let d = 0; d < totalDays; d++) {
      const dt = new Date(minDate.getTime() + d * MS_PER_DAY),
        m = dt.getMonth()
      if (m !== curM) {
        if (curM >= 0) h[h.length - 1].width = d * dayW - mStart
        curM = m
        mStart = d * dayW
        h.push({ label: dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), left: mStart, width: 0 })
      }
    }
    if (h.length) h[h.length - 1].width = totalDays * dayW - h[h.length - 1].left
    return h
  }, [minDate, totalDays, dayW])

  const barGeometry = useMemo(() => {
    const map = new Map<string, BarGeo>()
    items.forEach(({ row, start, end }, idx) => {
      const off = (start.getTime() - minDate.getTime()) / MS_PER_DAY
      const dur = Math.max(1, (end.getTime() - start.getTime()) / MS_PER_DAY)
      map.set(row.id, {
        x: off * dayW,
        y: (idx + 1) * ROW_HEIGHT + BAR_PADDING,
        w: dur * dayW,
        h: ROW_HEIGHT - BAR_PADDING * 2
      })
    })
    return map
  }, [items, minDate, dayW])

  const itemById = useMemo(() => {
    const m = new Map<string, ParsedItem>()
    items.forEach(it => m.set(it.row.id, it))
    return m
  }, [items])

  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null)
  const {
    svgRef,
    drag,
    dragDelta,
    connectTarget,
    connectMouse,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  } = useTimelineDrag({
    dayWidth: dayW,
    barGeometry,
    itemById,
    onBarDrag,
    onBarResizeStart,
    onBarResizeEnd,
    onDependencyCreate
  })

  if (!items.length) {
    return (
      <div className="gba:p-8 gba:text-center gba:text-muted-foreground gba:text-sm">No items with start/end dates</div>
    )
  }

  const tw = totalDays * dayW
  const sh = (items.length + 1) * ROW_HEIGHT

  return (
    <div className="gba:flex gba:flex-1 gba:h-full gba:min-h-0">
      <div className="gba:flex-shrink-0 gba:border-r" style={{ width: LEFT_PANE_WIDTH }}>
        <div
          className="gba:border-b gba:bg-muted/50 gba:flex gba:items-center gba:text-xs gba:font-medium gba:text-muted-foreground"
          style={{ height: ROW_HEIGHT }}
        >
          <span className="gba:flex-1 gba:px-3 gba:truncate">Task</span>
          <span className="gba:text-center" style={{ width: DATE_COL_W }}>
            Start
          </span>
          <span className="gba:text-center" style={{ width: DATE_COL_W }}>
            End
          </span>
        </div>
        <div className="gba:overflow-hidden">
          {items.map(({ row, title, start, end }) => (
            <div
              key={row.id}
              className={`gba:border-b gba:flex gba:items-center gba:text-xs ${row.id === selectedRowId ? 'gba:bg-accent/20 gba:font-medium' : 'gba:text-foreground'}`}
              style={{ height: ROW_HEIGHT }}
            >
              <span
                className="gba:flex-1 gba:px-3 gba:truncate gba:cursor-pointer gba:hover:underline"
                onClick={() => onLabelClick?.(row)}
                data-testid={`${testId}-label-${row.id}`}
              >
                {title}
              </span>
              <span className="gba:text-center gba:text-muted-foreground" style={{ width: DATE_COL_W, fontSize: 10 }}>
                {shortDate(start)}
              </span>
              <span className="gba:text-center gba:text-muted-foreground" style={{ width: DATE_COL_W, fontSize: 10 }}>
                {shortDate(end)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="gba:flex-1 gba:min-w-0 gba:overflow-x-auto gba:overflow-y-hidden">
        <svg
          ref={svgRef}
          width={tw}
          height={sh}
          className="gba:block"
          role="img"
          aria-label="Timeline"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <defs>
            <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="bar-grad-active" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={tw} height={ROW_HEIGHT} className="gba:fill-muted" opacity={0.2} />
          <line x1={0} y1={ROW_HEIGHT} x2={tw} y2={ROW_HEIGHT} className="gba:stroke-border" />
          {monthHeaders.map((mh, i) => (
            <g key={i}>
              <text
                x={mh.left + 8}
                y={ROW_HEIGHT / 2 + 4}
                className="gba:fill-muted-foreground"
                fontSize="11"
                fontWeight="500"
              >
                {mh.label}
              </text>
              <line
                x1={mh.left + mh.width}
                y1={0}
                x2={mh.left + mh.width}
                y2={sh}
                className="gba:stroke-border"
                opacity={0.3}
              />
            </g>
          ))}
          {items.map((_, idx) => (
            <line
              key={idx}
              x1={0}
              y1={(idx + 2) * ROW_HEIGHT}
              x2={tw}
              y2={(idx + 2) * ROW_HEIGHT}
              className="gba:stroke-border"
              opacity={0.15}
            />
          ))}

          {edges.map((edge, i) => {
            const fg = barGeometry.get(edge.from),
              tg = barGeometry.get(edge.to)
            return fg && tg ? <ElbowConnector key={i} edge={edge} fromGeo={fg} toGeo={tg} /> : null
          })}

          {items.map(({ row, start, end }) => (
            <TimelineBar
              key={row.id}
              row={row}
              geo={barGeometry.get(row.id)!}
              start={start}
              end={end}
              selectedRowId={selectedRowId}
              hoveredRowId={hoveredRowId}
              drag={drag}
              dragDelta={dragDelta}
              dayWidth={dayW}
              connectorR={CONNECTOR_R}
              handleWidth={HANDLE_WIDTH}
              onBarSelect={onBarSelect}
              onDependencyCreate={onDependencyCreate}
              onPointerDown={handlePointerDown}
              setHoveredRowId={setHoveredRowId}
              testId={testId}
            />
          ))}

          {drag?.mode === 'connect' &&
            connectMouse &&
            (() => {
              const fg = barGeometry.get(drag.rowId)
              if (!fg) return null
              const anchor =
                drag.startX <= fg.x + fg.w / 2
                  ? { x: fg.x - CONNECTOR_R - 2, y: fg.y + fg.h / 2 }
                  : { x: fg.x + fg.w + CONNECTOR_R + 2, y: fg.y + fg.h / 2 }
              return (
                <line
                  x1={anchor.x}
                  y1={anchor.y}
                  x2={connectMouse.x}
                  y2={connectMouse.y}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  className={connectTarget ? 'gba:stroke-primary' : 'gba:stroke-muted-foreground'}
                  opacity={0.6}
                  pointerEvents="none"
                />
              )
            })()}
        </svg>
      </div>
    </div>
  )
}

interface TimelineBarProps {
  row: BoardRow
  geo: BarGeo
  start: Date
  end: Date
  selectedRowId?: string | null
  hoveredRowId: string | null
  drag: { mode: string; rowId: string } | null
  dragDelta: number
  dayWidth: number
  connectorR: number
  handleWidth: number
  onBarSelect?: (r: BoardRow) => void
  onDependencyCreate?: (from: string, to: string) => void
  onPointerDown: (e: React.PointerEvent, id: string, mode: 'move' | 'resize-left' | 'resize-right' | 'connect') => void
  setHoveredRowId: (id: string | null) => void
  testId: string
}

const TimelineBar: React.FC<TimelineBarProps> = React.memo(
  ({
    row,
    geo,
    start,
    end,
    selectedRowId,
    hoveredRowId,
    drag,
    dragDelta,
    dayWidth,
    connectorR,
    handleWidth,
    onBarSelect,
    onDependencyCreate,
    onPointerDown,
    setHoveredRowId,
    testId
  }) => {
    const isSelected = row.id === selectedRowId
    const isHovered = row.id === hoveredRowId
    const isActive = isSelected || isHovered
    const isDragging = drag?.rowId === row.id && drag.mode !== 'connect'
    let dx = 0,
      dw = 0
    if (isDragging) {
      if (drag!.mode === 'move') dx = dragDelta
      else if (drag!.mode === 'resize-left') {
        dx = dragDelta
        dw = -dragDelta
      } else if (drag!.mode === 'resize-right') dw = dragDelta
    }
    const rx = geo.x + dx,
      rw = Math.max(dayWidth, geo.w + dw)
    const barLabel = `${shortDate(start)} – ${shortDate(end)}`
    const showInline = rw > 120
    const transition = isDragging ? undefined : 'all 0.3s cubic-bezier(0.4,0,0.2,1)'

    return (
      <g onPointerEnter={() => setHoveredRowId(row.id)} onPointerLeave={() => setHoveredRowId(null)}>
        <rect
          x={rx}
          y={geo.y}
          width={rw}
          height={geo.h}
          rx={5}
          fill={isActive ? 'url(#bar-grad-active)' : 'url(#bar-grad)'}
          className="gba:cursor-grab"
          style={{ transition }}
          onClick={e => {
            e.stopPropagation()
            onBarSelect?.(row)
          }}
          onPointerDown={e => onPointerDown(e, row.id, 'move')}
          data-testid={`${testId}-bar-${row.id}`}
        />

        {showInline && (
          <text
            x={rx + 8}
            y={geo.y + geo.h / 2 + 3.5}
            fontSize="9"
            fontWeight="500"
            className="gba:fill-primary-foreground"
            pointerEvents="none"
            opacity={0.95}
            style={{ transition }}
          >
            {barLabel}
          </text>
        )}
        {isActive && !showInline && (
          <text
            x={rx + rw + 8}
            y={geo.y + geo.h / 2 + 3.5}
            fontSize="9"
            className="gba:fill-muted-foreground"
            pointerEvents="none"
          >
            {barLabel}
          </text>
        )}

        <rect
          x={rx}
          y={geo.y}
          width={handleWidth}
          height={geo.h}
          rx={3}
          className="gba:cursor-ew-resize"
          fill={isActive ? 'rgba(255,255,255,0.25)' : 'transparent'}
          style={{ transition }}
          onPointerDown={e => onPointerDown(e, row.id, 'resize-left')}
          data-testid={`${testId}-resize-l-${row.id}`}
        />
        <rect
          x={rx + rw - handleWidth}
          y={geo.y}
          width={handleWidth}
          height={geo.h}
          rx={3}
          className="gba:cursor-ew-resize"
          fill={isActive ? 'rgba(255,255,255,0.25)' : 'transparent'}
          style={{ transition }}
          onPointerDown={e => onPointerDown(e, row.id, 'resize-right')}
          data-testid={`${testId}-resize-r-${row.id}`}
        />

        {isActive && onDependencyCreate && (
          <>
            <circle
              cx={rx - connectorR - 2}
              cy={geo.y + geo.h / 2}
              r={connectorR}
              className="gba:fill-primary gba:stroke-primary-foreground gba:cursor-crosshair"
              strokeWidth={1.5}
              opacity={0.85}
              onPointerDown={e => onPointerDown(e, row.id, 'connect')}
              data-testid={`${testId}-conn-l-${row.id}`}
            />
            <circle
              cx={rx + rw + connectorR + 2}
              cy={geo.y + geo.h / 2}
              r={connectorR}
              className="gba:fill-primary gba:stroke-primary-foreground gba:cursor-crosshair"
              strokeWidth={1.5}
              opacity={0.85}
              onPointerDown={e => onPointerDown(e, row.id, 'connect')}
              data-testid={`${testId}-conn-r-${row.id}`}
            />
          </>
        )}

        {isSelected && (
          <rect
            x={rx - 1.5}
            y={geo.y - 1.5}
            width={rw + 3}
            height={geo.h + 3}
            rx={6}
            fill="none"
            strokeWidth={2}
            className="gba:stroke-primary"
            opacity={0.4}
            pointerEvents="none"
            style={{ transition }}
          />
        )}
      </g>
    )
  }
)

TimelineBar.displayName = 'TimelineBar'
