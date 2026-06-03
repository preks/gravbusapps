// Business Value Scoreboard for the Workforce overview hub.
//
// Turns the workspace metrics' business block + the value-assumptions module
// into the headline outcomes the press release promises: cases handled, time
// saved, SLA attainment, deflection rate, cost per case, and governance
// coverage. Measured KPIs are shown plainly; assumption-derived ones are
// tagged "Estimated" so the numbers stay honest.

import { BriefcaseIcon, CoinsIcon, GaugeIcon, HandshakeIcon, ShieldCheckIcon, TimerIcon } from '@phosphor-icons/react'
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

export interface ValueScoreboardProps {
  accessToken: string
  assumptions?: WorkforceValueAssumptions
}

function slaTargetLabel(slaTargetMs: number): string {
  const minutes = Math.round(slaTargetMs / 60000)
  return minutes >= 1 ? `${minutes}m target` : `${Math.round(slaTargetMs / 1000)}s target`
}

export const ValueScoreboard: React.FC<ValueScoreboardProps> = ({
  accessToken,
  assumptions = DEFAULT_VALUE_ASSUMPTIONS
}) => {
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
        <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">Business value</h2>
        <span className="gba:text-[11px] gba:text-muted-foreground">this week</span>
        <span className="gba:ml-auto gba:text-[10px] gba:text-muted-foreground">
          “Estimated” uses workspace value assumptions
        </span>
      </header>

      <div
        className="gba:grid gba:grid-cols-2 gba:gap-3 gba:md:grid-cols-3 gba:xl:grid-cols-6"
        data-testid="workforce-value-scoreboard-grid"
      >
        <ValueKpiTile
          icon={BriefcaseIcon}
          label="Cases handled"
          value={String(figures.casesHandled)}
          hint={`${totals.runs} runs total`}
          tone="default"
          testId="value-kpi-cases"
        />
        <ValueKpiTile
          icon={TimerIcon}
          label="Time saved"
          value={formatMinutesSaved(figures.minutesSaved)}
          hint={`~${assumptions.baselineMinutesPerCase}m/case baseline`}
          estimated
          tone="positive"
          testId="value-kpi-time-saved"
        />
        <ValueKpiTile
          icon={GaugeIcon}
          label="SLA attainment"
          value={formatPercent(figures.slaAttainment)}
          hint={`${business.under_sla_runs}/${business.measured_runs} · ${slaTargetLabel(assumptions.slaTargetMs)}`}
          tone={figures.slaAttainment >= 0.9 ? 'positive' : 'warning'}
          testId="value-kpi-sla"
        />
        <ValueKpiTile
          icon={HandshakeIcon}
          label="Deflection rate"
          value={formatPercent(figures.deflectionRate)}
          hint={`${business.autonomous_runs} autonomous / ${figures.casesHandled} cases`}
          tone={figures.deflectionRate >= 0.8 ? 'positive' : 'default'}
          testId="value-kpi-deflection"
        />
        <ValueKpiTile
          icon={CoinsIcon}
          label="Cost per case"
          value={formatUsd(figures.costPerCaseUsd)}
          hint={`${formatUsd(totals.estimated_cost_usd)} spent`}
          estimated
          tone="default"
          testId="value-kpi-cost"
        />
        <ValueKpiTile
          icon={ShieldCheckIcon}
          label="Governance coverage"
          value={formatPercent(figures.governanceCoverage)}
          hint={`${business.audited_runs}/${totals.runs} audited · ${figures.guardrailStops} guardrail stops`}
          tone={figures.guardrailStops > 0 ? 'warning' : 'positive'}
          testId="value-kpi-governance"
        />
      </div>
    </section>
  )
}
