import React, { useCallback } from 'react'
import { DatePicker } from 'antd'
import dayjs, { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

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
  // Convert string dates to dayjs objects for the DatePicker
  // For proper semantic mapping: first input = before date, second input = after date
  const dateRange: [Dayjs | null, Dayjs | null] = [
    beforeDate ? dayjs(beforeDate) : null,
    afterDate ? dayjs(afterDate) : null
  ]

  const handleDateRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (dates) {
        // Convert to ISO strings for the API, mapping correctly:
        // dates[0] = before date (upper bound), dates[1] = after date (lower bound)
        const beforeDate = dates[0] ? dates[0].endOf('day').toISOString() : undefined
        const afterDate = dates[1] ? dates[1].startOf('day').toISOString() : undefined
        onDateRangeChange(afterDate, beforeDate)
      } else {
        // Clear the date range
        onDateRangeChange(undefined, undefined)
      }
    },
    [onDateRangeChange]
  )

  return (
    <div
      className={`gba:flex gba:items-center gba:gap-2 gba:p-3 gba:rounded-lg gba:shadow-sm ${className}`}
      style={{
        backgroundColor: 'var(--color-surface-primary)',
        border: '1px solid var(--color-border-default)'
      }}
    >
      <RangePicker
        value={dateRange}
        onChange={handleDateRangeChange}
        placeholder={placeholder}
        format="MMM DD, YYYY"
        allowClear
        allowEmpty={[true, true]}
        size="small"
        style={{ width: 240 }}
        data-testid={dataTestId}
      />
    </div>
  )
}
