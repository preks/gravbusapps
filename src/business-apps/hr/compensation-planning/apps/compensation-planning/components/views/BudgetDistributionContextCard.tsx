import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'

export interface BudgetDistributionContextCardProps {
  title: string
  planSelect: React.ReactNode
  companyToolbar: React.ReactNode
  poolSection: React.ReactNode
}

export function BudgetDistributionContextCard({
  title,
  planSelect,
  companyToolbar,
  poolSection
}: Readonly<BudgetDistributionContextCardProps>) {
  return (
    <Card className="gba:w-full" data-testid="budget-distribution-context-card">
      <CardHeader className="gba:space-y-0 gba:pb-4">
        <CardTitle className="gba:text-base">{title}</CardTitle>
        <div className="gba:mt-4 gba:flex gba:min-w-0 gba:flex-row gba:flex-wrap gba:items-center gba:gap-x-6 gba:gap-y-3">
          {planSelect}
          {companyToolbar}
        </div>
      </CardHeader>
      {poolSection ? (
        <CardContent className="gba:border-t gba:border-border gba:pt-4">{poolSection}</CardContent>
      ) : null}
    </Card>
  )
}
