import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { TranslateFn } from './budgetSetupDisplayUtils'

export function buildBudgetSetupPlansFilterConfiguration(
  t: TranslateFn,
  companyBudgetStatusOptions: { id: string; label: string }[],
  totalResolvedRangeConfig: {
    mode: 'range'
    min: number
    max: number
    step: number
    placeholderMin: string
    placeholderMax: string
  }
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
        id: 'total-resolved-group',
        label: t('budget-setup-table-filter-total-resolved-group'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'totalResolvedRange',
            field: 'totalResolvedRange',
            label: '',
            type: 'number',
            config: totalResolvedRangeConfig
          }
        ]
      }
    ]
  }
}
