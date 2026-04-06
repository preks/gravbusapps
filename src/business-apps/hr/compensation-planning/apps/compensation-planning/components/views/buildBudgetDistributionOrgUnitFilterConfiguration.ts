import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { TranslateFn } from './budgetSetupDisplayUtils'

export function buildBudgetDistributionOrgUnitFilterConfiguration(
  t: TranslateFn,
  orgUnitBudgetStatusOptions: { id: string; label: string }[],
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
    id: 'budget-distribution-org-unit-filters',
    name: t('budget-distribution-table-filter-sheet-title'),
    groups: [
      {
        id: 'org-unit-budget-status-group',
        label: t('budget-setup-table-filter-company-budget-status-group'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'orgUnitBudgetStatuses',
            field: 'orgUnitBudgetStatuses',
            label: t('budget-setup-table-filter-company-budget-status-label'),
            type: 'multi-select',
            config: { options: orgUnitBudgetStatusOptions }
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
