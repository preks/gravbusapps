// Lists all tool invocations with call counts, durations, and status.

import { useMemo } from 'react'
import { CheckCircleIcon, WarningCircleIcon, WrenchIcon } from '@phosphor-icons/react'
import type { TraceModel } from '../../utils/traceModel'

interface TraceToolsTabProps {
  model: TraceModel
}

interface ToolStat {
  nodeId: string
  name: string
  callCount: number
  totalDurationMs: number
  failures: number
  lastStatus: 'done' | 'failed' | 'running'
}

function buildToolStats(model: TraceModel): ToolStat[] {
  const toolNodes = model.nodes.filter(n => n.kind === 'tool')
  const stats = new Map<string, ToolStat>()

  for (const node of toolNodes) {
    stats.set(node.id, {
      nodeId: node.id,
      name: node.label,
      callCount: 0,
      totalDurationMs: 0,
      failures: 0,
      lastStatus: 'running'
    })
  }

  // Each tool call produces a start frame (no duration) and an end frame
  // (with `→ done` / `→ failed` suffix and `durationMs`). Aggregate by
  // `targetNodeId` and only count the resolved end frames so we don't show
  // "web_search" and "web_search → done" as two separate rows.
  for (const frame of model.frames) {
    if (frame.kind !== 'tool') continue
    const targetId = frame.targetNodeId
    if (!targetId) continue
    const stat = stats.get(targetId)
    if (!stat) continue

    // End frames carry a duration and a status. Start frames don't — skip them.
    if (frame.durationMs == null && frame.status !== 'failed') continue

    stat.callCount++
    stat.totalDurationMs += frame.durationMs ?? 0
    if (frame.status === 'failed') stat.failures++
    stat.lastStatus = frame.status === 'failed' ? 'failed' : 'done'
  }

  return Array.from(stats.values())
    .filter(s => s.callCount > 0)
    .sort((a, b) => b.callCount - a.callCount)
}

function formatDuration(ms: number): string {
  if (ms === 0) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = ((ms % 60_000) / 1000).toFixed(0)
  return `${mins}m ${secs}s`
}

interface StatusBadgeProps {
  hasFailures: boolean
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ hasFailures }) =>
  hasFailures ? (
    <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-destructive/10 gba:text-destructive gba:text-[11px] gba:font-medium">
      <WarningCircleIcon className="gba:h-3 gba:w-3" weight="fill" />
      Failed
    </span>
  ) : (
    <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-emerald-500/10 gba:text-emerald-700 dark:gba:text-emerald-400 gba:text-[11px] gba:font-medium">
      <CheckCircleIcon className="gba:h-3 gba:w-3" weight="fill" />
      OK
    </span>
  )

export const TraceToolsTab: React.FC<TraceToolsTabProps> = ({ model }) => {
  const stats = useMemo(() => buildToolStats(model), [model])

  if (stats.length === 0) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:flex-1 gba:gap-3"
        data-testid="trace-tools-tab-empty"
      >
        <span className="gba:flex gba:h-12 gba:w-12 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted">
          <WrenchIcon className="gba:h-5 gba:w-5 gba:text-muted-foreground" weight="duotone" />
        </span>
        <p className="gba:text-sm gba:text-muted-foreground">No tool calls in this session</p>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:overflow-hidden" data-testid="trace-tools-tab">
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto">
        <table className="gba:w-full gba:text-sm gba:border-separate gba:border-spacing-0">
          <thead className="gba:sticky gba:top-0 gba:z-10 gba:bg-muted/40 gba:backdrop-blur">
            <tr>
              <th className="gba:text-left gba:px-4 gba:py-2.5 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:border-b gba:border-border/50">
                Tool
              </th>
              <th className="gba:text-right gba:px-4 gba:py-2.5 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:border-b gba:border-border/50 gba:w-[100px]">
                Calls
              </th>
              <th className="gba:text-right gba:px-4 gba:py-2.5 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:border-b gba:border-border/50 gba:w-[140px]">
                Total time
              </th>
              <th className="gba:text-right gba:px-4 gba:py-2.5 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:border-b gba:border-border/50 gba:w-[100px]">
                Failures
              </th>
              <th className="gba:text-left gba:px-4 gba:py-2.5 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:border-b gba:border-border/50 gba:w-[120px]">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.map(stat => (
              <tr
                key={stat.nodeId}
                className="gba:hover:bg-muted/30 gba:transition-colors gba:group"
                data-testid={`trace-tools-row-${stat.name}`}
              >
                <td className="gba:px-4 gba:py-3 gba:border-b gba:border-border/30">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded-md gba:bg-sky-500/10 gba:text-sky-600 dark:gba:text-sky-400 gba:shrink-0">
                      <WrenchIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
                    </span>
                    <span className="gba:font-mono gba:text-[13px] gba:font-medium gba:text-foreground">
                      {stat.name}
                    </span>
                  </div>
                </td>
                <td className="gba:px-4 gba:py-3 gba:text-right gba:tabular-nums gba:font-medium gba:text-foreground gba:border-b gba:border-border/30">
                  {stat.callCount}
                </td>
                <td className="gba:px-4 gba:py-3 gba:text-right gba:tabular-nums gba:text-muted-foreground gba:border-b gba:border-border/30">
                  {formatDuration(stat.totalDurationMs)}
                </td>
                <td className="gba:px-4 gba:py-3 gba:text-right gba:tabular-nums gba:border-b gba:border-border/30">
                  {stat.failures > 0 ? (
                    <span className="gba:font-medium gba:text-destructive">{stat.failures}</span>
                  ) : (
                    <span className="gba:text-muted-foreground/60">0</span>
                  )}
                </td>
                <td className="gba:px-4 gba:py-3 gba:border-b gba:border-border/30">
                  <StatusBadge hasFailures={stat.failures > 0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
