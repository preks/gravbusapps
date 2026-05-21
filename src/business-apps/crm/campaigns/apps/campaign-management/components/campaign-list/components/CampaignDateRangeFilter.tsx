import React, { useCallback } from 'react'
import { DateInput } from '@newwork/nw-design-system'
import dayjs from 'dayjs'

type DateInputRangeValue = string | [string | null, string | null] | null

interface CampaignDateRangeFilterProps {
  afterDate?: string
  beforeDate?: string
  onDateRangeChange: (afterDate?: string, beforeDate?: string) => void
  placeholder?: [string, string]
  className?: string
  dataTestId?: string
}

export const CampaignDateRangeFilter: React.FC<CampaignDateRangeFilterProps> = ({
  afterDate,
  beforeDate,
  onDateRangeChange,
  placeholder = ['Start date', 'End date'],
  className = '',
  dataTestId
}) => {
  // For proper semantic mapping: first input = before date, second input = after date
  const dateRange: [string | null, string | null] = [
    beforeDate ? dayjs(beforeDate).format('YYYY-MM-DD') : null,
    afterDate ? dayjs(afterDate).format('YYYY-MM-DD') : null
  ]

  const handleDateRangeChange = useCallback(
    (value: DateInputRangeValue) => {
      if (!value) {
        onDateRangeChange(undefined, undefined)
        return
      }

      const dates = Array.isArray(value) ? value : value.split(',')
      // Convert to ISO strings for the API, mapping correctly:
      // dates[0] = before date (upper bound), dates[1] = after date (lower bound)
      const beforeDate = dates[0] ? dayjs(dates[0]).endOf('day').toISOString() : undefined
      const afterDate = dates[1] ? dayjs(dates[1]).startOf('day').toISOString() : undefined

      onDateRangeChange(afterDate, beforeDate)
    },
    [onDateRangeChange]
  )

  return (
    <div
      className={`gba:flex gba:items-center gba:gap-2 gba:bg-background gba:p-3 gba:rounded-lg gba:border gba:border-border gba:shadow-sm ${className}`}
      data-testid={dataTestId}
    >
      <DateInput
        mode="range"
        value={dateRange}
        onChange={handleDateRangeChange}
        placeholder={placeholder[0]}
        placeholderEnd={placeholder[1]}
        showClearButton
        className="gba:w-60"
      />
    </div>
  )
}
