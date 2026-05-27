import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { cn } from '@/common/utils/cn'

export interface BudgetDistributionContextCardProps {
  /** Optional headline (omit on manager team metrics-only card). */
  title?: string
  /** Company budget / plan select — first when both are set. */
  planSelect?: React.ReactNode
  /** Company selector — second when both are set. */
  companyToolbar?: React.ReactNode
  /**
   * Optional body below the header (e.g. KPI widgets).
   * Omit to show only the title + selectors — use standalone cards outside this card instead.
   */
  poolSection?: React.ReactNode
}

export function BudgetDistributionContextCard({
  title,
  planSelect,
  companyToolbar,
  poolSection = null
}: Readonly<BudgetDistributionContextCardProps>) {
  const showToolbarRow = Boolean(planSelect) || Boolean(companyToolbar)
  const hasTitle = Boolean(title && title.trim().length > 0)
  const hasHeader = hasTitle || showToolbarRow

  return (
    <Card className="gba:w-full" data-testid="budget-distribution-context-card">
      {hasHeader ? (
        <CardHeader className="gba:space-y-0 gba:pb-4">
          {hasTitle ? <CardTitle className="gba:text-base">{title}</CardTitle> : null}
          {showToolbarRow ? (
            <div
              className={cn(
                'gba:flex gba:min-w-0 gba:flex-row gba:flex-wrap gba:items-center gba:gap-x-6 gba:gap-y-3',
                hasTitle && 'gba:mt-4'
              )}
            >
              {planSelect}
              {companyToolbar}
            </div>
          ) : null}
        </CardHeader>
      ) : null}
      {poolSection ? (
        <CardContent className={cn(hasHeader && 'gba:border-t gba:border-border gba:pt-4', !hasHeader && 'gba:pt-6')}>
          {poolSection}
        </CardContent>
      ) : null}
    </Card>
  )
}
