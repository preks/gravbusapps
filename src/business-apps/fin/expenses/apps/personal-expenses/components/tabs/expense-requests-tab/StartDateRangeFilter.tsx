import React, { useCallback } from 'react'
import { DatePicker } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

// Extend dayjs with required plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

const { RangePicker } = DatePicker

interface StartDateRangeFilterProps {
  startDateRange?: [Date | null, Date | null] | null
  onDateRangeChange: (startDateRange: [Date | null, Date | null] | null) => void
  className?: string
  placeholder?: [string, string]
}

export const StartDateRangeFilter: React.FC<StartDateRangeFilterProps> = ({
  startDateRange,
  onDateRangeChange,
  placeholder = ['Start date', 'End date']
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
      style={{ width: '100%' }}
      data-testid="expense-request-start-date-range-filter"
    />
  )
}
