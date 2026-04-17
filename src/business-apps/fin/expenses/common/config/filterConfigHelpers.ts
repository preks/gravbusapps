import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export function createDateRangeConfig() {
  return {
    dateType: 'date' as const,
    mode: 'range' as const,
    placeholder: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
    placeholderEnd: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date'),
    showClearButton: true
  }
}

export function createDateRangeFilterGroup(
  id: string,
  field: string,
  i18nKey: string,
  fallback: string
): FilterConfiguration['groups'][number] {
  return {
    id: `${id}-group`,
    label: getTranslationFromI18nKeyAndLabel(i18nKey, fallback),
    collapsible: true,
    defaultExpanded: false,
    filters: [
      {
        id: field,
        field,
        label: getTranslationFromI18nKeyAndLabel(i18nKey, fallback),
        type: 'date',
        config: createDateRangeConfig()
      }
    ]
  }
}

export function createStatusFilterGroup(
  statusFilters: Array<{ id: string; label: string }>,
  i18nKey = 'lowcoder:expense_request_list.expense_plan_table.status',
  fallback = 'Status'
): FilterConfiguration['groups'][number] {
  return {
    id: 'status-group',
    label: getTranslationFromI18nKeyAndLabel(i18nKey, fallback),
    collapsible: true,
    defaultExpanded: true,
    filters: [
      {
        id: 'statusIds',
        field: 'statusIds',
        label: getTranslationFromI18nKeyAndLabel(i18nKey, fallback),
        type: 'multi-select',
        config: { options: statusFilters }
      }
    ]
  }
}

/**
 * Expense vs Trip options for multi-select filters; option ids are tab-specific catalog tokens.
 */
export function createExpenseTripMultiSelectOptions(
  filterLabelMap: Record<string, string> | undefined,
  expenseOptionId: string,
  tripOptionId: string
): Array<{ id: string; label: string }> {
  return [
    {
      id: expenseOptionId,
      label:
        filterLabelMap?.[expenseOptionId] ??
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense', 'Expense')
    },
    {
      id: tripOptionId,
      label:
        filterLabelMap?.[tripOptionId] ?? getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip')
    }
  ]
}

export function createTypeFilterGroup(
  id: string,
  field: string,
  i18nKey: string,
  fallback: string,
  typeOptions: Array<{ id: string; label: string }>
): FilterConfiguration['groups'][number] {
  return {
    id: `${id}-group`,
    label: getTranslationFromI18nKeyAndLabel(i18nKey, fallback),
    collapsible: true,
    defaultExpanded: false,
    filters: [
      {
        id: field,
        field,
        label: getTranslationFromI18nKeyAndLabel(i18nKey, fallback),
        type: 'multi-select',
        config: { options: typeOptions }
      }
    ]
  }
}
