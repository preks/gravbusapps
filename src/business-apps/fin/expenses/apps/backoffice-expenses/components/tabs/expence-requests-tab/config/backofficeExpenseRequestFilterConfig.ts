import type { FilterConfiguration } from '@newwork/nw-design-system'
import {
  createFluentDateRangeFilterGroup,
  createFluentExpenseAmountRangeFilterGroup,
  createStatusFilterGroupWithLabel
} from '@/business-apps/fin/expenses/common/config/filterConfigHelpers'

/**
 * Options for building a {@link FilterConfiguration} aligned with backoffice list filters
 * (effective / creation date, department, employee, status, request type, amount). Employee search
 * and selection are composed in the tab hook (text + multi-select). Currency stays in the toolbar.
 */
export interface BackofficeExpenseRequestFilterConfigOptions {
  statusOptions: string[]
  filterLabelMap: Record<string, string>
  departmentOptions: Array<{ id: string; label: string }>
  effectiveDateGroupInfo?: string
  t: (key: string) => string
}

const BACKOFFICE_DATE_RANGE_PLACEHOLDERS = {
  placeholderStartKey: 'personal-expenses-date-placeholder-start',
  placeholderEndKey: 'personal-expenses-date-placeholder-end'
}

export function createBackofficeExpenseRequestFilterConfig({
  statusOptions,
  filterLabelMap,
  departmentOptions,
  effectiveDateGroupInfo,
  t
}: BackofficeExpenseRequestFilterConfigOptions): FilterConfiguration {
  const statusFilters = statusOptions.map(id => ({ id, label: filterLabelMap?.[id] ?? id }))
  const departmentLabel = t('header-department')
  const requestTypeOptions = [
    {
      id: 'ExpenseRequestType:v1:EXPENSES',
      label: filterLabelMap?.['ExpenseRequestType:v1:EXPENSES'] ?? t('filter-request-type-expense')
    },
    {
      id: 'ExpenseRequestType:v1:TRIP',
      label: filterLabelMap?.['ExpenseRequestType:v1:TRIP'] ?? t('filter-request-type-trip')
    }
  ]

  const groups: FilterConfiguration['groups'] = [
    createFluentDateRangeFilterGroup(
      t,
      'effectiveDate',
      'effectiveDateRange',
      'filter-effective-date',
      effectiveDateGroupInfo,
      BACKOFFICE_DATE_RANGE_PLACEHOLDERS
    ),
    createFluentDateRangeFilterGroup(
      t,
      'requestDate',
      'requestDateRange',
      'filter-creation-date',
      undefined,
      BACKOFFICE_DATE_RANGE_PLACEHOLDERS
    ),
    {
      id: 'department-group',
      label: departmentLabel,
      collapsible: true,
      defaultExpanded: false,
      showSearchAbove: true,
      filters: [
        {
          id: 'departmentIds',
          field: 'departmentIds',
          label: departmentLabel,
          type: 'multi-select',
          config: { options: departmentOptions, showSearch: true }
        }
      ]
    },
    createStatusFilterGroupWithLabel(statusFilters, t('filter-status')),
    {
      id: 'requestType-group',
      label: t('filter-request-type'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'requestTypeIds',
          field: 'requestTypeIds',
          label: t('filter-request-type'),
          type: 'multi-select',
          config: { options: requestTypeOptions }
        }
      ]
    },
    createFluentExpenseAmountRangeFilterGroup(t, 'total-amount', 'totalAmount', 'filter-amount'),
    createFluentExpenseAmountRangeFilterGroup(t, 'remaining-amount', 'totalRemainingAmount', 'header-remaining-amount')
  ]

  return {
    id: 'backoffice-expense-requests-filters',
    name: t('filter-panel-expense-requests'),
    groups
  }
}
