// Phase A: Runs tab inside the Workforce Agent detail screen.
//
// Filterable, sortable, paginated list of every run attributed to the
// agent. Each row deep-links into the Trace tab (focusing the run) and
// also exposes a quick "open drawer" path for inline inspection. The
// underlying hook does server-side filtering via WorkforceRunListParams
// so we never pull the full history into the browser.

import { ArrowsClockwiseIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import React, { useMemo, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { useWorkforceAgentRuns } from '../../useWorkforceAgentRuns'
import type { WorkforceRun, WorkforceRunListParams, WorkforceRunSource, WorkforceRunStatus } from '../../workforceTypes'
import { formatTimestamp, runCredits, runDurationLabel, statusVisualForRun, shortenInput } from '../../runDisplay'
import translations from '../../../../_i18n'

export interface AgentRunsTabProps {
  accessToken: string
  agentId: string
  onOpenRun: (run: WorkforceRun) => void
}

const PAGE_SIZE = 25

const STATUS_OPTIONS: ReadonlyArray<{ value: WorkforceRunStatus | ''; labelKey: string }> = [
  { value: '', labelKey: 'runs-filter-all-statuses' },
  { value: 'running', labelKey: 'runs-filter-running' },
  { value: 'completed', labelKey: 'runs-filter-completed' },
  { value: 'failed', labelKey: 'runs-filter-failed' },
  { value: 'cancelled', labelKey: 'runs-filter-cancelled' },
  { value: 'waiting_for_human', labelKey: 'runs-filter-waiting-human' }
]

const SOURCE_OPTIONS: ReadonlyArray<{ value: WorkforceRunSource | ''; labelKey: string }> = [
  { value: '', labelKey: 'runs-filter-all-sources' },
  { value: 'manual', labelKey: 'runs-filter-manual' },
  { value: 'schedule', labelKey: 'runs-filter-schedule' },
  { value: 'webhook', labelKey: 'runs-filter-webhook' },
  { value: 'inbound_email', labelKey: 'runs-filter-inbound-email' }
]

interface Filters {
  status: WorkforceRunStatus | ''
  source: WorkforceRunSource | ''
  q: string
}

const EMPTY_FILTERS: Filters = { status: '', source: '', q: '' }

function filtersToParams(filters: Filters, page: number): WorkforceRunListParams {
  const params: WorkforceRunListParams = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE
  }
  if (filters.status) params.status = filters.status
  if (filters.source) params.source = filters.source
  if (filters.q.trim()) params.q = filters.q.trim()
  return params
}

export const AgentRunsTab: React.FC<AgentRunsTabProps> = ({ accessToken, agentId, onOpenRun }) => {
  const { t } = useTranslation(translations)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = useState(0)

  const params = useMemo(() => filtersToParams(filters, page), [filters, page])
  const { runs, total, isLoading, error, refetch } = useWorkforceAgentRuns({
    accessToken,
    agentId,
    params
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setPage(0)
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return (
    <section
      className="gba:flex gba:flex-col gba:gap-3 gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-5"
      data-testid="workforce-runs-tab"
    >
      <header className="gba:flex gba:flex-wrap gba:items-center gba:gap-3">
        <div className="gba:flex gba:flex-1 gba:items-center gba:gap-2">
          <div className="gba:relative gba:flex-1">
            <MagnifyingGlassIcon className="gba:absolute gba:left-2.5 gba:top-1/2 gba:h-3.5 gba:w-3.5 gba:-translate-y-1/2 gba:text-muted-foreground" />
            <input
              type="search"
              value={filters.q}
              onChange={event => updateFilter('q', event.target.value)}
              placeholder={t('runs-search-placeholder')}
              className="gba:h-8 gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-background gba:pl-8 gba:pr-3 gba:text-xs gba:text-foreground"
              data-testid="workforce-runs-search"
            />
          </div>
          <select
            value={filters.status}
            onChange={event => updateFilter('status', event.target.value as WorkforceRunStatus | '')}
            className="gba:h-8 gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-2 gba:text-xs"
            data-testid="workforce-runs-status-filter"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value || 'all'} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
          <select
            value={filters.source}
            onChange={event => updateFilter('source', event.target.value as WorkforceRunSource | '')}
            className="gba:h-8 gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-2 gba:text-xs"
            data-testid="workforce-runs-source-filter"
          >
            {SOURCE_OPTIONS.map(opt => (
              <option key={opt.value || 'all'} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="gba:inline-flex gba:h-8 gba:items-center gba:gap-1.5 gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-2.5 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground"
          data-testid="workforce-runs-refresh"
        >
          <ArrowsClockwiseIcon className="gba:h-3.5 gba:w-3.5" />
          {t('runs-refresh')}
        </button>
      </header>

      {error && (
        <div
          className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
          data-testid="workforce-runs-error"
        >
          {error}
        </div>
      )}

      {isLoading && runs.length === 0 ? (
        <p className="gba:py-6 gba:text-center gba:text-xs gba:text-muted-foreground">{t('runs-loading')}</p>
      ) : runs.length === 0 ? (
        <p
          className="gba:py-8 gba:text-center gba:text-xs gba:text-muted-foreground"
          data-testid="workforce-runs-empty"
        >
          {t('runs-empty')}
        </p>
      ) : (
        <ul className="gba:divide-y gba:divide-border/60">
          {runs.map(run => {
            const visual = statusVisualForRun(run)
            const duration = runDurationLabel(run)
            return (
              <li key={run.session_id}>
                <button
                  type="button"
                  onClick={() => onOpenRun(run)}
                  className="gba:flex gba:w-full gba:items-center gba:gap-3 gba:rounded-md gba:px-1 gba:py-2 gba:text-left gba:transition-colors gba:hover:bg-muted/40"
                  data-testid="workforce-runs-row"
                >
                  <span
                    className={`gba:inline-flex gba:shrink-0 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium ${visual.pillClass}`}
                  >
                    {visual.label}
                  </span>
                  <div className="gba:min-w-0 gba:flex-1">
                    <p className="gba:truncate gba:text-xs gba:font-medium gba:text-foreground">
                      {shortenInput(run.input)}
                    </p>
                    <p className="gba:text-[11px] gba:text-muted-foreground">
                      {formatTimestamp(run.created_at)}
                      {run.source ? ` · ${run.source.replace(/_/g, ' ')}` : ''}
                      {duration ? ` · ${duration}` : ''}
                      {` · ${t('runs-row-credits', { credits: runCredits(run) })}`}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {total > PAGE_SIZE && (
        <footer className="gba:flex gba:items-center gba:justify-between gba:pt-2 gba:text-[11px] gba:text-muted-foreground">
          <span>{t('runs-page', { page: page + 1, totalPages, total })}</span>
          <div className="gba:flex gba:gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage(prev => Math.max(0, prev - 1))}
              className="gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1 gba:disabled:opacity-50"
              data-testid="workforce-runs-prev-page"
            >
              {t('runs-prev')}
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage(prev => prev + 1)}
              className="gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1 gba:disabled:opacity-50"
              data-testid="workforce-runs-next-page"
            >
              {t('runs-next')}
            </button>
          </div>
        </footer>
      )}
    </section>
  )
}
