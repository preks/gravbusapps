import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { TranslateFn } from './budgetSetupDisplayUtils'

/** Upper bounds for range sliders/inputs; rows still filter correctly beyond UI max if needed. */
const SALARY_BUDGET_AMOUNT_FILTER_MAX = 1_000_000_000
const SALARY_BUDGET_PERCENT_FILTER_MAX = 100

export function buildBudgetSetupPlansFilterConfiguration(
  t: TranslateFn,
  companyBudgetStatusOptions: { id: string; label: string }[]
): FilterConfiguration {
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
              max: SALARY_BUDGET_AMOUNT_FILTER_MAX,
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
              max: SALARY_BUDGET_PERCENT_FILTER_MAX,
              step: 0.01,
              placeholderMin: t('budget-setup-table-filter-salary-percent-min-placeholder'),
              placeholderMax: t('budget-setup-table-filter-salary-percent-max-placeholder')
            }
          }
        ]
      }
    ]
  }
}
