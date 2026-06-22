// Phase A: Overview tab inside the Workforce Agent detail screen.
//
// Three sections, top to bottom:
//   1. KPI strip — today / week / month credits + runs.
//   2. Source breakdown — where this agent's work comes from.
//   3. Recent runs — last 5, with a deep link into the Runs / Trace tabs.
//
// Pulls one bundled metrics request via useWorkforceAgentSummary.
// Recent runs are owned by the parent detail screen so test runs,
// the side drawer, and the overview list share one polled source.

import { ArrowSquareOutIcon, CoinsIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import React, { useEffect, useRef } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { useWorkforceAgentSummary } from '../../useWorkforceAgentSummary'
import { hasInFlightRun } from '../../useWorkforceRuns'
import { CreditTrendChart } from '../../dashboards/CreditTrendChart'
import { RunOutcomeChart } from '../../dashboards/RunOutcomeChart'
import { SourceBreakdownChart } from '../../dashboards/SourceBreakdownChart'
import { RecentRunsPanel } from '../../RecentRunsPanel'
import { emptyMetricsTotals, type WorkforceMetricsTotals, type WorkforceRun } from '../../workforceTypes'
import translations from '../../../../_i18n'

export interface AgentOverviewRecentRuns {
  runs: WorkforceRun[]
  isLoading: boolean
  isPolling: boolean
  error: string | null
  onRefresh: () => void
}

export interface AgentOverviewTabProps {
  accessToken: string
  agentId: string
  recentRuns: AgentOverviewRecentRuns
  onOpenRun: (run: WorkforceRun) => void
  onTestRun: () => void
  onViewAllRuns: () => void
}

const KPI_CARD_CLASS =
  'gba:flex gba:flex-col gba:gap-1 gba:rounded-xl gba:border gba:border-border/60 gba:bg-card gba:px-4 gba:py-3'

function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0'
  return new Intl.NumberFormat().format(value)
}

function readCredits(totals: WorkforceMetricsTotals | undefined): number {
  return totals?.total_credits ?? 0
}

function readRuns(totals: WorkforceMetricsTotals | undefined): number {
  return totals?.runs ?? 0
}

interface KpiStripProps {
  todayCredits: number
  todayRuns: number
  weekCredits: number
  weekRuns: number
  monthCredits: number
  monthRuns: number
  isLoading: boolean
}

const KpiStrip: React.FC<KpiStripProps> = ({
  todayCredits,
  todayRuns,
  weekCredits,
  weekRuns,
  monthCredits,
  monthRuns,
  isLoading
}) => {
  const { t } = useTranslation(translations)
  const cards = [
    { labelKey: 'overview-kpi-today', credits: todayCredits, runs: todayRuns, testId: 'today' },
    { labelKey: 'overview-kpi-week', credits: weekCredits, runs: weekRuns, testId: 'week' },
    { labelKey: 'overview-kpi-month', credits: monthCredits, runs: monthRuns, testId: 'month' }
  ] as const

  return (
    <section className="gba:grid gba:grid-cols-1 gba:gap-3 gba:sm:grid-cols-3" data-testid="workforce-overview-kpis">
      {cards.map(card => (
        <div key={card.testId} className={KPI_CARD_CLASS} data-testid={`workforce-overview-kpi-${card.testId}`}>
          <div className="gba:flex gba:items-center gba:justify-between">
            <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">{t(card.labelKey)}</span>
            {isLoading && <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin gba:text-muted-foreground" />}
          </div>
          <div className="gba:flex gba:items-baseline gba:gap-1.5">
            <CoinsIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            <span className="gba:text-xl gba:font-semibold gba:text-foreground">{formatNumber(card.credits)}</span>
            <span className="gba:text-[11px] gba:text-muted-foreground">{t('overview-kpi-credits')}</span>
          </div>
          <p className="gba:text-[11px] gba:text-muted-foreground">{t('overview-kpi-runs', { count: card.runs })}</p>
        </div>
      ))}
    </section>
  )
}

export const AgentOverviewTab: React.FC<AgentOverviewTabProps> = ({
  accessToken,
  agentId,
  recentRuns,
  onOpenRun,
  onTestRun,
  onViewAllRuns
}) => {
  const { t } = useTranslation(translations)
  const {
    summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary
  } = useWorkforceAgentSummary({
    accessToken,
    agentId
  })

  const { runs, isLoading: runsLoading, isPolling: runsPolling, error: runsError, onRefresh } = recentRuns

  // Recent runs auto-poll until every visible run is terminal, but the KPI
  // summary is fetched once on mount. Refresh credits when the last in-flight
  // run finishes so Today / week / month totals stay in sync.
  const hadInFlightRunsRef = useRef(false)
  useEffect(() => {
    const inFlight = hasInFlightRun(runs)
    if (hadInFlightRunsRef.current && !inFlight) {
      void refetchSummary()
    }
    hadInFlightRunsRef.current = inFlight
  }, [runs, refetchSummary])

  const handleRefreshRuns = () => {
    onRefresh()
    void refetchSummary()
  }

  return (
    <div className="gba:space-y-5" data-testid="workforce-overview-tab">
      <KpiStrip
        todayCredits={readCredits(summary?.today.totals)}
        todayRuns={readRuns(summary?.today.totals)}
        weekCredits={readCredits(summary?.week.totals)}
        weekRuns={readRuns(summary?.week.totals)}
        monthCredits={readCredits(summary?.month.totals)}
        monthRuns={readRuns(summary?.month.totals)}
        isLoading={summaryLoading}
      />

      {summaryError && (
        <div
          className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
          data-testid="workforce-overview-summary-error"
        >
          {summaryError}
        </div>
      )}

      <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:lg:grid-cols-3">
        <CreditTrendChart
          buckets={summary?.week.daily_buckets ?? []}
          totalCredits={readCredits(summary?.week.totals)}
          estimatedUsd={summary?.week.totals?.estimated_cost_usd ?? 0}
        />
        <RunOutcomeChart totals={summary?.week.totals ?? emptyMetricsTotals()} />
        <SourceBreakdownChart entries={summary?.source_breakdown.entries ?? []} />
      </div>

      <div className="gba:flex gba:items-center gba:justify-between">
        <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">{t('recent-runs-title')}</h2>
        <button
          type="button"
          onClick={onViewAllRuns}
          className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground"
          data-testid="workforce-overview-view-all-runs"
        >
          {t('overview-view-all-runs')}
          <ArrowSquareOutIcon className="gba:h-3 gba:w-3" />
        </button>
      </div>
      <RecentRunsPanel
        runs={runs}
        isLoading={runsLoading}
        isPolling={runsPolling}
        errorMessage={runsError}
        onRefresh={handleRefreshRuns}
        onTestRun={onTestRun}
        onOpenRun={onOpenRun}
      />
    </div>
  )
}
