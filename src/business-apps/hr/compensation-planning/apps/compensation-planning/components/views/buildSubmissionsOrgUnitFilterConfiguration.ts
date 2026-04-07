import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { TranslateFn } from './budgetSetupDisplayUtils'

export function buildSubmissionsOrgUnitFilterConfiguration(
  t: TranslateFn,
  orgUnitBudgetStatusOptions: { id: string; label: string }[]
): FilterConfiguration {
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
      }
    ]
  }
}
