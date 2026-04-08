import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpenseDateTupleRangeInput } from '@/business-apps/fin/expenses/common/components/filters/ExpenseDateTupleRangeInput'

interface EndDateRangeFilterProps {
  endDateRange?: [Date | null, Date | null] | null
  onDateRangeChange: (endDateRange: [Date | null, Date | null] | null) => void
  placeholder?: [string, string]
}

export const EndDateRangeFilter: React.FC<EndDateRangeFilterProps> = ({
  endDateRange,
  onDateRangeChange,
  placeholder = [
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
  ]
}) => (
  <ExpenseDateTupleRangeInput
    value={endDateRange}
    onChange={onDateRangeChange}
    placeholder={placeholder}
    dataTestId="expense-plan-end-date-range-filter"
  />
)
