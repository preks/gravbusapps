import React, { useCallback } from 'react'
import { DatePicker } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

dayjs.extend(weekday)
dayjs.extend(localeData)

const { RangePicker } = DatePicker

interface DateRangeFilterProps {
  createdAfter?: string
  createdBefore?: string
  onDateRangeChange: (createdAfter?: string, createdBefore?: string) => void
  className?: string
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  createdAfter,
  createdBefore,
  onDateRangeChange,
  className = ''
}) => {
  // Convert string dates to dayjs objects for the DatePicker
  const dateRange: [Dayjs | null, Dayjs | null] = [
    createdAfter ? dayjs(createdAfter) : null,
    createdBefore ? dayjs(createdBefore) : null
  ]

  const handleDateRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (!dates) {
        // Clear the date range
        onDateRangeChange(undefined, undefined)
      } else {
        // Convert to ISO strings for the API, allowing partial ranges
        const startDate = dates[0] ? dates[0].startOf('day').toISOString() : undefined
        const endDate = dates[1] ? dates[1].endOf('day').toISOString() : undefined
        onDateRangeChange(startDate, endDate)
      }
    },
    [onDateRangeChange]
  )

  return (
    <div
      className={`gba:flex gba:items-center gba:gap-2 gba:bg-hsl(var(--background)) gba:p-3 gba:rounded-lg gba:border gba:border-gray-200 gba:shadow-sm ${className}`}
    >
      <RangePicker
        value={dateRange}
        onChange={handleDateRangeChange}
        placeholder={['Start date', 'End date']}
        format="MMM DD, YYYY"
        allowClear
        allowEmpty={[true, true]}
        size="small"
        style={{ width: 240 }}
        data-testid="lead-date-range-filter"
      />
    </div>
  )
}
