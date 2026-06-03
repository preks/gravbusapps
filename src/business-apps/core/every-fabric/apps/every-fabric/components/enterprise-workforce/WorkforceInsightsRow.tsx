// Workspace-level insights row for the overview hub: a per-agent credit
// comparison plus an aggregate run-outcome donut for the whole workforce.
// Fetches workspace metrics on its own so the host screen stays lean and the
// charts can refresh independently of the agent list.

import React from 'react'
import { useWorkforceWorkspaceMetrics } from './useWorkforceMetrics'
import { PerAgentCreditsChart } from './dashboards/PerAgentCreditsChart'
import { RunOutcomeChart } from './dashboards/RunOutcomeChart'
import { emptyMetricsTotals } from './workforceTypes'

export interface WorkforceInsightsRowProps {
  accessToken: string
  nameById: Record<string, string>
}

export const WorkforceInsightsRow: React.FC<WorkforceInsightsRowProps> = ({ accessToken, nameById }) => {
  const { metrics } = useWorkforceWorkspaceMetrics({ accessToken, window: 'week' })

  const hasActivity = (metrics?.totals.runs ?? 0) > 0
  if (!hasActivity) return null

  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:lg:grid-cols-3" data-testid="workforce-insights-row">
      <div className="gba:lg:col-span-2">
        <PerAgentCreditsChart breakdown={metrics?.by_agent ?? []} nameById={nameById} />
      </div>
      <RunOutcomeChart totals={metrics?.totals ?? emptyMetricsTotals()} />
    </div>
  )
}
