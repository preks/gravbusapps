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

export function createStatusFilterGroupWithLabel(
  statusFilters: Array<{ id: string; label: string }>,
  groupLabel: string
): FilterConfiguration['groups'][number] {
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

/** Date-range filter group with Fluent label key + manager expense-plans date placeholders. */
export function createFluentDateRangeFilterGroup(
  t: (key: string) => string,
  id: string,
  field: string,
  labelFluentKey: string,
  groupInfo?: string
): FilterConfiguration['groups'][number] {
  const label = t(labelFluentKey)
  return {
    id: `${id}-group`,
    label,
    ...(groupInfo ? { info: groupInfo } : {}),
    collapsible: true,
    defaultExpanded: false,
    filters: [
      {
        id: field,
        field,
        label,
        type: 'date',
        config: {
          dateType: 'date' as const,
          mode: 'range' as const,
          placeholder: t('expense-plans-filter-placeholder-start-date'),
          placeholderEnd: t('expense-plans-filter-placeholder-end-date'),
          showClearButton: true
        }
      }
    ]
  }
}

/** Multi-select type filter with Fluent label key (manager expense requests / plans tabs). */
export function createFluentTypeFilterGroup(
  t: (key: string) => string,
  id: string,
  field: string,
  labelFluentKey: string,
  typeOptions: Array<{ id: string; label: string }>
): FilterConfiguration['groups'][number] {
  const label = t(labelFluentKey)
  return {
    id: `${id}-group`,
    label,
    collapsible: true,
    defaultExpanded: false,
    filters: [
      {
        id: field,
        field,
        label,
        type: 'multi-select',
        config: { options: typeOptions }
      }
    ]
  }
}

/** Amount range filter with Fluent labels + expense-plans min/max placeholders (manager tabs). */
export function createFluentExpenseAmountRangeFilterGroup(
  t: (key: string) => string,
  groupId: string,
  field: string,
  labelFluentKey: string
): FilterConfiguration['groups'][number] {
  const label = t(labelFluentKey)
  return {
    id: `${groupId}-group`,
    label,
    collapsible: true,
    defaultExpanded: false,
    filters: [
      {
        id: field,
        field,
        label,
        type: 'number',
        config: {
          mode: 'range' as const,
          min: 0,
          max: 10_000_000,
          step: 0.01,
          placeholderMin: t('expense-plans-filter-amount-min'),
          placeholderMax: t('expense-plans-filter-amount-max')
        }
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
