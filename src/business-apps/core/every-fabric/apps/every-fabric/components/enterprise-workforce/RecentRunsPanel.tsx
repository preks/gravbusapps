// Recent-runs section appended to the Workforce Agent configuration view.
//
// Pure presentation: the data + mutations come from useWorkforceRuns;
// clicking a row hands the run to the parent, which is responsible for
// opening the run detail drawer.

import { ArrowsClockwiseIcon, ClockIcon, CoinsIcon, FlaskIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { WorkforceRun } from './workforceTypes'
import { formatTimestamp, runCredits, runDurationLabel, statusVisualForRun, shortenInput } from './runDisplay'
import translations from '../../_i18n'

export interface RecentRunsPanelProps {
  runs: WorkforceRun[]
  isLoading: boolean
  isPolling: boolean
  errorMessage?: string | null
  onRefresh: () => void
  onTestRun: () => void
  onOpenRun: (run: WorkforceRun) => void
}

export const RecentRunsPanel: React.FC<RecentRunsPanelProps> = ({
  runs,
  isLoading,
  isPolling,
  errorMessage,
  onRefresh,
  onTestRun,
  onOpenRun
}) => {
  const { t } = useTranslation(translations)
  return (
    <section
      className="gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-5 gba:shadow-sm"
      data-testid="workforce-recent-runs"
    >
      <header className="gba:mb-4 gba:flex gba:items-start gba:justify-between gba:gap-3">
        <div>
          <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">{t('recent-runs-title')}</h2>
          <p className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground">{t('recent-runs-desc')}</p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-1.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="gba:inline-flex gba:h-8 gba:items-center gba:justify-center gba:gap-1.5 gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-2.5 gba:text-xs gba:font-medium gba:text-foreground gba:hover:bg-muted/60 gba:disabled:cursor-not-allowed gba:disabled:opacity-50"
            data-testid="workforce-recent-runs-refresh"
            aria-label={t('recent-runs-refresh-aria')}
          >
            {isLoading || isPolling ? (
              <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
            ) : (
              <ArrowsClockwiseIcon className="gba:h-3.5 gba:w-3.5" />
            )}
            {t('recent-runs-refresh')}
          </button>
          <button
            type="button"
            onClick={onTestRun}
            className="gba:inline-flex gba:h-8 gba:items-center gba:justify-center gba:gap-1.5 gba:rounded-md gba:bg-primary gba:px-3 gba:text-xs gba:font-medium gba:text-primary-foreground gba:hover:bg-primary/90"
            data-testid="workforce-recent-runs-test"
          >
            <FlaskIcon className="gba:h-3.5 gba:w-3.5" />
            {t('detail-test-run')}
          </button>
        </div>
      </header>

      {errorMessage && (
        <div
          className="gba:mb-3 gba:rounded-lg gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
          role="alert"
          data-testid="workforce-recent-runs-error"
        >
          {errorMessage}
        </div>
      )}

      {isLoading && runs.length === 0 ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8 gba:text-muted-foreground">
          <SpinnerGapIcon className="gba:mr-2 gba:h-4 gba:w-4 gba:animate-spin" />
          <span className="gba:text-sm">{t('recent-runs-loading')}</span>
        </div>
      ) : runs.length === 0 ? (
        <div className="gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/30 gba:px-4 gba:py-6 gba:text-center">
          <p className="gba:text-sm gba:font-medium gba:text-foreground">{t('recent-runs-empty-title')}</p>
          <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground">{t('recent-runs-empty-desc')}</p>
        </div>
      ) : (
        <ul className="gba:divide-y gba:divide-border/60">
          {runs.map(run => {
            const visual = statusVisualForRun(run)
            const credits = runCredits(run)
            const duration = runDurationLabel(run)
            return (
              <li key={run.session_id}>
                <button
                  type="button"
                  onClick={() => onOpenRun(run)}
                  className="gba:flex gba:w-full gba:items-start gba:justify-between gba:gap-3 gba:px-1 gba:py-3 gba:text-left gba:transition-colors gba:hover:bg-muted/40 gba:rounded-md"
                  data-testid={`workforce-run-row-${run.session_id}`}
                >
                  <div className="gba:min-w-0 gba:flex-1">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span
                        className={`gba:inline-flex gba:items-center gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${visual.pillClass}`}
                      >
                        {visual.label}
                      </span>
                      <span className="gba:truncate gba:text-xs gba:text-muted-foreground">
                        {formatTimestamp(run.created_at)}
                      </span>
                    </div>
                    <p className="gba:mt-1 gba:truncate gba:text-sm gba:text-foreground">
                      {shortenInput(run.input) || t('recent-runs-empty-input')}
                    </p>
                  </div>
                  <div className="gba:flex gba:shrink-0 gba:flex-col gba:items-end gba:gap-1 gba:text-[11px] gba:text-muted-foreground">
                    {duration && (
                      <span className="gba:inline-flex gba:items-center gba:gap-1">
                        <ClockIcon className="gba:h-3 gba:w-3" />
                        {duration}
                      </span>
                    )}
                    <span className="gba:inline-flex gba:items-center gba:gap-1">
                      <CoinsIcon className="gba:h-3 gba:w-3" />
                      {t('recent-runs-credits', { credits })}
                    </span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
