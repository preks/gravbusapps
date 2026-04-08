import React from 'react'
import ExpenseRequestsTable from './table/ExpenseRequestsTable'
import { useExpenseRequestsTabLogic } from './hooks/useExpenseRequestsTabLogic'
import type { ExpenseRequestsTabProps } from './types/expenseRequestsTab.types'

export type { ExpenseRequestsTabProps } from './types/expenseRequestsTab.types'

const ExpenseRequestsTab: React.FC<ExpenseRequestsTabProps> = props => {
  const { tableProps } = useExpenseRequestsTabLogic(props)
  return <ExpenseRequestsTable {...props} {...tableProps} />
}

export default ExpenseRequestsTab
