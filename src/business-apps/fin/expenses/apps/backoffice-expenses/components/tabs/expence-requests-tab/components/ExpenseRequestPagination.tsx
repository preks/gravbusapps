import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TablePagination, PaginationChangeParams } from '../../../../../../components'

interface ExpenseRequestPaginationProps {
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (pagination: PaginationChangeParams) => void
}

const ExpenseRequestPagination: React.FC<ExpenseRequestPaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange
}) => {
  return (
    <TablePagination
      currentPage={currentPage}
      pageSize={pageSize}
      totalItems={totalItems}
      onPageChange={onPageChange}
      entityNamePlural={getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_list.flows_button.expense_requests',
        'Expense Requests'
      )}
      dataTestIdPrefix="expense-requests"
    />
  )
}

export default ExpenseRequestPagination
