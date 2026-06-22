// Business Value Scoreboard for the Workforce overview hub.
//
// Turns the workspace metrics' business block + the value-assumptions module
// into the headline outcomes the press release promises: cases handled, time
// saved, SLA attainment, deflection rate, cost per case, and governance
// coverage. Measured KPIs are shown plainly; assumption-derived ones are
// tagged "Estimated" so the numbers stay honest.

import { BriefcaseIcon, CoinsIcon, GaugeIcon, HandshakeIcon, ShieldCheckIcon, TimerIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import React from 'react'
import { useWorkforceWorkspaceMetrics } from '../useWorkforceMetrics'
import { emptyBusinessMetrics, emptyMetricsTotals } from '../workforceTypes'
import {
  DEFAULT_VALUE_ASSUMPTIONS,
  computeValueFigures,
  formatMinutesSaved,
  formatPercent,
  formatUsd,
  type WorkforceValueAssumptions
} from '../workforceValueAssumptions'
import { ValueKpiTile } from './ValueKpiTile'
import translations from '../../../_i18n'

export interface ValueScoreboardProps {
  accessToken: string
  assumptions?: WorkforceValueAssumptions
}

type TranslateFn = (key: string, args?: Record<string, unknown>) => string

function slaTargetLabel(slaTargetMs: number, t: TranslateFn): string {
  const minutes = Math.round(slaTargetMs / 60000)
  return minutes >= 1
    ? t('value-sla-target-minutes', { minutes })
    : t('value-sla-target-seconds', { seconds: Math.round(slaTargetMs / 1000) })
}

export const ValueScoreboard: React.FC<ValueScoreboardProps> = ({
  accessToken,
  assumptions = DEFAULT_VALUE_ASSUMPTIONS
}) => {
  const { t } = useTranslation(translations)
  const { metrics } = useWorkforceWorkspaceMetrics({
    accessToken,
    window: 'week',
    slaTargetMs: assumptions.slaTargetMs
  })

  // Stay calm at rest: no runs in the window -> nothing to value yet.
  const totals = metrics?.totals ?? emptyMetricsTotals()
  if (!metrics || totals.runs === 0) return null

  const business = metrics.business ?? emptyBusinessMetrics()
  const figures = computeValueFigures(business, totals, assumptions)

  return (
    <section
      className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-card/40 gba:p-4"
      data-testid="workforce-value-scoreboard"
    >
      <header className="gba:mb-3 gba:flex gba:items-center gba:gap-2">
        <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">{t('value-scoreboard-title')}</h2>
        <span className="gba:text-[11px] gba:text-muted-foreground">{t('value-scoreboard-window')}</span>
        <span className="gba:ml-auto gba:text-[10px] gba:text-muted-foreground">
          {t('value-scoreboard-estimated-note')}
        </span>
      </header>

      <div
        className="gba:grid gba:grid-cols-2 gba:gap-3 gba:md:grid-cols-3 gba:xl:grid-cols-6"
        data-testid="workforce-value-scoreboard-grid"
      >
        <ValueKpiTile
          icon={BriefcaseIcon}
          label={t('value-kpi-cases')}
          value={String(figures.casesHandled)}
          hint={t('value-hint-runs-total', { runs: totals.runs })}
          tone="default"
          testId="value-kpi-cases"
        />
        <ValueKpiTile
          icon={TimerIcon}
          label={t('value-kpi-time-saved')}
          value={formatMinutesSaved(figures.minutesSaved)}
          hint={t('value-hint-baseline', { minutes: assumptions.baselineMinutesPerCase })}
          estimated
          tone="positive"
          testId="value-kpi-time-saved"
        />
        <ValueKpiTile
          icon={GaugeIcon}
          label={t('value-kpi-sla')}
          value={formatPercent(figures.slaAttainment)}
          hint={t('value-hint-sla', {
            under: business.under_sla_runs,
            measured: business.measured_runs,
            target: slaTargetLabel(assumptions.slaTargetMs, t)
          })}
          tone={figures.slaAttainment >= 0.9 ? 'positive' : 'warning'}
          testId="value-kpi-sla"
        />
        <ValueKpiTile
          icon={HandshakeIcon}
          label={t('value-kpi-deflection')}
          value={formatPercent(figures.deflectionRate)}
          hint={t('value-hint-deflection', { autonomous: business.autonomous_runs, cases: figures.casesHandled })}
          tone={figures.deflectionRate >= 0.8 ? 'positive' : 'default'}
          testId="value-kpi-deflection"
        />
        <ValueKpiTile
          icon={CoinsIcon}
          label={t('value-kpi-cost')}
          value={formatUsd(figures.costPerCaseUsd)}
          hint={t('value-hint-cost', { cost: formatUsd(totals.estimated_cost_usd) })}
          estimated
          tone="default"
          testId="value-kpi-cost"
        />
        <ValueKpiTile
          icon={ShieldCheckIcon}
          label={t('value-kpi-governance')}
          value={formatPercent(figures.governanceCoverage)}
          hint={t('value-hint-governance', {
            audited: business.audited_runs,
            runs: totals.runs,
            stops: figures.guardrailStops
          })}
          tone={figures.guardrailStops > 0 ? 'warning' : 'positive'}
          testId="value-kpi-governance"
        />
      </div>
    </section>
  )
}
