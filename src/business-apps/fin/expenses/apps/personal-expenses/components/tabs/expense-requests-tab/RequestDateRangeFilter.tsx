import React from 'react'
import { DatePicker, Tooltip } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { InfoIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const { RangePicker } = DatePicker

interface RequestDateRangeFilterProps {
  requestDateRange: [Date | null, Date | null] | null
  onDateRangeChange: (dateRange: [Date | null, Date | null] | null) => void
  placeholder?: [string, string]
  isEffectiveDateRange?: boolean
}

const RequestDateRangeFilter: React.FC<RequestDateRangeFilterProps> = ({
  requestDateRange,
  onDateRangeChange,
  placeholder = [
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
  ],
  isEffectiveDateRange = false
}) => {
  const handleDateChange = (dates: any) => {
    if (!dates || dates.length === 0) {
      onDateRangeChange(null)
    } else {
      onDateRangeChange([dates[0]?.toDate() || null, dates[1]?.toDate() || null])
    }
  }

  const value =
    requestDateRange && requestDateRange[0] && requestDateRange[1]
      ? [dayjs(requestDateRange[0]), dayjs(requestDateRange[1])]
      : null

  return (
    <div>
      <RangePicker
        value={value as [Dayjs | null, Dayjs | null] | null}
        onChange={handleDateChange}
        placeholder={placeholder}
        className="gba:w-full"
        data-testid="effective-date-range-filter"
      />
      {isEffectiveDateRange && (
        <div
          className="gba:mt-2 gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1"
          data-testid="effective-date-hint"
        >
          <Tooltip
            title={getTranslationFromI18nKeyAndLabel(
              'lowcoder:personal_expenses.effective_date_info',
              'For type TRIP, the start date is used. For type EXPENSE, the item expense date is used.'
            )}
            placement="right"
          >
            <InfoIcon size={16} data-testid="effective-date-info" />
          </Tooltip>
        </div>
      )}
    </div>
  )
}

export default RequestDateRangeFilter
