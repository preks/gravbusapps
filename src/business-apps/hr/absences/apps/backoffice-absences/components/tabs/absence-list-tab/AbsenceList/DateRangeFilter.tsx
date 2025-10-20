import React, { useState, useEffect } from 'react'
import { DatePicker } from 'antd'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../../../common/utils/windowUtils'

dayjs.extend(weekday)
dayjs.extend(localeData)

const { RangePicker } = DatePicker

interface DateRangeFilterProps {
  onDateRangeChange: (startDate: string | null, endDate: string | null) => void
  initialStartDate?: string
  initialEndDate?: string
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  onDateRangeChange,
  initialStartDate,
  initialEndDate
}) => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  useEffect(() => {
    if (initialStartDate && initialEndDate) {
      setDateRange([dayjs(initialStartDate), dayjs(initialEndDate)])
    } else {
      setDateRange(null)
    }
  }, [initialStartDate, initialEndDate])

  const handleDateRangeChange = (dates: any) => {
    setDateRange(dates)

    if (dates && dates.length === 2) {
      const startDate = dates[0].format('YYYY-MM-DD')
      const endDate = dates[1].format('YYYY-MM-DD')
      onDateRangeChange(startDate, endDate)
    } else {
      onDateRangeChange(null, null)
    }
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid="date-range-filter">
      <RangePicker
        className="gba:w-60"
        value={dateRange}
        onChange={handleDateRangeChange}
        format="YYYY-MM-DD"
        placeholder={[
          getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.start_date', 'Start Date'),
          getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.end_date', 'End Date')
        ]}
        data-testid="date-range-picker"
      />
    </div>
  )
}
