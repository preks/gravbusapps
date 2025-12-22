import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface PaginationChangeParams {
  current: number
  pageSize: number
}

export interface TablePaginationProps {
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (pagination: PaginationChangeParams) => void
  entityName?: string
  entityNamePlural?: string
  dataTestIdPrefix?: string
  className?: string
  showBorder?: boolean
}

const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  entityName,
  entityNamePlural,
  dataTestIdPrefix = 'table-pagination',
  className = '',
  showBorder = true
}) => {
  if (totalItems <= 0) {
    return null
  }

  const totalPages = Math.ceil(totalItems / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  // Determine entity label for display
  const getEntityLabel = () => {
    if (entityNamePlural) {
      return entityNamePlural
    }
    if (entityName) {
      return entityName
    }
    return getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.expense_requests', 'Expense Requests')
  }

  const entityLabel = getEntityLabel()

  // Multi-page pagination (when totalItems > pageSize)
  if (totalItems > pageSize) {
    return (
      <div
        className={`gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 ${showBorder ? 'gba:border-t' : ''} ${className}`}
        data-testid={`${dataTestIdPrefix}-pagination`}
      >
        <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${dataTestIdPrefix}-pagination-info`}>
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.showing', 'Showing')}{' '}
          {`${startItem}-${endItem}`} {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')}{' '}
          {totalItems} {entityLabel}
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
              data-testid={`${dataTestIdPrefix}-page-size-select`}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div
            className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
            data-testid={`${dataTestIdPrefix}-page-info`}
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
              data-testid={`${dataTestIdPrefix}-first-page-button`}
            >
              <span className="gba:sr-only">Go to first page</span>⟪
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPageChange({ current: currentPage - 1, pageSize })}
              disabled={currentPage === 1}
              data-testid={`${dataTestIdPrefix}-previous-page-button`}
            >
              <span className="gba:sr-only">Go to previous page</span>⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPageChange({ current: currentPage + 1, pageSize })}
              disabled={currentPage >= totalPages}
              data-testid={`${dataTestIdPrefix}-next-page-button`}
            >
              <span className="gba:sr-only">Go to next page</span>⟩
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPageChange({ current: totalPages, pageSize })}
              disabled={currentPage >= totalPages}
              data-testid={`${dataTestIdPrefix}-last-page-button`}
            >
              <span className="gba:sr-only">Go to last page</span>⟫
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Single page pagination (when totalItems <= pageSize but > 0)
  return (
    <div
      className={`gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 ${showBorder ? 'gba:border-t' : ''} ${className}`}
      data-testid={`${dataTestIdPrefix}-pagination-info-single-page`}
    >
      <div className="gba:text-sm gba:text-muted-foreground">{`${totalItems} ${entityLabel}`}</div>
      <div className="gba:flex gba:items-center gba:space-x-2">
        <p className="gba:text-sm gba:font-medium">
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.rows_per_page', 'Rows per page')}
        </p>
        <select
          value={pageSize}
          onChange={e => onPageChange({ current: 1, pageSize: Number(e.target.value) })}
          className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
          data-testid={`${dataTestIdPrefix}-page-size-select-single`}
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

export default TablePagination
