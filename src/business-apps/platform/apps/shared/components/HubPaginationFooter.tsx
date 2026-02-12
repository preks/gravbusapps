import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface HubPaginationFooterProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  'data-testid'?: string
}

/**
 * Pagination footer for hub list/grid views.
 * Renders Previous / Next buttons and an item range indicator.
 * Only renders when there is more than one page.
 */
export const HubPaginationFooter: React.FC<HubPaginationFooterProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  'data-testid': testId = 'hub-pagination'
}) => {
  if (totalPages <= 1) return null

  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)

  return (
    <div
      className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-3 gba:border-t gba:bg-card"
      data-testid={testId}
    >
      <span className="gba:text-sm gba:text-muted-foreground" data-testid={`${testId}-range`}>
        Showing {start}–{end} of {totalItems}
      </span>

      <div className="gba:flex gba:items-center gba:gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          data-testid={`${testId}-prev`}
        >
          <ChevronLeft className="gba:w-4 gba:h-4 gba:mr-1" />
          Previous
        </Button>

        <span className="gba:text-sm gba:text-muted-foreground gba:min-w-[4rem] gba:text-center">
          {currentPage} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          data-testid={`${testId}-next`}
        >
          Next
          <ChevronRight className="gba:w-4 gba:h-4 gba:ml-1" />
        </Button>
      </div>
    </div>
  )
}
