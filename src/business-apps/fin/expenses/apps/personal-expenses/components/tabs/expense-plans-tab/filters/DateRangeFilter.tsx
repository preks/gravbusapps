import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpenseDateTupleRangeInput } from '@/business-apps/fin/expenses/common/components/filters/ExpenseDateTupleRangeInput'

interface DateRangeFilterProps {
  startDateRange?: [Date | null, Date | null] | null
  onDateRangeChange: (startDateRange: [Date | null, Date | null] | null) => void
  placeholder?: [string, string]
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDateRange,
  onDateRangeChange,
  placeholder = [
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
  ]
}) => (
  <ExpenseDateTupleRangeInput
    value={startDateRange}
    onChange={onDateRangeChange}
    placeholder={placeholder}
    dataTestId="expense-plan-start-date-range-filter"
  />
)
