// Trace Lens — runs list (left rail).

import { useMemo, useState } from 'react'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { Badge, useTranslation } from '@newwork/nw-design-system'
import type { TraceLensRunOrigin, TraceLensRunRow } from './traceLensRuns'
import translations from '../../_i18n'

interface TraceLensRunListProps {
  runs: TraceLensRunRow[]
  loading: boolean
  error: string | null
  selectedId: string | null
  onSelect: (id: string) => void
}

type OriginFilter = 'all' | TraceLensRunOrigin

const SOURCE_KEY: Record<string, string> = {
  manual: 'trace-lens-runs-source-manual',
  schedule: 'trace-lens-runs-source-schedule',
  webhook: 'trace-lens-runs-source-webhook',
  inbound_email: 'trace-lens-runs-source-email'
}

function statusBadgeVariant(status: string | undefined): 'default' | 'destructive' | 'outline' {
  if (status === 'completed') return 'default'
  if (status === 'failed' || status === 'cancelled') return 'destructive'
  return 'outline'
}

function relativeTime(iso: string | undefined, t: (key: string, vars?: Record<string, unknown>) => string): string {
  if (!iso) return ''
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  const diff = Date.now() - ms
  const min = Math.floor(diff / 60_000)
  if (min < 1) return t('trace-lens-runs-time-just-now')
  if (min < 60) return t('trace-lens-runs-time-minutes', { count: min })
  const hr = Math.floor(min / 60)
  if (hr < 24) return t('trace-lens-runs-time-hours', { count: hr })
  return t('trace-lens-runs-time-days', { count: Math.floor(hr / 24) })
}

const RunRow: React.FC<{
  run: TraceLensRunRow
  isSelected: boolean
  onSelect: (id: string) => void
  t: (key: string, vars?: Record<string, unknown>) => string
}> = ({ run, isSelected, onSelect, t }) => {
  const failed = run.status === 'failed' || run.status === 'cancelled'
  const selectionClass = isSelected ? 'gba:bg-primary/10' : 'gba:hover:bg-muted/50'
  const sourceKey = run.source ? SOURCE_KEY[run.source] : undefined
  const sourceLabel = sourceKey ? t(sourceKey) : t('trace-lens-workforce')

  return (
    <button
      type="button"
      onClick={() => onSelect(run.sessionId)}
      className={`gba:flex gba:flex-col gba:gap-1 gba:w-full gba:text-left gba:px-3 gba:py-2 gba:border-b gba:border-border/20 gba:transition-colors ${selectionClass} ${
        failed ? 'gba:border-l-2 gba:border-l-rose-500' : ''
      }`}
      data-testid="trace-lens-run-item"
    >
      <span className="gba:text-[13px] gba:text-foreground gba:line-clamp-2">
        {run.input || t('trace-lens-runs-no-input')}
      </span>
      <span className="gba:flex gba:items-center gba:gap-1.5 gba:flex-wrap gba:text-[11px] gba:text-muted-foreground">
        <Badge variant={statusBadgeVariant(run.status)}>{run.status}</Badge>
        {run.origin === 'workforce' && <Badge variant="outline">{sourceLabel}</Badge>}
        <span>{relativeTime(run.createdAt, t)}</span>
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
  const { t } = useTranslation(translations)
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all')

  const originFilters = useMemo(
    (): Array<{ id: OriginFilter; label: string }> => [
      { id: 'all', label: t('trace-lens-runs-filter-all') },
      { id: 'chat', label: t('trace-lens-runs-filter-chat') },
      { id: 'workforce', label: t('trace-lens-runs-filter-workforce') }
    ],
    [t]
  )

  const visibleRuns = useMemo(
    () => (originFilter === 'all' ? runs : runs.filter(run => run.origin === originFilter)),
    [runs, originFilter]
  )

  return (
    <div className="gba:flex gba:flex-col gba:w-64 gba:shrink-0 gba:border gba:border-border/40 gba:rounded-lg gba:bg-card gba:overflow-hidden">
      <div className="gba:px-3 gba:py-2 gba:border-b gba:border-border/40 gba:text-[12px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide">
        {t('trace-lens-runs-title')}
      </div>
      <div className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1.5 gba:border-b gba:border-border/40">
        {originFilters.map(filter => (
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
          <p className="gba:px-3 gba:py-3 gba:text-[12px] gba:text-muted-foreground">{t('trace-lens-runs-empty')}</p>
        )}
        {visibleRuns.map(run => (
          <RunRow key={run.sessionId} run={run} isSelected={run.sessionId === selectedId} onSelect={onSelect} t={t} />
        ))}
      </div>
    </div>
  )
}
