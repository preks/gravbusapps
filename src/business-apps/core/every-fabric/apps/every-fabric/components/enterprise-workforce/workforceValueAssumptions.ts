// Single source of truth for the business-value assumptions behind the
// workspace "Value Scoreboard".
//
// Some KPIs (time saved, SLA attainment, cost-per-case) cannot be measured
// purely from run telemetry yet - they depend on what a human alternative
// would have cost/taken. Until real case-flows are connected, we derive them
// from a small, explicit set of assumptions kept here so:
//
//   * every estimate is transparent and labelled "estimated" in the UI, and
//   * swapping to real, per-case data later is a one-file change.
//
// The pure helpers below turn the backend's WorkforceBusinessMetrics +
// totals into display-ready value figures.

import type { WorkforceBusinessMetrics, WorkforceMetricsTotals } from './workforceTypes'
import { emptyBusinessMetrics, emptyMetricsTotals } from './workforceTypes'

export interface WorkforceValueAssumptions {
  /** Minutes a human would spend handling one case (drives "time saved"). */
  baselineMinutesPerCase: number
  /** SLA target per run in milliseconds (drives SLA attainment). */
  slaTargetMs: number
  /** Blended fully-loaded hourly cost of a human handler, in USD. */
  blendedHourlyCostUsd: number
}

// Sensible, conservative defaults. These are estimates, not measurements -
// the UI tags any KPI derived from them accordingly.
export const DEFAULT_VALUE_ASSUMPTIONS: WorkforceValueAssumptions = {
  baselineMinutesPerCase: 18,
  slaTargetMs: 5 * 60 * 1000, // 5 minutes
  blendedHourlyCostUsd: 45
}

// Marks KPIs that lean on the assumptions above (vs. fully measured).
export const ESTIMATED = true

export interface WorkforceValueFigures {
  casesHandled: number
  /** Estimated human minutes saved across all handled cases. */
  minutesSaved: number
  /** Estimated human-cost-equivalent of the work, in USD. */
  laborValueUsd: number
  /** Automation cost per handled case, in USD (measured). */
  costPerCaseUsd: number
  /** SLA attainment 0..1 over measured runs (measured vs. target). */
  slaAttainment: number
  /** Deflection rate 0..1 = autonomous / cases handled (measured). */
  deflectionRate: number
  /** Governance coverage 0..1 = audited runs / total runs (measured). */
  governanceCoverage: number
  guardrailStops: number
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.min(Math.max(numerator / denominator, 0), 1)
}

/**
 * Combine the measured business block + window totals + assumptions into the
 * figures the Value Scoreboard renders. Pure and side-effect free.
 */
export function computeValueFigures(
  business: WorkforceBusinessMetrics | null | undefined,
  totals: WorkforceMetricsTotals | null | undefined,
  assumptions: WorkforceValueAssumptions = DEFAULT_VALUE_ASSUMPTIONS
): WorkforceValueFigures {
  const safeBusiness = business ?? emptyBusinessMetrics()
  const safeTotals = totals ?? emptyMetricsTotals()
  const casesHandled = safeBusiness.cases_handled
  const minutesSaved = casesHandled * assumptions.baselineMinutesPerCase
  const laborValueUsd = (minutesSaved / 60) * assumptions.blendedHourlyCostUsd
  const costPerCaseUsd = casesHandled > 0 ? safeTotals.estimated_cost_usd / casesHandled : 0

  return {
    casesHandled,
    minutesSaved,
    laborValueUsd,
    costPerCaseUsd,
    slaAttainment: ratio(safeBusiness.under_sla_runs, safeBusiness.measured_runs),
    deflectionRate: ratio(safeBusiness.autonomous_runs, casesHandled),
    governanceCoverage: ratio(safeBusiness.audited_runs, safeTotals.runs),
    guardrailStops: safeBusiness.guardrail_stops
  }
}

/** Human-friendly "time saved" label, e.g. "3h 12m" or "45m". */
export function formatMinutesSaved(minutes: number): string {
  if (minutes <= 0) return '0m'
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours <= 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/** Compact USD label, e.g. "$1.2k" or "$45". */
export function formatUsd(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`
  if (amount >= 100) return `$${Math.round(amount)}`
  return `$${amount.toFixed(2)}`
}

/** Percent label from a 0..1 ratio, e.g. "92%". */
export function formatPercent(ratio01: number): string {
  return `${Math.round(ratio01 * 100)}%`
}
