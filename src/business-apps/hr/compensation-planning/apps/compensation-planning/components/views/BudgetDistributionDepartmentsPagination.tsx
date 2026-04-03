import React from 'react'
import { Button } from '@newwork/nw-design-system'

export interface BudgetDistributionDepartmentsPaginationProps {
  pageIndex: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
  t: (key: string, args?: Record<string, unknown>) => string
}

export function BudgetDistributionDepartmentsPagination({
  pageIndex,
  totalPages,
  onPrev,
  onNext,
  t
}: BudgetDistributionDepartmentsPaginationProps) {
  return (
    <div
      className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3"
      data-testid="budget-distribution-departments-pagination"
    >
      <p className="gba:text-sm gba:text-muted-foreground">
        {t('budget-distribution-departments-page', {
          current: pageIndex + 1,
          total: totalPages
        })}
      </p>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pageIndex === 0}
          onClick={onPrev}
          data-testid="budget-distribution-departments-page-prev"
        >
          {t('budget-distribution-departments-prev')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pageIndex >= totalPages - 1}
          onClick={onNext}
          data-testid="budget-distribution-departments-page-next"
        >
          {t('budget-distribution-departments-next')}
        </Button>
      </div>
    </div>
  )
}
