// Trace Lens — runs list (left rail).
//
// Renders the merged chat + workforce run rows with origin filter chips
// (All / Chat / Workforce), per-row status, source and agent badges, and a
// failed-status accent so broken runs stand out at a glance.

import { useMemo, useState } from 'react'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { Badge } from '@newwork/nw-design-system'
import type { TraceLensRunOrigin, TraceLensRunRow } from './traceLensRuns'

interface TraceLensRunListProps {
  runs: TraceLensRunRow[]
  loading: boolean
  error: string | null
  selectedId: string | null
  onSelect: (id: string) => void
}

type OriginFilter = 'all' | TraceLensRunOrigin

const ORIGIN_FILTERS: Array<{ id: OriginFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'chat', label: 'Chat' },
  { id: 'workforce', label: 'Workforce' }
]

const SOURCE_LABEL: Record<string, string> = {
  manual: 'Manual',
  schedule: 'Schedule',
  webhook: 'Webhook',
  inbound_email: 'Email'
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

const RunRow: React.FC<{
  run: TraceLensRunRow
  isSelected: boolean
  onSelect: (id: string) => void
}> = ({ run, isSelected, onSelect }) => {
  const failed = run.status === 'failed' || run.status === 'cancelled'
  const selectionClass = isSelected ? 'gba:bg-primary/10' : 'gba:hover:bg-muted/50'
  return (
    <button
      type="button"
      onClick={() => onSelect(run.sessionId)}
      className={`gba:flex gba:flex-col gba:gap-1 gba:w-full gba:text-left gba:px-3 gba:py-2 gba:border-b gba:border-border/20 gba:transition-colors ${selectionClass} ${
        failed ? 'gba:border-l-2 gba:border-l-rose-500' : ''
      }`}
      data-testid="trace-lens-run-item"
    >
      <span className="gba:text-[13px] gba:text-foreground gba:line-clamp-2">{run.input || '(no input)'}</span>
      <span className="gba:flex gba:items-center gba:gap-1.5 gba:flex-wrap gba:text-[11px] gba:text-muted-foreground">
        <Badge variant={statusBadgeVariant(run.status)}>{run.status}</Badge>
        {run.origin === 'workforce' && <Badge variant="outline">{SOURCE_LABEL[run.source ?? ''] ?? 'Workforce'}</Badge>}
        <span>{relativeTime(run.createdAt)}</span>
      </span>
      {run.agentName && (
        <span className="gba:text-[11px] gba:text-muted-foreground gba:truncate" title={run.agentName}>
          {run.agentName}
        </span>
      )}
    </button>
  )
}

export const TraceLensRunList: React.FC<TraceLensRunListProps> = ({ runs, loading, error, selectedId, onSelect }) => {
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all')

  const visibleRuns = useMemo(
    () => (originFilter === 'all' ? runs : runs.filter(run => run.origin === originFilter)),
    [runs, originFilter]
  )

  return (
    <div className="gba:flex gba:flex-col gba:w-64 gba:shrink-0 gba:border gba:border-border/40 gba:rounded-lg gba:bg-card gba:overflow-hidden">
      <div className="gba:px-3 gba:py-2 gba:border-b gba:border-border/40 gba:text-[12px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide">
        Runs
      </div>
      <div className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1.5 gba:border-b gba:border-border/40">
        {ORIGIN_FILTERS.map(filter => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setOriginFilter(filter.id)}
            className={`gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:transition-colors ${
              originFilter === filter.id
                ? 'gba:bg-primary gba:text-primary-foreground'
                : 'gba:text-muted-foreground gba:hover:bg-muted/60'
            }`}
            data-testid={`trace-lens-origin-filter-${filter.id}`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="gba:flex-1 gba:overflow-auto">
        {loading && visibleRuns.length === 0 && (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <SpinnerGapIcon className="gba:h-4 gba:w-4 gba:animate-spin gba:text-muted-foreground" />
          </div>
        )}
        {error && <p className="gba:px-3 gba:py-3 gba:text-[12px] gba:text-rose-600">{error}</p>}
        {!loading && !error && visibleRuns.length === 0 && (
          <p className="gba:px-3 gba:py-3 gba:text-[12px] gba:text-muted-foreground">No runs found.</p>
        )}
        {visibleRuns.map(run => (
          <RunRow key={run.sessionId} run={run} isSelected={run.sessionId === selectedId} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}
