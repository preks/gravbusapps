import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ApprovalTablePaginationProps {
  currentPage: number
  setCurrentPage: (page: number) => void
  pageSize: number
  handlePageSizeChange: (size: number) => void
  totalCount: number
  dataTestIdPrefix: string
}

const ApprovalTablePagination: React.FC<ApprovalTablePaginationProps> = ({
  currentPage,
  setCurrentPage,
  pageSize,
  handlePageSizeChange,
  totalCount,
  dataTestIdPrefix
}) => {
  if (totalCount <= 0) {
    return null
  }

  return (
    <div
      className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4 gba:border-t gba:border-border"
      data-testid={`${dataTestIdPrefix}-pagination`}
    >
      <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${dataTestIdPrefix}-pagination-info`}>
        {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} ${getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.of',
          'of'
        )} ${totalCount} ${getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.approval_requests_footer',
          'approval requests'
        )}`}
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
              handlePageSizeChange(newPageSize)
            }}
            className="gba:h-8 gba:w-16 gba:rounded gba:border gba:border-gray-300 gba:bg-background gba:px-2 gba:py-1 gba:text-sm"
            data-testid={`${dataTestIdPrefix}-page-size-select`}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div className="gba:flex gba:items-center gba:space-x-2">
          <Button
            variant="outline"
            className="gba:h-8 gba:w-8 gba:p-0"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            data-testid={`${dataTestIdPrefix}-first-page-button`}
          >
            <span className="gba:sr-only">Go to first page</span>
            ⟨⟨
          </Button>
          <Button
            variant="outline"
            className="gba:h-8 gba:w-8 gba:p-0"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            data-testid={`${dataTestIdPrefix}-previous-page-button`}
          >
            <span className="gba:sr-only">Go to previous page</span>⟨
          </Button>
          <span className="gba:flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:text-sm gba:font-medium">
            {currentPage}
          </span>
          <Button
            variant="outline"
            className="gba:h-8 gba:w-8 gba:p-0"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= Math.ceil(totalCount / pageSize)}
            data-testid={`${dataTestIdPrefix}-next-page-button`}
          >
            <span className="gba:sr-only">Go to next page</span>⟩
          </Button>
          <Button
            variant="outline"
            className="gba:h-8 gba:w-8 gba:p-0"
            onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
            disabled={currentPage >= Math.ceil(totalCount / pageSize)}
            data-testid={`${dataTestIdPrefix}-last-page-button`}
          >
            <span className="gba:sr-only">Go to last page</span>
            ⟩⟩
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ApprovalTablePagination
