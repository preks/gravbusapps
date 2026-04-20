import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpenseDateTupleRangeInput } from '@/business-apps/fin/expenses/common/components/filters/ExpenseDateTupleRangeInput'

interface PlanDateRangeFilterProps {
  planDateRange?: [Date | null, Date | null] | null
  onDateRangeChange: (dateRange: [Date | null, Date | null] | null) => void
  placeholder?: [string, string]
}

const PlanDateRangeFilter: React.FC<PlanDateRangeFilterProps> = ({
  planDateRange,
  onDateRangeChange,
  placeholder = [
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
  ]
}) => (
  <ExpenseDateTupleRangeInput
    value={planDateRange}
    onChange={onDateRangeChange}
    placeholder={placeholder}
    dataTestId="plan-date-range-filter"
  />
)

export default PlanDateRangeFilter
