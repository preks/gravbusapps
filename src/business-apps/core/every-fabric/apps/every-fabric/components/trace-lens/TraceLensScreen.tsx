// Trace Lens — a standalone LangSmith-style debugger for Every Fabric runs.
//
// Left: runs list. Center: waterfall + nested span tree (tools / subagents /
// experts / skills / decisions / HITL, in execution order with timings).
// Right: selected-span detail (full input / output / metadata). Top-right:
// "Copy for Cursor" exports the whole run as human- + machine-readable text.
//
// Data comes entirely from the existing prompt-manager HTTP API, so it works
// locally and against deployed environments without backend changes.

import { useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  ArrowsClockwiseIcon,
  CheckIcon,
  ClipboardTextIcon,
  MagnifyingGlassIcon,
  SpinnerGapIcon
} from '@phosphor-icons/react'
import { Badge, Button } from '@newwork/nw-design-system'
import type { DeepAgentSession } from '../../types/enterpriseAgent'
import { formatMs, type TraceSpan } from './traceLensModel'
import { formatRunForCursor } from './traceLensExport'
import { useTraceLens } from './useTraceLens'
import { TraceLensWaterfall } from './TraceLensWaterfall'
import { TraceLensSpanDetail } from './TraceLensSpanDetail'

interface TraceLensScreenProps {
  accessToken: string
  onBack: () => void
  initialSessionId?: string | null
}

function statusBadgeVariant(status: string | undefined): 'default' | 'destructive' | 'outline' {
  if (status === 'completed') return 'default'
  if (status === 'failed' || status === 'cancelled') return 'destructive'
  return 'outline'
}

function relativeTime(iso?: string): string {
  if (!iso) return ''
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  const diff = Date.now() - ms
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

const RunsList: React.FC<{
  sessions: DeepAgentSession[]
  loading: boolean
  error: string | null
  selectedId: string | null
  onSelect: (id: string) => void
}> = ({ sessions, loading, error, selectedId, onSelect }) => (
  <div className="gba:flex gba:flex-col gba:w-64 gba:shrink-0 gba:border gba:border-border/40 gba:rounded-lg gba:bg-card gba:overflow-hidden">
    <div className="gba:px-3 gba:py-2 gba:border-b gba:border-border/40 gba:text-[12px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide">
      Runs
    </div>
    <div className="gba:flex-1 gba:overflow-auto">
      {loading && sessions.length === 0 && (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <SpinnerGapIcon className="gba:h-4 gba:w-4 gba:animate-spin gba:text-muted-foreground" />
        </div>
      )}
      {error && <p className="gba:px-3 gba:py-3 gba:text-[12px] gba:text-rose-600">{error}</p>}
      {!loading && !error && sessions.length === 0 && (
        <p className="gba:px-3 gba:py-3 gba:text-[12px] gba:text-muted-foreground">No runs found.</p>
      )}
      {sessions.map(s => {
        const isSelected = s.session_id === selectedId
        return (
          <button
            key={s.session_id}
            type="button"
            onClick={() => onSelect(s.session_id)}
            className={`gba:flex gba:flex-col gba:gap-1 gba:w-full gba:text-left gba:px-3 gba:py-2 gba:border-b gba:border-border/20 gba:transition-colors ${
              isSelected ? 'gba:bg-primary/10' : 'gba:hover:bg-muted/50'
            }`}
            data-testid="trace-lens-run-item"
          >
            <span className="gba:text-[13px] gba:text-foreground gba:line-clamp-2">{s.input || '(no input)'}</span>
            <span className="gba:flex gba:items-center gba:gap-2 gba:text-[11px] gba:text-muted-foreground">
              <Badge variant={statusBadgeVariant(s.status)}>{s.status}</Badge>
              <span>{relativeTime(s.created_at)}</span>
            </span>
          </button>
        )
      })}
    </div>
  </div>
)

const SummaryStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="gba:flex gba:flex-col">
    <span className="gba:text-[10px] gba:uppercase gba:tracking-wide gba:text-muted-foreground">{label}</span>
    <span className="gba:text-[13px] gba:font-medium gba:text-foreground gba:tabular-nums">{value}</span>
  </div>
)

export const TraceLensScreen: React.FC<TraceLensScreenProps> = ({ accessToken, onBack, initialSessionId }) => {
  const {
    sessions,
    loadingSessions,
    sessionsError,
    refreshSessions,
    selectedId,
    selectSession,
    model,
    loadingModel,
    modelError,
    refreshModel
  } = useTraceLens(accessToken, initialSessionId)

  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null)
  const [filterText, setFilterText] = useState('')
  const [showMarkers, setShowMarkers] = useState(true)
  const [copied, setCopied] = useState(false)

  const filteredSpans = useMemo(() => {
    if (!model) return []
    const q = filterText.trim().toLowerCase()
    return model.flat.filter(span => {
      if (!showMarkers && span.marker) return false
      if (!q) return true
      return span.name.toLowerCase().includes(q) || span.kind.includes(q)
    })
  }, [model, filterText, showMarkers])

  const handleSelectRun = (id: string): void => {
    setSelectedSpan(null)
    selectSession(id)
  }

  const handleCopyForCursor = (): void => {
    if (!model) return
    void navigator.clipboard?.writeText(formatRunForCursor(model))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const summary = model?.summary

  return (
    <div
      className="gba:flex gba:h-full gba:w-full gba:flex-col gba:bg-background gba:p-4 sm:gba:p-5 lg:gba:p-6"
      data-testid="trace-lens-screen"
    >
      <header className="gba:flex gba:items-start gba:gap-4 gba:mb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to workspace"
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-9 gba:w-9 gba:shrink-0 gba:rounded-full gba:border gba:border-border/60 gba:bg-background gba:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:mt-1"
          data-testid="trace-lens-back"
        >
          <ArrowLeftIcon className="gba:h-4 gba:w-4" />
        </button>
        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <h1 className="gba:text-[22px] gba:font-semibold gba:leading-tight gba:text-foreground">Trace Lens</h1>
            {summary && <Badge variant={statusBadgeVariant(summary.status)}>{summary.status}</Badge>}
            {summary?.route && <Badge variant="outline">{summary.route}</Badge>}
          </div>
          <p className="gba:mt-0.5 gba:text-[13px] gba:text-muted-foreground gba:truncate">
            LangSmith-style debugger — tools, sub-agents, experts, skills and decisions in execution order.
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
          <Button variant="outline" size="sm" onClick={refreshSessions} data-testid="trace-lens-refresh">
            <ArrowsClockwiseIcon className="gba:h-3.5 gba:w-3.5 gba:mr-1.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleCopyForCursor} disabled={!model} data-testid="trace-lens-copy-cursor">
            {copied ? (
              <CheckIcon className="gba:h-3.5 gba:w-3.5 gba:mr-1.5" />
            ) : (
              <ClipboardTextIcon className="gba:h-3.5 gba:w-3.5 gba:mr-1.5" />
            )}
            {copied ? 'Copied' : 'Copy for Cursor'}
          </Button>
        </div>
      </header>

      <div className="gba:flex gba:flex-1 gba:min-h-0 gba:gap-3">
        <RunsList
          sessions={sessions}
          loading={loadingSessions}
          error={sessionsError}
          selectedId={selectedId}
          onSelect={handleSelectRun}
        />

        <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0 gba:gap-3">
          {summary && (
            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-6 gba:gap-y-2 gba:rounded-lg gba:border gba:border-border/40 gba:bg-card gba:px-4 gba:py-2.5">
              <SummaryStat label="TTFT" value={formatMs(summary.ttftMs)} />
              <SummaryStat label="Duration" value={formatMs(summary.durationMs ?? summary.totalDurationMs)} />
              <SummaryStat label="Tools" value={String(summary.toolCount)} />
              <SummaryStat label="Sub-agents" value={String(summary.subagentCount)} />
              <SummaryStat label="Experts" value={String(summary.expertCount)} />
              <SummaryStat label="Skills" value={String(summary.skillCount)} />
              <SummaryStat label="Decisions" value={String(summary.decisionCount)} />
              {summary.failedToolCount > 0 && <SummaryStat label="Failed" value={String(summary.failedToolCount)} />}
              {summary.tokensUsed !== undefined && <SummaryStat label="Tokens" value={String(summary.tokensUsed)} />}
              {summary.estimatedCostUsd !== undefined && (
                <SummaryStat label="Cost" value={`$${summary.estimatedCostUsd.toFixed(4)}`} />
              )}
            </div>
          )}

          {model && model.diagnostics.warnings.length > 0 && (
            <div className="gba:flex gba:flex-col gba:gap-1 gba:rounded-lg gba:border gba:border-amber-500/30 gba:bg-amber-500/5 gba:px-4 gba:py-2.5">
              {model.diagnostics.warnings.map((w, i) => (
                <span key={i} className="gba:text-[12px] gba:text-amber-700">
                  ⚠️ {w}
                </span>
              ))}
            </div>
          )}

          <div className="gba:flex gba:flex-1 gba:min-h-0 gba:gap-3">
            {/* Waterfall */}
            <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0 gba:rounded-lg gba:border gba:border-border/40 gba:bg-card gba:overflow-hidden">
              <div className="gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:border-b gba:border-border/40">
                <div className="gba:relative gba:flex-1 gba:max-w-xs">
                  <MagnifyingGlassIcon className="gba:absolute gba:left-2 gba:top-1/2 gba:-translate-y-1/2 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                  <input
                    value={filterText}
                    onChange={e => setFilterText(e.target.value)}
                    placeholder="Filter steps…"
                    className="gba:w-full gba:rounded-md gba:border gba:border-border/60 gba:bg-background gba:py-1 gba:pl-7 gba:pr-2 gba:text-[12px] gba:text-foreground gba:outline-none focus:gba:border-primary"
                  />
                </div>
                <label className="gba:flex gba:items-center gba:gap-1.5 gba:text-[12px] gba:text-muted-foreground gba:cursor-pointer">
                  <input type="checkbox" checked={showMarkers} onChange={e => setShowMarkers(e.target.checked)} />
                  Show events
                </label>
                <span className="gba:ml-auto gba:text-[11px] gba:text-muted-foreground gba:tabular-nums">
                  {filteredSpans.length} steps
                </span>
              </div>
              <div className="gba:flex-1 gba:overflow-auto">
                {!selectedId && (
                  <p className="gba:px-4 gba:py-8 gba:text-center gba:text-sm gba:text-muted-foreground">
                    Select a run to inspect its trace.
                  </p>
                )}
                {selectedId && loadingModel && (
                  <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:py-10 gba:text-sm gba:text-muted-foreground">
                    <SpinnerGapIcon className="gba:h-4 gba:w-4 gba:animate-spin" />
                    Loading trace…
                  </div>
                )}
                {selectedId && modelError && (
                  <div className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:py-10 gba:text-center">
                    <p className="gba:text-sm gba:text-rose-600">{modelError}</p>
                    <Button variant="secondary" size="sm" onClick={refreshModel}>
                      Retry
                    </Button>
                  </div>
                )}
                {selectedId && !loadingModel && !modelError && model && (
                  <TraceLensWaterfall
                    spans={filteredSpans}
                    totalMs={model.totalMs}
                    selectedSeq={selectedSpan?.seq ?? null}
                    onSelect={setSelectedSpan}
                  />
                )}
              </div>
            </div>

            {/* Detail */}
            <div className="gba:flex gba:flex-col gba:w-96 gba:shrink-0 gba:rounded-lg gba:border gba:border-border/40 gba:bg-card gba:overflow-hidden">
              <TraceLensSpanDetail span={selectedSpan} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
