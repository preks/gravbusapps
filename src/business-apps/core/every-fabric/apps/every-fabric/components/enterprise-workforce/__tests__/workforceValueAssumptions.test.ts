import {
  computeValueFigures,
  formatMinutesSaved,
  formatPercent,
  formatUsd,
  type WorkforceValueAssumptions
} from '../workforceValueAssumptions'
import { emptyBusinessMetrics, emptyMetricsTotals } from '../workforceTypes'

const assumptions: WorkforceValueAssumptions = {
  baselineMinutesPerCase: 20,
  slaTargetMs: 5 * 60 * 1000,
  blendedHourlyCostUsd: 60
}

describe('computeValueFigures', () => {
  it('derives time saved, cost per case, and ratios', () => {
    const business = {
      ...emptyBusinessMetrics(),
      cases_handled: 6,
      measured_runs: 5,
      under_sla_runs: 4,
      autonomous_runs: 3,
      audited_runs: 8,
      guardrail_stops: 2
    }
    const totals = { ...emptyMetricsTotals(), runs: 10, estimated_cost_usd: 12 }

    const figures = computeValueFigures(business, totals, assumptions)

    expect(figures.casesHandled).toBe(6)
    expect(figures.minutesSaved).toBe(120) // 6 * 20
    expect(figures.laborValueUsd).toBe(120) // 2h * $60
    expect(figures.costPerCaseUsd).toBeCloseTo(2) // 12 / 6
    expect(figures.slaAttainment).toBeCloseTo(0.8) // 4 / 5
    expect(figures.deflectionRate).toBeCloseTo(0.5) // 3 / 6
    expect(figures.governanceCoverage).toBeCloseTo(0.8) // 8 / 10
    expect(figures.guardrailStops).toBe(2)
  })

  it('guards against divide-by-zero', () => {
    const figures = computeValueFigures(emptyBusinessMetrics(), emptyMetricsTotals(), assumptions)
    expect(figures.costPerCaseUsd).toBe(0)
    expect(figures.slaAttainment).toBe(0)
    expect(figures.deflectionRate).toBe(0)
    expect(figures.governanceCoverage).toBe(0)
  })

  it('tolerates missing business and totals blocks from older backends', () => {
    const figures = computeValueFigures(undefined, undefined, assumptions)
    expect(figures.casesHandled).toBe(0)
    expect(figures.guardrailStops).toBe(0)
  })
})

describe('formatters', () => {
  it('formats minutes saved', () => {
    expect(formatMinutesSaved(0)).toBe('0m')
    expect(formatMinutesSaved(45)).toBe('45m')
    expect(formatMinutesSaved(60)).toBe('1h')
    expect(formatMinutesSaved(192)).toBe('3h 12m')
  })

  it('formats usd compactly', () => {
    expect(formatUsd(2)).toBe('$2.00')
    expect(formatUsd(150)).toBe('$150')
    expect(formatUsd(1500)).toBe('$1.5k')
  })

  it('formats percent', () => {
    expect(formatPercent(0.8)).toBe('80%')
    expect(formatPercent(1)).toBe('100%')
  })
})
