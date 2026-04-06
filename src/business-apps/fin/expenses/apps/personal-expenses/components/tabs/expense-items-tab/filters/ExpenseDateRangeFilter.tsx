import React, { useCallback } from 'react'
import { DatePicker } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// Extend dayjs with required plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

const { RangePicker } = DatePicker

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
  ] as [string, string]
}) => {
  // Convert Date objects to dayjs objects for the DatePicker
  const dateRange: [Dayjs | null, Dayjs | null] = [
    expenseDateRange?.[0] ? dayjs(expenseDateRange[0]) : null,
    expenseDateRange?.[1] ? dayjs(expenseDateRange[1]) : null
  ]

  const handleDateRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (dates) {
        const startDate = dates[0] ? dates[0].toDate() : null
        const endDate = dates[1] ? dates[1].toDate() : null
        onDateRangeChange([startDate, endDate])
        return
      }
      onDateRangeChange(null)
    },
    [onDateRangeChange]
  )

  return (
    <RangePicker
      value={dateRange}
      onChange={handleDateRangeChange}
      placeholder={placeholder}
      format="MMM DD, YYYY"
      allowClear
      allowEmpty={[true, true]}
      className={className}
      data-testid="expense-item-date-range-filter"
    />
  )
}
