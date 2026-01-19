import React from 'react'
import ExpenseItemsTable from '../personal-expenses/components/tabs/expense-items-tab/ExpenseItemsTable'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { ExpenseFilter } from '../personal-expenses/hooks/useGetExpenseItems'

export interface UnallocatedExpenseItemsTableProps extends BusinessAppContextProps {
  onAddExpenseItem: () => void
  selectedFilters: string[]
  addFilter: (filterId: string) => void
  removeFilter: (filterId: string) => void
  clearFilters: () => void
  filterGroups: DataFilterGroup[]
  filterLabelMap: Record<string, string>
  getFilters: (filtersToApply?: string[]) => ExpenseFilter
  setFilters: (filters: string[]) => void
  availableStatuses: string[]
  amountRange?: { min?: number; max?: number } | null
}

const UnallocatedExpenseItemsTable: React.FC<UnallocatedExpenseItemsTableProps> = props => {
  // Directly reuse the ExpenseItemsTable; filtering will be controlled via status in URL/session
  return <ExpenseItemsTable {...props} />
}

export default UnallocatedExpenseItemsTable
