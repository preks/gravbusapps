import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export function createDateRangeConfig(t?: (key: string) => string) {
  const placeholder = t ? t('personal-expenses-date-placeholder-start') : 'Start date'
  const placeholderEnd = t ? t('personal-expenses-date-placeholder-end') : 'End date'

  return {
    dateType: 'date' as const,
    mode: 'range' as const,
    placeholder,
    placeholderEnd,
    showClearButton: true
  }
}

export function createDateRangeFilterGroup(
  id: string,
  field: string,
  i18nKey: string,
  fallback: string,
  groupInfo?: string,
  t?: (key: string) => string
): FilterConfiguration['groups'][number] {
  return {
    id: `${id}-group`,
    label: getTranslationFromI18nKeyAndLabel(i18nKey, fallback),
    ...(groupInfo ? { info: groupInfo } : {}),
    collapsible: true,
    defaultExpanded: false,
    filters: [
      {
        id: field,
        field,
        label: getTranslationFromI18nKeyAndLabel(i18nKey, fallback),
        type: 'date',
        config: createDateRangeConfig(t)
      }
    ]
  }
}

export function createStatusFilterGroup(
  statusFilters: Array<{ id: string; label: string }>,
  i18nKey = 'lowcoder:expense_request_list.expense_plan_table.status',
  fallback = 'Status',
  resolvedGroupLabel?: string
): FilterConfiguration['groups'][number] {
  const groupLabel =
    resolvedGroupLabel !== undefined ? resolvedGroupLabel : getTranslationFromI18nKeyAndLabel(i18nKey, fallback)
  return {
    id: 'status-group',
    label: groupLabel,
    collapsible: true,
    defaultExpanded: true,
    filters: [
      {
        id: 'statusIds',
        field: 'statusIds',
        label: groupLabel,
        type: 'multi-select',
        config: { options: statusFilters }
      }
    ]
  }
}

/**
 * Expense vs Trip options for multi-select filters; option ids are tab-specific catalog tokens.
 * Default labels use personal-expenses Fluent keys when the catalog map has no entry.
 */
export function createExpenseTripMultiSelectOptions(
  filterLabelMap: Record<string, string> | undefined,
  expenseOptionId: string,
  tripOptionId: string,
  t: (key: string) => string
): Array<{ id: string; label: string }> {
  return [
    {
      id: expenseOptionId,
      label: filterLabelMap?.[expenseOptionId] ?? t('personal-expenses-label-expense')
    },
    {
      id: tripOptionId,
      label: filterLabelMap?.[tripOptionId] ?? t('personal-expenses-label-trip')
    }
  ]
}

export function createNumberRangeFilterGroup(
  groupId: string,
  field: string,
  i18nKey: string,
  fallback: string,
  t?: (key: string) => string
): FilterConfiguration['groups'][number] {
  const placeholderMin = t ? t('personal-expenses-filter-min-amount-plain') : 'Min amount'
  const placeholderMax = t ? t('personal-expenses-filter-max-amount-plain') : 'Max amount'

  return {
    id: `${groupId}-group`,
    label: getTranslationFromI18nKeyAndLabel(i18nKey, fallback),
    collapsible: true,
    defaultExpanded: false,
    filters: [
      {
        id: field,
        field,
        label: getTranslationFromI18nKeyAndLabel(i18nKey, fallback),
        type: 'number',
        config: {
          mode: 'range' as const,
          min: 0,
          max: 10_000_000,
          step: 0.01,
          placeholderMin,
          placeholderMax
        }
      }
    ]
  }
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
