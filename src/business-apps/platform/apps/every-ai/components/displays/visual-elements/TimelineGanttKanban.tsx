import React, { useMemo } from 'react'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import type { GanttData, KanbanBoardData, TimelineData } from '../../../types/models'
import { chartColorAt } from './chartPalette'

export const TimelineDisplay: React.FC<{ data: TimelineData }> = ({ data }) => {
  const sorted = useMemo(() => [...data.events].sort((a, b) => a.timestamp.localeCompare(b.timestamp)), [data.events])

  return (
    <Card className="gba:border-2 gba:shadow-lg" data-testid="timeline-display">
      <CardHeader>
        <CardTitle className="gba:text-lg">{data.title}</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p>
      </CardHeader>
      <CardContent>
        <ol className="gba:relative gba:border-l gba:border-border gba:ml-3 gba:space-y-6 gba:pl-6">
          {sorted.map((ev, i) => (
            <li key={ev.id} className="gba:relative">
              <span
                className="gba:absolute gba:-left-[1.4rem] gba:top-1 gba:flex gba:h-3 gba:w-3 gba:rounded-full gba:border-2 gba:border-background"
                style={{ backgroundColor: chartColorAt(i, ev.color ?? null) }}
                title={ev.status ?? undefined}
              />
              <div className="gba:flex gba:flex-wrap gba:items-baseline gba:gap-2">
                <span className="gba:font-medium gba:text-foreground">{ev.title}</span>
                {ev.status && (
                  <Badge variant="secondary" className="gba:text-xs">
                    {ev.status}
                  </Badge>
                )}
              </div>
              {ev.subtitle && <p className="gba:text-sm gba:text-muted-foreground">{ev.subtitle}</p>}
              <time className="gba:text-xs gba:text-muted-foreground" dateTime={ev.timestamp}>
                {ev.timestamp}
              </time>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

function parseTime(iso: string): number {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : t
}

const DAY_MS = 24 * 60 * 60 * 1000

function ganttTickTimestamps(minMs: number, maxMs: number): number[] {
  const span = Math.max(maxMs - minMs, 1)
  const ticks: number[] = []
  const maxTickCount = 6

  if (span >= DAY_MS) {
    const start = new Date(minMs)
    start.setHours(0, 0, 0, 0)
    let t = start.getTime()
    if (t < minMs) {
      t += DAY_MS
    }
    while (t <= maxMs) {
      ticks.push(t)
      t += DAY_MS
    }
    if (ticks.length === 0 || ticks[0] > minMs) {
      ticks.unshift(minMs)
    }
    if (ticks[ticks.length - 1] < maxMs) {
      ticks.push(maxMs)
    }
    const deduped = [...new Set(ticks)].sort((a, b) => a - b)
    if (deduped.length > maxTickCount) {
      const step = Math.ceil(deduped.length / maxTickCount)
      return deduped.filter((_, i) => i % step === 0 || i === deduped.length - 1)
    }
    return deduped
  }

  const steps = 5
  for (let i = 0; i <= steps; i++) {
    ticks.push(minMs + (span * i) / steps)
  }
  return ticks
}

function formatGanttTickLabel(ms: number, spanMs: number): string {
  const d = new Date(ms)
  if (spanMs > 90 * DAY_MS) {
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  }
  if (spanMs > 14 * DAY_MS) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  if (spanMs > 2 * DAY_MS) {
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
  }
  if (spanMs > 12 * 60 * 60 * 1000) {
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  }
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/** Shared template: min width on timeline so %-positions match bars; use one grid for tasks + axis. */
const GANTT_GRID_COLS = 'gba:grid gba:grid-cols-[minmax(8rem,12rem)_minmax(12rem,1fr)]'

function GanttTimeAxis({ min, range, idPrefix }: { min: number; range: number; idPrefix: string }) {
  const max = min + range
  const ticks = useMemo(() => ganttTickTimestamps(min, max), [min, max])
  const span = range

  return (
    <div
      className="gba:relative gba:w-full gba:min-h-[2.25rem] gba:shrink-0 gba:border-t gba:border-border gba:pt-1"
      role="presentation"
    >
      {ticks.map((t, i) => {
        const pct = ((t - min) / range) * 100
        const isFirst = i === 0
        const isLast = i === ticks.length - 1

        if (isFirst) {
          return (
            <span
              key={`${idPrefix}-${t}-${i}`}
              className="gba:absolute gba:top-1 gba:left-0 gba:text-left gba:text-xs gba:text-muted-foreground gba:tabular-nums gba:leading-tight gba:whitespace-nowrap"
            >
              {formatGanttTickLabel(t, span)}
            </span>
          )
        }

        if (isLast) {
          return (
            <span
              key={`${idPrefix}-${t}-${i}`}
              className="gba:absolute gba:top-1 gba:left-full gba:-translate-x-full gba:text-right gba:text-xs gba:text-muted-foreground gba:tabular-nums gba:leading-tight gba:whitespace-nowrap"
            >
              {formatGanttTickLabel(t, span)}
            </span>
          )
        }

        return (
          <span
            key={`${idPrefix}-${t}-${i}`}
            className="gba:absolute gba:top-1 gba:-translate-x-1/2 gba:text-center gba:text-xs gba:text-muted-foreground gba:tabular-nums gba:max-w-[4rem] gba:leading-tight gba:whitespace-nowrap gba:overflow-hidden gba:text-ellipsis"
            style={{ left: `${pct}%` }}
          >
            {formatGanttTickLabel(t, span)}
          </span>
        )
      })}
    </div>
  )
}

export const GanttDisplay: React.FC<{ data: GanttData }> = ({ data }) => {
  const { min, range } = useMemo(() => {
    let lo = Number.POSITIVE_INFINITY
    let hi = Number.NEGATIVE_INFINITY
    for (const t of data.tasks) {
      lo = Math.min(lo, parseTime(t.start), parseTime(t.end))
      hi = Math.max(hi, parseTime(t.start), parseTime(t.end))
    }
    if (!Number.isFinite(lo)) {
      lo = 0
      hi = 1
    }
    const span = Math.max(hi - lo, 1)
    return { min: lo, range: span }
  }, [data.tasks])

  const groups = useMemo(() => {
    const g = new Map<string | undefined, typeof data.tasks>()
    for (const t of data.tasks) {
      const key = t.group
      if (!g.has(key)) {
        g.set(key, [])
      }
      g.get(key)!.push(t)
    }
    return g
  }, [data.tasks])

  return (
    <Card className="gba:border-2 gba:shadow-lg gba:overflow-x-auto" data-testid="gantt-display">
      <CardHeader>
        <CardTitle className="gba:text-lg">{data.title}</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p>
      </CardHeader>
      <CardContent className="gba:min-w-[20rem]">
        <div className={`${GANTT_GRID_COLS} gba:gap-x-2 gba:gap-y-3`}>
          {Array.from(groups.entries()).map(([groupName, tasks], groupIndex) => (
            <React.Fragment key={groupName ?? 'default'}>
              {groupName && (
                <h4
                  className={`gba:col-span-2 gba:text-sm gba:font-semibold gba:text-foreground ${
                    groupIndex > 0 ? 'gba:mt-6' : ''
                  }`}
                >
                  {groupName}
                </h4>
              )}
              {tasks.map((task, ti) => {
                const s = parseTime(task.start)
                const e = parseTime(task.end)
                const left = ((s - min) / range) * 100
                const width = Math.max(((e - s) / range) * 100, 2)
                return (
                  <React.Fragment key={task.id}>
                    <div className="gba:min-w-0 gba:text-sm gba:truncate" title={task.label}>
                      {task.label}
                    </div>
                    <div className="gba:relative gba:min-h-8 gba:min-w-0 gba:rounded-md gba:bg-muted/40">
                      <div
                        className="gba:absolute gba:top-1 gba:h-6 gba:rounded gba:shadow-sm gba:cursor-default"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundColor: chartColorAt(ti, task.color ?? null)
                        }}
                        title={`${task.start} – ${task.end}${task.progress != null ? ` (${task.progress}%)` : ''}`}
                      />
                    </div>
                  </React.Fragment>
                )
              })}
            </React.Fragment>
          ))}
          <div aria-hidden className="gba:min-h-[2.25rem]" />
          <GanttTimeAxis min={min} range={range} idPrefix="gantt-x" />
        </div>
      </CardContent>
    </Card>
  )
}

const priorityVariant = (
  p: KanbanBoardData['columns'][0]['cards'][0]['priority']
): 'default' | 'destructive' | 'secondary' => {
  if (p === 'urgent' || p === 'high') {
    return 'destructive'
  }
  if (p === 'medium') {
    return 'secondary'
  }
  return 'default'
}

export const KanbanBoardDisplay: React.FC<{ data: KanbanBoardData }> = ({ data }) => {
  return (
    <Card className="gba:border-2 gba:shadow-lg" data-testid="kanban-board-display">
      <CardHeader>
        <CardTitle className="gba:text-lg">{data.title}</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p>
      </CardHeader>
      <CardContent>
        <div className="gba:flex gba:gap-3 gba:overflow-x-auto gba:pb-2">
          {data.columns.map(col => (
            <div
              key={col.id}
              className="gba:flex gba:min-w-[14rem] gba:max-w-xs gba:flex-1 gba:flex-col gba:rounded-lg gba:border gba:border-border gba:bg-muted/20"
              data-testid={`kanban-column-${col.id}`}
            >
              <div className="gba:border-b gba:border-border gba:px-3 gba:py-2 gba:text-sm gba:font-semibold">
                {col.title}
                <span className="gba:ml-2 gba:text-xs gba:font-normal gba:text-muted-foreground">
                  ({col.cards.length})
                </span>
              </div>
              <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2">
                {col.cards.map(card => (
                  <div
                    key={card.id}
                    className="gba:rounded-md gba:border gba:border-border gba:bg-card gba:p-3 gba:shadow-sm gba:hover:gba:shadow-md gba:transition-shadow"
                    title={card.subtitle ?? card.title}
                    data-testid={`kanban-card-${card.id}`}
                  >
                    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                      <span className="gba:text-sm gba:font-medium gba:text-foreground">{card.title}</span>
                      {card.priority && (
                        <Badge variant={priorityVariant(card.priority)} className="gba:text-xs">
                          {card.priority}
                        </Badge>
                      )}
                    </div>
                    {card.subtitle && <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground">{card.subtitle}</p>}
                    {card.status && <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground">{card.status}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
