import type { ExpenseItem } from '../../../../hooks/useGetExpenseItems'

export type TableSortOrder = 'ascend' | 'descend' | undefined

export interface AmountRange {
  min?: number
  max?: number
}

export interface ExpenseItemsTableStateParams {
  selectedFilters: string[]
  activeWidgetKey?: string
  expenseDateRange?: [Date | null, Date | null] | null
  amountRange?: AmountRange | null
  initialVisibleColumnIds: string[]
  items: ExpenseItem[]
}
