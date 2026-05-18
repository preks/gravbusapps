import type { FilterConfiguration } from '@newwork/nw-design-system'
import {
  createFluentExpenseAmountRangeFilterGroup,
  createStatusFilterGroupWithLabel
} from '@/business-apps/fin/expenses/common/config/filterConfigHelpers'

export interface AdvancePaymentFilterConfigOptions {
  statusOptions: string[]
  filterLabelMap: Record<string, string>
  statusGroupLabel?: string
  t: (key: string) => string
}

export function createAdvancePaymentFilterConfig({
  statusOptions,
  filterLabelMap,
  statusGroupLabel,
  t
}: AdvancePaymentFilterConfigOptions): FilterConfiguration {
  const statusFilters = statusOptions.map(id => ({ id, label: filterLabelMap?.[id] ?? id }))

  return {
    id: 'advance-payments-filters',
    name: t('advance-payments-filter-config-name'),
    groups: [
      createStatusFilterGroupWithLabel(statusFilters, statusGroupLabel ?? t('filter-status-group-title')),
      createFluentExpenseAmountRangeFilterGroup(t, 'advance-payment-amount', 'amount', 'advance-payments-filter-amount')
    ]
  }
}
