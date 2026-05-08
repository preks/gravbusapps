import React, { useCallback } from 'react'
import { DateInput } from '@newwork/nw-design-system'
import dayjs from 'dayjs'

type DateInputRangeValue = string | [string | null, string | null] | null

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
  const dateRange: [string | null, string | null] = [
    createdAfter ? dayjs(createdAfter).format('YYYY-MM-DD') : null,
    createdBefore ? dayjs(createdBefore).format('YYYY-MM-DD') : null
  ]

  const handleDateRangeChange = useCallback(
    (value: DateInputRangeValue) => {
      if (!value) {
        onDateRangeChange(undefined, undefined)
        return
      }

      const dates = Array.isArray(value) ? value : value.split(',')
      const startDate = dates[0] ? dayjs(dates[0]).startOf('day').toISOString() : undefined
      const endDate = dates[1] ? dayjs(dates[1]).endOf('day').toISOString() : undefined

      onDateRangeChange(startDate, endDate)
    },
    [onDateRangeChange]
  )

  return (
    <div
      className={`gba:flex gba:items-center gba:gap-2 gba:bg-background gba:p-3 gba:rounded-lg gba:border gba:border-border gba:shadow-sm ${className}`}
      data-testid="lead-date-range-filter"
    >
      <DateInput
        mode="range"
        value={dateRange}
        onChange={handleDateRangeChange}
        placeholder="Start date"
        placeholderEnd="End date"
        showClearButton
        className="gba:w-60"
      />
    </div>
  )
}
