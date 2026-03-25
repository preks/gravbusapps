import React from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { DatePicker, Tooltip } from 'antd'
import { InfoIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const { RangePicker } = DatePicker

export function createDateRangeFilterComponent(
  dateRange: [Date | null, Date | null] | null,
  setter: (range: [Date | null, Date | null] | null) => void,
  options?: { showTooltip?: boolean }
): React.ReactElement {
  const dayjsRange: [Dayjs | null, Dayjs | null] = [
    dateRange?.[0] ? dayjs(dateRange[0]) : null,
    dateRange?.[1] ? dayjs(dateRange[1]) : null
  ]

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates) {
      setter([dates[0]?.toDate() || null, dates[1]?.toDate() || null])
    } else {
      setter(null)
    }
  }

  const picker = React.createElement(RangePicker, {
    value: dayjsRange,
    onChange: handleDateRangeChange,
    placeholder: [
      getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
      getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
    ],
    format: 'YYYY-MM-DD',
    allowClear: true,
    allowEmpty: [true, true],
    className: 'gba:w-full'
  })

  if (!options?.showTooltip) {
    return picker
  }

  return React.createElement(
    'div',
    {},
    picker,
    React.createElement(
      'div',
      { className: 'gba:mt-2 gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1' },
      React.createElement(
        Tooltip,
        {
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:personal_expenses.effective_date_info',
            'For type TRIP, the start date is used. For type EXPENSE, the item expense date is used.'
          ),
          placement: 'right'
        },
        React.createElement(InfoIcon, { size: 16 })
      )
    )
  )
}
