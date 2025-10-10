import React from 'react'
import { Separator } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ExpensePlanHeaderProps {
  title: string
}

const ExpensePlanHeader: React.FC<ExpensePlanHeaderProps> = ({ title }) => {
  return (
    <>
      {/* Header Section */}
      <div className="gba:text-center gba:mb-3 gba:mt-4" data-testid="approve-expense-plan-header">
        {/* Title - Bold, medium */}
        <h1
          className="gba:text-2xl gba:font-semibold gba:m-0 gba:text-foreground"
          data-testid="approve-expense-plan-title"
        >
          {title}
        </h1>

        {/* Subtitle - Smaller, gray */}
        <h2
          className="gba:text-sm gba:font-normal gba:m-0 gba:text-muted-foreground"
          data-testid="approve-expense-plan-subtitle"
        >
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:approve_expense_plan.expense_subtitle_approval',
            'Expense Plan Approval'
          )}
        </h2>
      </div>

      <Separator className="gba:h-px gba:bg-secondary gba:mb-6" />
    </>
  )
}

export default ExpensePlanHeader
