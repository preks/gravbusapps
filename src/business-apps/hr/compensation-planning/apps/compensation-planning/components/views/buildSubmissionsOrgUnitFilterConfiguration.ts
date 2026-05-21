import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { TranslateFn } from './budgetSetupDisplayUtils'
import type { SubmissionsOrgUnitTableRow } from './submissionsOrgUnitTableRows'

const FILTER_RANGE_HEADROOM_RATIO = 1.15
const AMOUNT_FILTER_MAX_FALLBACK = Number.MAX_SAFE_INTEGER
const PERCENT_FILTER_MAX_FALLBACK = 100

function computeMax(values: number[], fallback: number): number {
  const finite = values.filter(value => Number.isFinite(value))
  if (finite.length === 0) {
    return fallback
  }
  const peak = Math.max(0, ...finite)
  if (peak === 0) {
    return fallback
  }
  return Math.ceil(peak * FILTER_RANGE_HEADROOM_RATIO)
}

export function buildSubmissionsOrgUnitFilterConfiguration(
  t: TranslateFn,
  orgUnitBudgetStatusOptions: { id: string; label: string }[],
  rows: readonly SubmissionsOrgUnitTableRow[]
): FilterConfiguration {
  const salaryBudgetMax = computeMax(
    rows.map(row => row.salaryBudgetAmount),
    AMOUNT_FILTER_MAX_FALLBACK
  )
  const allocationMax = computeMax(
    rows.map(row => row.allocationAmount),
    salaryBudgetMax
  )
  const poolShareMax = Math.max(
    PERCENT_FILTER_MAX_FALLBACK,
    computeMax(
      rows.map(row => row.allocationShareOfCompanyPoolPercent ?? 0),
      PERCENT_FILTER_MAX_FALLBACK
    )
  )

  return {
    id: 'submissions-org-unit-filters',
    name: t('submissions-table-filter-sheet-title'),
    groups: [
      {
        id: 'org-unit-budget-status-group',
        label: t('submissions-table-filter-org-unit-status-group'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'orgUnitBudgetStatuses',
            field: 'orgUnitBudgetStatuses',
            label: t('submissions-table-filter-org-unit-status-label'),
            type: 'multi-select',
            config: { options: orgUnitBudgetStatusOptions }
          }
        ]
      },
      {
        id: 'salary-budget-amount-group',
        label: t('submissions-table-filter-salary-budget-range-group'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'salaryBudgetAmount',
            field: 'salaryBudgetAmount',
            label: t('submissions-table-filter-salary-budget-range-label'),
            type: 'number',
            config: {
              mode: 'range',
              min: 0,
              max: salaryBudgetMax,
              step: 1,
              placeholderMin: t('submissions-table-filter-amount-min-placeholder'),
              placeholderMax: t('submissions-table-filter-amount-max-placeholder')
            }
          }
        ]
      },
      {
        id: 'allocation-amount-group',
        label: t('submissions-table-filter-allocation-range-group'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'allocationAmount',
            field: 'allocationAmount',
            label: t('submissions-table-filter-allocation-range-label'),
            type: 'number',
            config: {
              mode: 'range',
              min: 0,
              max: allocationMax,
              step: 1,
              placeholderMin: t('submissions-table-filter-amount-min-placeholder'),
              placeholderMax: t('submissions-table-filter-amount-max-placeholder')
            }
          }
        ]
      },
      {
        id: 'pool-share-group',
        label: t('submissions-table-filter-pool-share-range-group'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'allocationShareOfCompanyPoolPercent',
            field: 'allocationShareOfCompanyPoolPercent',
            label: t('submissions-table-filter-pool-share-range-label'),
            type: 'number',
            config: {
              mode: 'range',
              min: 0,
              max: poolShareMax,
              step: 0.01,
              placeholderMin: t('submissions-table-filter-percent-min-placeholder'),
              placeholderMax: t('submissions-table-filter-percent-max-placeholder')
            }
          }
        ]
      }
    ]
  }
}
