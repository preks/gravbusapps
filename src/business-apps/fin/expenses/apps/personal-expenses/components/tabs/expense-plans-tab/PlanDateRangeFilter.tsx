import React from 'react'
import { DatePicker } from 'antd'
import dayjs, { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

interface PlanDateRangeFilterProps {
  planDateRange: [Date | null, Date | null] | null
  onDateRangeChange: (dateRange: [Date | null, Date | null] | null) => void
  placeholder?: [string, string]
}

const PlanDateRangeFilter: React.FC<PlanDateRangeFilterProps> = ({
  planDateRange,
  onDateRangeChange,
  placeholder = ['Start date', 'End date']
}) => {
  const handleDateChange = (dates: any) => {
    if (!dates || dates.length === 0) {
      onDateRangeChange(null)
    } else {
      onDateRangeChange([dates[0]?.toDate() || null, dates[1]?.toDate() || null])
    }
  }

  const value =
    planDateRange && planDateRange[0] && planDateRange[1] ? [dayjs(planDateRange[0]), dayjs(planDateRange[1])] : null

  return (
    <RangePicker
      value={value as [Dayjs | null, Dayjs | null] | null}
      onChange={handleDateChange}
      placeholder={placeholder}
      className="gba:w-full"
      data-testid="plan-date-range-filter"
    />
  )
}

export default PlanDateRangeFilter
