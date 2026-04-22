import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { TranslateFn } from './budgetSetupDisplayUtils'

export interface BudgetPlanFiscalYearRangeFilterConfig {
  mode: 'range'
  min: number
  max: number
  step: number
  placeholderMin: string
  placeholderMax: string
}

export function buildBudgetPlanTableFilterConfiguration(
  t: TranslateFn,
  statusOptions: { id: string; label: string }[],
  fiscalYearNumberRangeConfig: BudgetPlanFiscalYearRangeFilterConfig
): FilterConfiguration {
  return {
    id: 'budget-plan-table-filters',
    name: t('budget-plan-filter-sheet-title'),
    groups: [
      {
        id: 'plan-period-group',
        label: t('budget-plan-filter-plan-period-group'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'planPeriodRange',
            field: 'planPeriodRange',
            label: t('budget-plan-filter-plan-period-label'),
            type: 'date',
            config: {
              dateType: 'date',
              mode: 'range',
              placeholder: t('budget-plan-form-start-date'),
              placeholderEnd: t('budget-plan-form-end-date'),
              showClearButton: true
            }
          }
        ]
      },
      {
        id: 'status-group',
        label: t('budget-plan-filter-status-group'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'budgetPlanStatuses',
            field: 'budgetPlanStatuses',
            label: t('budget-plan-filter-status-label'),
            type: 'multi-select',
            config: { options: statusOptions }
          }
        ]
      },
      {
        id: 'effective-date-group',
        label: t('budget-plan-filter-effective-date-group'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'effectiveDateRange',
            field: 'effectiveDateRange',
            label: t('budget-plan-filter-effective-date-label'),
            type: 'date',
            config: {
              dateType: 'date',
              mode: 'range',
              placeholder: t('budget-plan-filter-effective-range-start'),
              placeholderEnd: t('budget-plan-filter-effective-range-end'),
              showClearButton: true
            }
          }
        ]
      },
      {
        id: 'fiscal-year-group',
        label: t('budget-plan-filter-fiscal-year-group'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'fiscalYearRange',
            field: 'fiscalYearRange',
            label: '',
            type: 'number',
            config: fiscalYearNumberRangeConfig
          }
        ]
      }
    ]
  }
}
