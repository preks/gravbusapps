import React from 'react'
import ExpenseItemsTable from '../personal-expenses/components/tabs/expense-items-tab/table/ExpenseItemsTable'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ExpenseFilter } from '../personal-expenses/hooks/useGetExpenseItems'

export interface UnallocatedExpenseItemsTableProps extends BusinessAppContextProps {
  onAddExpenseItem: () => void
  selectedFilters: string[]
  addFilter: (filterId: string) => void
  removeFilter: (filterId: string) => void
  clearFilters: () => void
  filterLabelMap: Record<string, string>
  getFilters: (filtersToApply?: string[]) => ExpenseFilter
  setFilters: (filters: string[]) => void
  availableStatuses: string[]
  amountRange?: { min?: number; max?: number } | null
  setAmountRange: (range: { min?: number; max?: number } | null) => void
  expenseDateRange?: [Date | null, Date | null] | null
  setExpenseDateRange: (range: [Date | null, Date | null] | null) => void
}

const UnallocatedExpenseItemsTable: React.FC<UnallocatedExpenseItemsTableProps> = props => {
  // Directly reuse the ExpenseItemsTable; filtering will be controlled via status in URL/session
  return <ExpenseItemsTable {...props} />
}

export default UnallocatedExpenseItemsTable
