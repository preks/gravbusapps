import React, { useCallback } from 'react'
import { DatePicker } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

// Extend dayjs with required plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

const { RangePicker } = DatePicker

interface EndDateRangeFilterProps {
  endDateRange?: [Date | null, Date | null] | null
  onDateRangeChange: (endDateRange: [Date | null, Date | null] | null) => void
  className?: string
  placeholder?: [string, string]
}

export const EndDateRangeFilter: React.FC<EndDateRangeFilterProps> = ({
  endDateRange,
  onDateRangeChange,
  placeholder = ['Start date', 'End date']
}) => {
  // Convert Date objects to dayjs objects for the DatePicker
  const dateRange: [Dayjs | null, Dayjs | null] = [
    endDateRange?.[0] ? dayjs(endDateRange[0]) : null,
    endDateRange?.[1] ? dayjs(endDateRange[1]) : null
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
      data-testid="expense-request-end-date-range-filter"
    />
  )
}
