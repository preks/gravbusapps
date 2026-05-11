// Displays participating agents (orchestrator, sub-agents, experts, skills, tools)
// with their invocation counts and combined duration.

import { useMemo } from 'react'
import {
  BrainIcon,
  CompassIcon,
  type Icon,
  LightbulbIcon,
  RobotIcon,
  UsersThreeIcon,
  WrenchIcon
} from '@phosphor-icons/react'
import type { MeshNode, MeshNodeKind, TraceModel } from '../../utils/traceModel'

interface TraceSourcesTabProps {
  model: TraceModel
}

interface KindStyle {
  label: string
  icon: Icon
  iconBg: string
  iconColor: string
  badgeBg: string
  badgeText: string
}

const KIND_STYLE: Record<MeshNodeKind, KindStyle> = {
  orchestrator: {
    label: 'Orchestrator',
    icon: CompassIcon,
    iconBg: 'gba:bg-primary/10',
    iconColor: 'gba:text-primary',
    badgeBg: 'gba:bg-primary/10',
    badgeText: 'gba:text-primary'
  },
  subagent: {
    label: 'Sub-agent',
    icon: RobotIcon,
    iconBg: 'gba:bg-emerald-500/10',
    iconColor: 'gba:text-emerald-600 dark:gba:text-emerald-400',
    badgeBg: 'gba:bg-emerald-500/10',
    badgeText: 'gba:text-emerald-700 dark:gba:text-emerald-400'
  },
  expert: {
    label: 'Expert',
    icon: BrainIcon,
    iconBg: 'gba:bg-violet-500/10',
    iconColor: 'gba:text-violet-600 dark:gba:text-violet-400',
    badgeBg: 'gba:bg-violet-500/10',
    badgeText: 'gba:text-violet-700 dark:gba:text-violet-400'
  },
  skill: {
    label: 'Skill',
    icon: LightbulbIcon,
    iconBg: 'gba:bg-teal-500/10',
    iconColor: 'gba:text-teal-600 dark:gba:text-teal-400',
    badgeBg: 'gba:bg-teal-500/10',
    badgeText: 'gba:text-teal-700 dark:gba:text-teal-400'
  },
  tool: {
    label: 'Tool',
    icon: WrenchIcon,
    iconBg: 'gba:bg-sky-500/10',
    iconColor: 'gba:text-sky-600 dark:gba:text-sky-400',
    badgeBg: 'gba:bg-sky-500/10',
    badgeText: 'gba:text-sky-700 dark:gba:text-sky-400'
  }
}

const KIND_ORDER: MeshNodeKind[] = ['orchestrator', 'subagent', 'expert', 'skill', 'tool']

function formatDuration(ms: number): string {
  if (ms === 0) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = ((ms % 60_000) / 1000).toFixed(0)
  return `${mins}m ${secs}s`
}

interface StatusDotProps {
  status: MeshNode['status']
}

const StatusDot: React.FC<StatusDotProps> = ({ status }) => {
  const cfg = {
    done: { bg: 'gba:bg-emerald-500/10', text: 'gba:text-emerald-700 dark:gba:text-emerald-400', label: 'Done' },
    failed: { bg: 'gba:bg-destructive/10', text: 'gba:text-destructive', label: 'Failed' },
    running: { bg: 'gba:bg-amber-500/10', text: 'gba:text-amber-700 dark:gba:text-amber-400', label: 'Running' },
    idle: { bg: 'gba:bg-muted', text: 'gba:text-muted-foreground', label: 'Idle' }
  }[status]
  return (
    <span
      className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-0.5 gba:rounded-full gba:text-[11px] gba:font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className="gba:relative gba:flex gba:h-1.5 gba:w-1.5">
        {status === 'running' && (
          <span className="gba:absolute gba:inline-flex gba:h-full gba:w-full gba:rounded-full gba:bg-amber-500 gba:opacity-60 gba:animate-ping" />
        )}
        <span
          className={`gba:relative gba:inline-flex gba:h-1.5 gba:w-1.5 gba:rounded-full ${
            status === 'done'
              ? 'gba:bg-emerald-500'
              : status === 'failed'
                ? 'gba:bg-destructive'
                : status === 'running'
                  ? 'gba:bg-amber-500'
                  : 'gba:bg-muted-foreground/40'
          }`}
        />
      </span>
      {cfg.label}
    </span>
  )
}

export const TraceSourcesTab: React.FC<TraceSourcesTabProps> = ({ model }) => {
  const sorted = useMemo(() => {
    const visible = model.nodes.filter(n => n.invocationCount > 0 || n.kind === 'orchestrator')
    return [...visible].sort((a, b) => {
      const ka = KIND_ORDER.indexOf(a.kind)
      const kb = KIND_ORDER.indexOf(b.kind)
      if (ka !== kb) return ka - kb
      return b.invocationCount - a.invocationCount
    })
  }, [model.nodes])

  if (sorted.length === 0) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:flex-1 gba:gap-3"
        data-testid="trace-sources-tab-empty"
      >
        <span className="gba:flex gba:h-12 gba:w-12 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted">
          <UsersThreeIcon className="gba:h-5 gba:w-5 gba:text-muted-foreground" weight="duotone" />
        </span>
        <p className="gba:text-sm gba:text-muted-foreground">No participants detected</p>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:overflow-hidden" data-testid="trace-sources-tab">
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto">
        <table className="gba:w-full gba:text-sm gba:border-separate gba:border-spacing-0">
          <thead className="gba:sticky gba:top-0 gba:z-10 gba:bg-muted/40 gba:backdrop-blur">
            <tr>
              <th className="gba:text-left gba:px-4 gba:py-2.5 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:border-b gba:border-border/50">
                Participant
              </th>
              <th className="gba:text-left gba:px-4 gba:py-2.5 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:border-b gba:border-border/50 gba:w-[140px]">
                Kind
              </th>
              <th className="gba:text-right gba:px-4 gba:py-2.5 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:border-b gba:border-border/50 gba:w-[120px]">
                Invocations
              </th>
              <th className="gba:text-right gba:px-4 gba:py-2.5 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:border-b gba:border-border/50 gba:w-[120px]">
                Duration
              </th>
              <th className="gba:text-left gba:px-4 gba:py-2.5 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:border-b gba:border-border/50 gba:w-[120px]">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(node => {
              const style = KIND_STYLE[node.kind]
              const KindIcon = style.icon
              return (
                <tr
                  key={node.id}
                  className="gba:hover:bg-muted/30 gba:transition-colors"
                  data-testid={`trace-sources-row-${node.id}`}
                >
                  <td className="gba:px-4 gba:py-3 gba:border-b gba:border-border/30">
                    <div className="gba:flex gba:items-center gba:gap-2.5 gba:min-w-0">
                      <span
                        className={`gba:flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded-md gba:shrink-0 ${style.iconBg} ${style.iconColor}`}
                      >
                        <KindIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
                      </span>
                      <span
                        className="gba:text-[13px] gba:font-medium gba:text-foreground gba:truncate"
                        title={node.label}
                      >
                        {node.label}
                      </span>
                    </div>
                  </td>
                  <td className="gba:px-4 gba:py-3 gba:border-b gba:border-border/30">
                    <span
                      className={`gba:inline-flex gba:items-center gba:px-2 gba:py-0.5 gba:rounded-full gba:text-[11px] gba:font-medium ${style.badgeBg} ${style.badgeText}`}
                    >
                      {style.label}
                    </span>
                  </td>
                  <td className="gba:px-4 gba:py-3 gba:text-right gba:tabular-nums gba:font-medium gba:text-foreground gba:border-b gba:border-border/30">
                    {node.invocationCount}
                  </td>
                  <td className="gba:px-4 gba:py-3 gba:text-right gba:tabular-nums gba:text-muted-foreground gba:border-b gba:border-border/30">
                    {formatDuration(node.totalDurationMs)}
                  </td>
                  <td className="gba:px-4 gba:py-3 gba:border-b gba:border-border/30">
                    <StatusDot status={node.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
