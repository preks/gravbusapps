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

interface DateRangeFilterProps {
  startDateRange?: [Date | null, Date | null] | null
  onDateRangeChange: (startDateRange: [Date | null, Date | null] | null) => void
  className?: string
  placeholder?: [string, string]
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDateRange,
  onDateRangeChange,
  placeholder = [
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
  ]
}) => {
  // Convert Date objects to dayjs objects for the DatePicker
  const dateRange: [Dayjs | null, Dayjs | null] = [
    startDateRange?.[0] ? dayjs(startDateRange[0]) : null,
    startDateRange?.[1] ? dayjs(startDateRange[1]) : null
  ]

  const handleDateRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (!dates) {
        // Clear the date range
        onDateRangeChange(null)
      } else {
        // Convert to Date objects for the filter system
        const startDate = dates[0] ? dates[0].toDate() : null
        const endDate = dates[1] ? dates[1].toDate() : null
        onDateRangeChange([startDate, endDate])
      }
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
      className="gba:w-full"
      data-testid="expense-plan-start-date-range-filter"
    />
  )
}
