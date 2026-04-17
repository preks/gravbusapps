import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { TranslateFn } from './budgetSetupDisplayUtils'

export function buildOverviewPlansFilterConfiguration(
  t: TranslateFn,
  statusOptions: { id: string; label: string }[],
  fiscalYearOptions: { id: string; label: string }[]
): FilterConfiguration {
  return {
    id: 'overview-plans-filters',
    name: t('overview-plans-table-filter-sheet-title'),
    groups: [
      {
        id: 'overview-plan-status-group',
        label: t('overview-plans-table-filter-status-group'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'budgetPlanStatuses',
            field: 'budgetPlanStatuses',
            label: t('overview-plans-table-filter-status-label'),
            type: 'multi-select',
            config: { options: statusOptions }
          }
        ]
      },
      {
        id: 'overview-fiscal-year-group',
        label: t('overview-plans-table-filter-fiscal-year-group'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'fiscalYears',
            field: 'fiscalYears',
            label: t('overview-plans-table-filter-fiscal-year-label'),
            type: 'multi-select',
            config: { options: fiscalYearOptions }
          }
        ]
      },
      {
        id: 'overview-start-date-group',
        label: t('overview-plans-table-filter-start-date-group'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'startDateRange',
            field: 'startDateRange',
            label: t('overview-plans-table-filter-start-date-label'),
            type: 'date',
            config: {
              dateType: 'date',
              mode: 'range',
              placeholder: t('overview-plans-table-filter-date-from-placeholder'),
              placeholderEnd: t('overview-plans-table-filter-date-to-placeholder'),
              showClearButton: true
            }
          }
        ]
      },
      {
        id: 'overview-end-date-group',
        label: t('overview-plans-table-filter-end-date-group'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'endDateRange',
            field: 'endDateRange',
            label: t('overview-plans-table-filter-end-date-label'),
            type: 'date',
            config: {
              dateType: 'date',
              mode: 'range',
              placeholder: t('overview-plans-table-filter-date-from-placeholder'),
              placeholderEnd: t('overview-plans-table-filter-date-to-placeholder'),
              showClearButton: true
            }
          }
        ]
      },
      {
        id: 'overview-effective-date-group',
        label: t('overview-plans-table-filter-effective-date-group'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'effectiveDateRange',
            field: 'effectiveDateRange',
            label: t('overview-plans-table-filter-effective-date-label'),
            type: 'date',
            config: {
              dateType: 'date',
              mode: 'range',
              placeholder: t('overview-plans-table-filter-date-from-placeholder'),
              placeholderEnd: t('overview-plans-table-filter-date-to-placeholder'),
              showClearButton: true
            }
          }
        ]
      }
    ]
  }
}
