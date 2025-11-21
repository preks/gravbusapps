import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface AssetTablePaginationProps {
  currentPage: number
  pageSize: number
  totalCount: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

export const AssetTablePagination: React.FC<AssetTablePaginationProps> = ({
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange
}) => {
  const totalPages = Math.ceil(totalCount / pageSize)

  if (totalPages === 0) {
    return null
  }

  return (
    <div
      className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4"
      data-testid="asset-table-pagination"
    >
      <div className="gba:text-sm gba:text-muted-foreground" data-testid="asset-table-pagination-info">
        {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} ${totalCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.assets', 'assets')}`}
      </div>
      <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
        <div className="gba:flex gba:items-center gba:space-x-2">
          <p className="gba:text-sm gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.rows_per_page', 'Rows per page')}
          </p>
          <select
            value={pageSize}
            onChange={e => {
              const newPageSize = Number(e.target.value)
              onPageSizeChange?.(newPageSize)
              onPageChange?.(1)
            }}
            className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
            data-testid="asset-table-page-size-select"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div
          className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
          data-testid="asset-table-page-info"
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.page', 'Page')} {currentPage}{' '}
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} {totalPages}
        </div>
        <div className="gba:flex gba:items-center gba:space-x-2">
          <Button
            variant="outline"
            className="gba:h-8 gba:w-8 gba:p-0"
            onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            data-testid="asset-table-prev-page"
          >
            <span className="gba:sr-only">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.previous', 'Go to previous page')}
            </span>
            ⟨
          </Button>
          <Button
            variant="outline"
            className="gba:h-8 gba:w-8 gba:p-0"
            onClick={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            data-testid="asset-table-next-page"
          >
            <span className="gba:sr-only">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.next', 'Go to next page')}
            </span>
            ⟩
          </Button>
        </div>
      </div>
    </div>
  )
}
