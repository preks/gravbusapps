import React from 'react'
import { Separator } from '@newwork/nw-design-system'

interface ExpenseRequestHeaderProps {
  title: string
  t: (key: string) => string
}

const ExpenseRequestHeader: React.FC<ExpenseRequestHeaderProps> = ({ title, t }) => {
  return (
    <>
      {/* Header Section */}
      <div className="gba:text-center gba:mb-3 gba:mt-4" data-testid="approve-expense-request-v2-header">
        {/* Title - Bold, medium */}
        <h1
          className="gba:text-2xl gba:font-semibold gba:m-0 gba:text-foreground"
          data-testid="approve-expense-request-v2-title"
        >
          {title}
        </h1>

        {/* Subtitle - Smaller, gray */}
        <h2
          className="gba:text-sm gba:font-normal gba:m-0 gba:text-muted-foreground"
          data-testid="approve-expense-request-v2-subtitle"
        >
          {t('subtitle-expense-request-approval')}
        </h2>
      </div>

      <Separator className="gba:h-px gba:bg-secondary gba:mb-6" />
    </>
  )
}

export default ExpenseRequestHeader
