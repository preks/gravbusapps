// Business-value KPI tiles shown faintly behind the glass cluster.
//
// Derived from the same active-agent summaries the cards use, so the 3D scene
// stays self-contained (no extra metrics request). Values are rolled up across
// the visible agents and formatted compactly for the distant panels.

import { compactNumber, type ValueKpiTile } from '../../glass-card-sphere/kpiModel'
import type { WorkforceAgentSummary } from '../useWorkforceData'

export function buildValueKpis(summaries: WorkforceAgentSummary[]): ValueKpiTile[] {
  let credits = 0
  let runs = 0
  let completed = 0
  for (const summary of summaries) {
    credits += summary.creditsThisWeek
    runs += summary.runsThisWeek
    completed += summary.metrics.completed_runs
  }

  return [
    { id: 'cases', value: compactNumber(completed), label: 'Cases handled / wk' },
    { id: 'credits', value: compactNumber(credits), label: 'Credits / wk' },
    { id: 'runs', value: compactNumber(runs), label: 'Runs / wk' },
    { id: 'agents', value: String(summaries.length), label: 'Active agents' }
  ]
}
