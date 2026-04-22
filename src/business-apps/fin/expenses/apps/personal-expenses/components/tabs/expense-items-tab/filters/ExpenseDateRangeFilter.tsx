import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpenseDateTupleRangeInput } from '@/business-apps/fin/expenses/common/components/filters/ExpenseDateTupleRangeInput'

interface ExpenseDateRangeFilterProps {
  expenseDateRange?: [Date | null, Date | null] | null
  onDateRangeChange: (expenseDateRange: [Date | null, Date | null] | null) => void
  className?: string
  placeholder?: [string, string]
}

export const ExpenseDateRangeFilter: React.FC<ExpenseDateRangeFilterProps> = ({
  expenseDateRange,
  onDateRangeChange,
  className = 'gba:w-full',
  placeholder = [
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
  ]
}) => (
  <ExpenseDateTupleRangeInput
    value={expenseDateRange}
    onChange={onDateRangeChange}
    placeholder={placeholder}
    className={className}
    dataTestId="expense-item-date-range-filter"
  />
)
