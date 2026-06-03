import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { TranslateFn } from './budgetSetupDisplayUtils'
import type { BudgetSetupPlanTableRow } from './budgetSetupPlanTableRows'

/** Extra slack above the largest value in the table so the slider/input is not tight against the max row. */
const FILTER_RANGE_HEADROOM_RATIO = 1.15

/**
 * When there are no rows (or no positive amounts), the range control still needs a finite max.
 * Uses the largest precise integer so slider/input math stays stable; row filtering is not capped by this.
 */
const AMOUNT_FILTER_MAX_FALLBACK = Number.MAX_SAFE_INTEGER

/** Percent floor: typical “% of payroll” plans stay in 0–100; the slider always allows at least that span. */
const PERCENT_FILTER_MIN_MAX = 100

/**
 * Fallback when there is no data; keeps the UI usable for large or unusual % values without a hard 100 cap.
 */
const PERCENT_FILTER_MAX_FALLBACK = 1_000_000

function computeAmountFilterMax(rows: readonly BudgetSetupPlanTableRow[]): number {
  const amounts = rows.map(r => r.salaryBudgetAmount).filter(n => Number.isFinite(n))
  if (amounts.length === 0) {
    return AMOUNT_FILTER_MAX_FALLBACK
  }
  const peak = Math.max(0, ...amounts)
  if (peak === 0) {
    return AMOUNT_FILTER_MAX_FALLBACK
  }
  return Math.ceil(peak * FILTER_RANGE_HEADROOM_RATIO)
}

function computePercentFilterMax(rows: readonly BudgetSetupPlanTableRow[]): number {
  const percents = rows.map(r => r.salaryBudgetPercent).filter(n => Number.isFinite(n))
  if (percents.length === 0) {
    return PERCENT_FILTER_MAX_FALLBACK
  }
  const peak = Math.max(0, ...percents)
  const scaled = Math.ceil(peak * FILTER_RANGE_HEADROOM_RATIO * 100) / 100
  return Math.max(PERCENT_FILTER_MIN_MAX, scaled)
}

function computeAllocationAmountFilterMax(rows: readonly BudgetSetupPlanTableRow[]): number {
  const amounts = rows.map(r => r.allocationAmount).filter(n => Number.isFinite(n))
  if (amounts.length === 0) {
    return AMOUNT_FILTER_MAX_FALLBACK
  }
  const peak = Math.max(0, ...amounts)
  if (peak === 0) {
    return AMOUNT_FILTER_MAX_FALLBACK
  }
  return Math.ceil(peak * FILTER_RANGE_HEADROOM_RATIO)
}

export function buildBudgetSetupPlansFilterConfiguration(
  t: TranslateFn,
  companyBudgetStatusOptions: { id: string; label: string }[],
  rows: readonly BudgetSetupPlanTableRow[]
): FilterConfiguration {
  const amountMax = computeAmountFilterMax(rows)
  const percentMax = computePercentFilterMax(rows)
  const allocationAmountMax = computeAllocationAmountFilterMax(rows)

  return {
    id: 'budget-setup-plans-filters',
    name: t('budget-setup-table-filter-sheet-title'),
    groups: [
      {
        id: 'company-budget-status-group',
        label: t('budget-setup-table-filter-company-budget-status-group'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'companyBudgetStatuses',
            field: 'companyBudgetStatuses',
            label: t('budget-setup-table-filter-company-budget-status-label'),
            type: 'multi-select',
            config: { options: companyBudgetStatusOptions }
          }
        ]
      },
      {
        id: 'salary-budget-amount-group',
        label: t('budget-setup-table-filter-salary-amount-range-group'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'salaryBudgetAmount',
            field: 'salaryBudgetAmount',
            label: t('budget-setup-table-filter-salary-amount-range-label'),
            type: 'number',
            config: {
              mode: 'range',
              min: 0,
              max: amountMax,
              step: 1,
              placeholderMin: t('budget-setup-table-filter-salary-amount-min-placeholder'),
              placeholderMax: t('budget-setup-table-filter-salary-amount-max-placeholder')
            }
          }
        ]
      },
      {
        id: 'salary-budget-percent-group',
        label: t('budget-setup-table-filter-salary-percent-range-group'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'salaryBudgetPercent',
            field: 'salaryBudgetPercent',
            label: t('budget-setup-table-filter-salary-percent-range-label'),
            type: 'number',
            config: {
              mode: 'range',
              min: 0,
              max: percentMax,
              step: 0.01,
              placeholderMin: t('budget-setup-table-filter-salary-percent-min-placeholder'),
              placeholderMax: t('budget-setup-table-filter-salary-percent-max-placeholder')
            }
          }
        ]
      },
      {
        id: 'allocation-amount-group',
        label: t('budget-setup-table-filter-allocation-amount-range-group'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'allocationAmount',
            field: 'allocationAmount',
            label: t('budget-setup-table-filter-allocation-amount-range-label'),
            type: 'number',
            config: {
              mode: 'range',
              min: 0,
              max: allocationAmountMax,
              step: 1,
              placeholderMin: t('budget-setup-table-filter-allocation-amount-min-placeholder'),
              placeholderMax: t('budget-setup-table-filter-allocation-amount-max-placeholder')
            }
          }
        ]
      }
    ]
  }
}
