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

interface TimePeriodFilterProps {
  validFrom: string | null
  validTo: string | null
  onValidFromChange: (date: string | null) => void
  onValidToChange: (date: string | null) => void
  prefixDataTestId?: string
}

const TimePeriodFilter: React.FC<TimePeriodFilterProps> = ({
  validFrom,
  validTo,
  onValidFromChange,
  onValidToChange,
  prefixDataTestId = 'time-period-filter'
}) => {
  // Convert string dates to dayjs objects for the DatePicker
  const dateRange: [Dayjs | null, Dayjs | null] = [validFrom ? dayjs(validFrom) : null, validTo ? dayjs(validTo) : null]

  const handleDateRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (!dates) {
        // Clear both dates
        onValidFromChange(null)
        onValidToChange(null)
      } else {
        // Convert to ISO strings
        onValidFromChange(dates[0] ? dates[0].toISOString() : null)
        onValidToChange(dates[1] ? dates[1].toISOString() : null)
      }
    },
    [onValidFromChange, onValidToChange]
  )

  return (
    <RangePicker
      value={dateRange}
      onChange={handleDateRangeChange}
      placeholder={[
        getTranslationFromI18nKeyAndLabel('expenseSettings.filters.validFrom', 'Valid From'),
        getTranslationFromI18nKeyAndLabel('expenseSettings.filters.validTo', 'Valid To')
      ]}
      format="DD.MM.YYYY"
      size="small"
      allowClear
      allowEmpty={[true, true]}
      className="gba:w-full"
      data-testid={prefixDataTestId}
    />
  )
}

export default TimePeriodFilter
