import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface PaginationChangeParams {
  current: number
  pageSize: number
}

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
  if (totalItems <= 0) {
    return null
  }

  const totalPages = Math.ceil(totalItems / pageSize)

  if (totalItems > pageSize) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:border-t"
        data-testid="expense-requests-pagination"
      >
        <div className="gba:text-sm gba:text-muted-foreground" data-testid="expense-requests-pagination-info">
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.showing', 'Showing')}{' '}
          {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalItems)}`}{' '}
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} {totalItems}{' '}
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_list.flows_button.expense_requests',
            'Expense Requests'
          )}
        </div>
        <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
          <div className="gba:flex gba:items-center gba:space-x-2">
            <p className="gba:text-sm gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.rows_per_page', 'Rows per page')}
            </p>
            <select
              value={pageSize}
              onChange={e => onPageChange({ current: 1, pageSize: Number(e.target.value) })}
              className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              data-testid="page-size-select"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div
            className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
            data-testid="page-info"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.page', 'Page')} {currentPage}{' '}
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} {totalPages}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-2">
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPageChange({ current: 1, pageSize })}
              disabled={currentPage === 1}
              data-testid="first-page-button"
            >
              <span className="gba:sr-only">Go to first page</span>⟪
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPageChange({ current: currentPage - 1, pageSize })}
              disabled={currentPage === 1}
              data-testid="previous-page-button"
            >
              <span className="gba:sr-only">Go to previous page</span>⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPageChange({ current: currentPage + 1, pageSize })}
              disabled={currentPage >= totalPages}
              data-testid="next-page-button"
            >
              <span className="gba:sr-only">Go to next page</span>⟩
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPageChange({ current: totalPages, pageSize })}
              disabled={currentPage >= totalPages}
              data-testid="last-page-button"
            >
              <span className="gba:sr-only">Go to last page</span>⟫
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:border-t"
      data-testid="expense-requests-pagination-info-single-page"
    >
      <div className="gba:text-sm gba:text-muted-foreground">
        {`${totalItems} ${getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_list.flows_button.expense_requests',
          'Expense Requests'
        )}`}
      </div>
      <div className="gba:flex gba:items-center gba:space-x-2">
        <p className="gba:text-sm gba:font-medium">
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.rows_per_page', 'Rows per page')}
        </p>
        <select
          value={pageSize}
          onChange={e => onPageChange({ current: 1, pageSize: Number(e.target.value) })}
          className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
          data-testid="page-size-select-single"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  )
}

export default ExpenseRequestPagination
