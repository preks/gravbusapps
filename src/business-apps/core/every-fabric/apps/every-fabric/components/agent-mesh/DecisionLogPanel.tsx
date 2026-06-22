import { useEffect, useMemo, useRef } from 'react'
import {
  ArrowsClockwiseIcon,
  CompassIcon,
  HandWavingIcon,
  type Icon,
  LightbulbIcon,
  WrenchIcon
} from '@phosphor-icons/react'
import type { MeshDecision, MeshSummary, TraceFrame } from '../../utils/traceModel'
import { useAgentMeshI18n } from './useAgentMeshI18n'

interface DecisionLogPanelProps {
  /** Title of the simulation, typically the session task / first user prompt. */
  title: string
  /** Summary stats rendered in the header (runtime · tokens · cost). */
  summary: MeshSummary
  decisions: MeshDecision[]
  /** All non-decision frames within the visible clock window — rendered as compact log entries. */
  logFrames: TraceFrame[]
  /** Replay clock position used to dim future entries. */
  positionMs: number
  /** When `true`, the panel is in live mode and every entry is shown un-dimmed. */
  isLive: boolean
  /** Optional click handler — when provided, decisions become clickable to seek. */
  onSeekToDecision?: (decision: MeshDecision) => void
}

interface LogEntry {
  key: string
  offsetMs: number
  timestamp: string
  kind: 'decision' | 'frame'
  decision?: MeshDecision
  frame?: TraceFrame
}

const ICON_BY_CATEGORY: Record<string, Icon> = {
  skill: LightbulbIcon,
  tool_routing: WrenchIcon,
  reflection: ArrowsClockwiseIcon,
  hitl: HandWavingIcon,
  plan: CompassIcon
}

function decisionIcon(category: string): Icon {
  return ICON_BY_CATEGORY[category] ?? CompassIcon
}

function formatOffset(ms: number): string {
  if (ms <= 0) return '0.0s'
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms - minutes * 60_000) / 1000)
  return `${minutes}m ${seconds}s`
}

function formatDurationStat(ms: number): string {
  if (ms <= 0) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms - minutes * 60_000) / 1000)
  return `${minutes}m ${seconds}s`
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toString()
}

export const DecisionLogPanel: React.FC<DecisionLogPanelProps> = ({
  title,
  summary,
  decisions,
  logFrames,
  positionMs,
  isLive,
  onSeekToDecision
}) => {
  const { t } = useAgentMeshI18n()
  const merged = useMemo<LogEntry[]>(() => {
    const decisionEntries: LogEntry[] = decisions.map(d => ({
      key: `decision:${d.id}`,
      offsetMs: d.offsetMs,
      timestamp: d.timestamp,
      kind: 'decision',
      decision: d
    }))
    const frameEntries: LogEntry[] = logFrames.map(f => ({
      key: `frame:${f.id}`,
      offsetMs: f.offsetMs,
      timestamp: f.timestamp,
      kind: 'frame',
      frame: f
    }))
    return [...decisionEntries, ...frameEntries].sort((a, b) => a.offsetMs - b.offsetMs)
  }, [decisions, logFrames])

  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isLive) return
    const el = containerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [merged.length, isLive])

  const tokens = summary.costSummary?.tokens_used ?? 0
  const cost = summary.costSummary?.estimated_cost_usd ?? 0

  const stats = useMemo(() => {
    const items: string[] = []
    items.push(t('agent-mesh-decision-stat-runtime', { duration: formatDurationStat(summary.durationMs) }))
    if (tokens > 0) items.push(t('agent-mesh-decision-stat-tokens', { tokens: formatTokens(tokens) }))
    if (cost > 0) items.push(t('agent-mesh-decision-stat-cost', { cost: cost.toFixed(2) }))
    items.push(t('agent-mesh-decision-stat-count', { count: decisions.length }))
    return items
  }, [cost, decisions.length, summary.durationMs, t, tokens])

  return (
    <aside
      className="gba:flex gba:h-full gba:w-full gba:flex-col gba:rounded-[1.5rem] gba:border gba:border-border/60 gba:bg-card gba:overflow-hidden"
      data-testid="decision-log-panel"
      aria-label={t('agent-mesh-decision-aria')}
    >
      <header className="gba:border-b gba:border-border/40 gba:px-5 gba:py-4">
        <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.12em] gba:text-muted-foreground">
          {t('agent-mesh-decision-heading')}
        </p>
        <h2
          className="gba:mt-1 gba:text-[15px] gba:font-semibold gba:text-foreground gba:line-clamp-2"
          data-testid="decision-log-title"
        >
          {title}
        </h2>
        <p className="gba:mt-1 gba:text-[12px] gba:text-muted-foreground">
          {t('agent-mesh-decision-replay-summary', {
            agents: summary.subagentCount,
            tools: summary.toolCallCount
          })}
        </p>
        <p className="gba:mt-2 gba:text-[12px] gba:font-medium gba:text-foreground/80" data-testid="decision-log-stats">
          {stats.join(' · ')}
        </p>
      </header>

      <div ref={containerRef} className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:overscroll-contain">
        {merged.length === 0 ? (
          <p className="gba:px-5 gba:py-8 gba:text-center gba:text-xs gba:text-muted-foreground">
            {t('agent-mesh-decision-empty')}
          </p>
        ) : (
          <ol className="gba:py-1">
            {merged.map(entry => {
              const isFuture = !isLive && entry.offsetMs > positionMs + 1
              const dimClass = isFuture ? 'gba:opacity-40' : ''
              if (entry.kind === 'decision' && entry.decision) {
                const Icon = decisionIcon(entry.decision.category)
                const clickable = !!onSeekToDecision
                return (
                  <li key={entry.key} className={dimClass}>
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => entry.decision && onSeekToDecision?.(entry.decision)}
                      className={`gba:grid gba:w-full gba:grid-cols-[56px_minmax(0,1fr)] gba:gap-3 gba:px-5 gba:py-2.5 gba:text-left gba:transition-colors ${clickable ? 'gba:hover:bg-muted/40' : 'gba:cursor-default'}`}
                      data-testid={`decision-log-decision-${entry.decision.id}`}
                    >
                      <span className="gba:pt-0.5 gba:text-[11px] gba:font-mono gba:font-semibold gba:text-muted-foreground gba:tabular-nums">
                        {formatOffset(entry.offsetMs)}
                      </span>
                      <div className="gba:min-w-0">
                        <div className="gba:flex gba:items-center gba:gap-1.5">
                          <Icon className="gba:h-3 gba:w-3 gba:shrink-0 gba:text-primary" weight="fill" />
                          <p className="gba:flex-1 gba:truncate gba:text-[13px] gba:font-semibold gba:text-foreground">
                            {entry.decision.title}
                          </p>
                        </div>
                        <p className="gba:mt-0.5 gba:text-[12px] gba:leading-snug gba:text-muted-foreground gba:line-clamp-2">
                          {entry.decision.rationale}
                        </p>
                        <div className="gba:mt-1.5 gba:flex gba:flex-wrap gba:items-center gba:gap-1">
                          <span className="gba:inline-flex gba:items-center gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.06em] gba:text-muted-foreground">
                            {entry.decision.category}
                          </span>
                          {entry.decision.chosen && (
                            <span className="gba:inline-flex gba:items-center gba:rounded-full gba:bg-primary/10 gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-primary">
                              {entry.decision.chosen}
                            </span>
                          )}
                          {entry.decision.confidence !== undefined && (
                            <span className="gba:text-[10px] gba:text-muted-foreground/80">
                              {t('agent-mesh-decision-conf', {
                                percent: Math.round(entry.decision.confidence * 100)
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              }
              const frame = entry.frame!
              return (
                <li key={entry.key} className={dimClass} data-testid={`decision-log-frame-${frame.id}`}>
                  <div className="gba:grid gba:w-full gba:grid-cols-[56px_minmax(0,1fr)] gba:gap-3 gba:px-5 gba:py-1.5">
                    <span className="gba:text-[11px] gba:font-mono gba:text-muted-foreground/70 gba:tabular-nums gba:pt-0.5">
                      {formatOffset(frame.offsetMs)}
                    </span>
                    <div className="gba:min-w-0">
                      <div className="gba:flex gba:items-center gba:gap-1.5">
                        <span
                          className="gba:h-1.5 gba:w-1.5 gba:shrink-0 gba:rounded-full gba:bg-muted-foreground/40"
                          aria-hidden
                        />
                        <span className="gba:flex-1 gba:truncate gba:text-[12px] gba:text-foreground">
                          {frame.title}
                        </span>
                      </div>
                      {frame.summary && (
                        <p className="gba:mt-0.5 gba:pl-3 gba:text-[11px] gba:leading-snug gba:text-muted-foreground gba:line-clamp-1">
                          {frame.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </aside>
  )
}
