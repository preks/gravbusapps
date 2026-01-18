import React from 'react'
import { Button } from '@newwork/nw-design-system'

export interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  startItem: number
  endItem: number
  totalItems: number
  itemLabel: string
  onPrevPage: () => void
  onNextPage: () => void
  dataTestIdPrefix: string
}

/**
 * Shared pagination controls component for dashboard widgets
 */
export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  startItem,
  endItem,
  totalItems,
  itemLabel,
  onPrevPage,
  onNextPage,
  dataTestIdPrefix
}) => {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4 gba:border-t gba:mt-4">
      <div className="gba:text-sm gba:text-muted-foreground">
        {`${startItem}-${endItem} of ${totalItems} ${itemLabel}`}
      </div>
      <div className="gba:flex gba:items-center gba:space-x-6">
        <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium">
          Page {currentPage} of {totalPages}
        </div>
        <div className="gba:flex gba:items-center gba:space-x-2">
          <Button
            variant="outline"
            className="gba:h-8 gba:w-8 gba:p-0"
            onClick={onPrevPage}
            disabled={currentPage === 1}
            data-testid={`${dataTestIdPrefix}-prev-page`}
          >
            <span className="gba:sr-only">Go to previous page</span>⟨
          </Button>
          <Button
            variant="outline"
            className="gba:h-8 gba:w-8 gba:p-0"
            onClick={onNextPage}
            disabled={currentPage >= totalPages}
            data-testid={`${dataTestIdPrefix}-next-page`}
          >
            <span className="gba:sr-only">Go to next page</span>⟩
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PaginationControls
