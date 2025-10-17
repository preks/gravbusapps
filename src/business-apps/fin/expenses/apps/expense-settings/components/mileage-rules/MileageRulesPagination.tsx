import React from 'react'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { ChevronFirst, ChevronLeft, ChevronRight, ChevronLast } from 'lucide-react'

interface PaginationChangeParams {
  current: number
  pageSize: number
}

interface MileageRulesPaginationProps {
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (pagination: PaginationChangeParams) => void
  itemLabel?: string
}

const MileageRulesPagination: React.FC<MileageRulesPaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  itemLabel = 'rules'
}) => {
  if (totalItems <= 0) {
    return null
  }

  const totalPages = Math.ceil(totalItems / pageSize)

  return (
    <div
      className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:w-full gba:px-2 gba:py-4 gba:border-t gba:border-border"
      data-testid="mileage-rules-pagination"
    >
      <div className="gba:text-sm gba:text-muted-foreground" data-testid="mileage-rules-pagination-info">
        {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalItems)} of ${totalItems} ${itemLabel}`}
      </div>
      <div className="gba:flex gba:items-center gba:gap-6 gba:lg:gap-8 gba:shrink-0">
        <div className="gba:flex gba:items-center gba:space-x-2 gba:shrink-0">
          <p className="gba:text-sm gba:font-medium">Rows per page</p>
          <Select
            value={pageSize.toString()}
            onValueChange={value => {
              const newPageSize = Number(value)
              onPageChange({ current: 1, pageSize: newPageSize })
            }}
          >
            <SelectTrigger className="gba:h-8 gba:w-[70px]" data-testid="mileage-rules-page-size-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div
          className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium gba:shrink-0"
          data-testid="mileage-rules-page-info"
        >
          Page {currentPage} of {totalPages}
        </div>
        <div className="gba:flex gba:items-center gba:space-x-2 gba:shrink-0">
          <Button
            variant="outline"
            className="gba:h-8 gba:w-8 gba:p-0"
            onClick={() => onPageChange({ current: 1, pageSize })}
            disabled={currentPage === 1}
            data-testid="mileage-rules-first-page-button"
          >
            <span className="gba:sr-only">Go to first page</span>
            <ChevronFirst className="gba:h-4 gba:w-4" />
          </Button>
          <Button
            variant="outline"
            className="gba:h-8 gba:w-8 gba:p-0"
            onClick={() => onPageChange({ current: currentPage - 1, pageSize })}
            disabled={currentPage === 1}
            data-testid="mileage-rules-previous-page-button"
          >
            <span className="gba:sr-only">Go to previous page</span>
            <ChevronLeft className="gba:h-4 gba:w-4" />
          </Button>
          <Button
            variant="outline"
            className="gba:h-8 gba:w-8 gba:p-0"
            onClick={() => onPageChange({ current: currentPage + 1, pageSize })}
            disabled={currentPage >= totalPages}
            data-testid="mileage-rules-next-page-button"
          >
            <span className="gba:sr-only">Go to next page</span>
            <ChevronRight className="gba:h-4 gba:w-4" />
          </Button>
          <Button
            variant="outline"
            className="gba:h-8 gba:w-8 gba:p-0"
            onClick={() => onPageChange({ current: totalPages, pageSize })}
            disabled={currentPage >= totalPages}
            data-testid="mileage-rules-last-page-button"
          >
            <span className="gba:sr-only">Go to last page</span>
            <ChevronLast className="gba:h-4 gba:w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default MileageRulesPagination
