import React from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import translations from '../_i18n'

export interface HubPaginationFooterMessages {
  /** "Previous" button label. Default: "Previous" */
  prev?: string
  /** "Next" button label. Default: "Next" */
  next?: string
  /** Range text formatter. Default: "Showing {start}–{end} of {total}" */
  formatRange?: (start: number, end: number, total: number) => string
}

export interface HubPaginationFooterProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  /** Optional localized messages. When omitted, uses English defaults. */
  messages?: HubPaginationFooterMessages
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
  messages,
  'data-testid': testId = 'hub-pagination'
}: HubPaginationFooterProps) => {
  const { t } = useTranslation(translations)
  if (totalPages <= 1) return null

  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)
  const rangeText = messages?.formatRange
    ? messages.formatRange(start, end, totalItems)
    : t('pagination-range', { start, end, total: totalItems })
  const prevLabel = messages?.prev ?? t('pagination-prev')
  const nextLabel = messages?.next ?? t('pagination-next')

  return (
    <div
      className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-3 gba:border-t gba:bg-card"
      data-testid={testId}
    >
      <span className="gba:text-sm gba:text-muted-foreground" data-testid={`${testId}-range`}>
        {rangeText}
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
          {prevLabel}
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
          {nextLabel}
          <ChevronRight className="gba:w-4 gba:h-4 gba:ml-1" />
        </Button>
      </div>
    </div>
  )
}
