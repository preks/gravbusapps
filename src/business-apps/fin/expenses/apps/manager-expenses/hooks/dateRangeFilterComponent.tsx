import React from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { DatePicker } from 'antd'

const { RangePicker } = DatePicker

export type DateRangeFilterLabels = {
  startPlaceholder: string
  endPlaceholder: string
}

export function createDateRangeFilterComponent(
  dateRange: [Date | null, Date | null] | null,
  setter: (range: [Date | null, Date | null] | null) => void,
  labels: DateRangeFilterLabels
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

  return React.createElement(RangePicker, {
    value: dayjsRange,
    onChange: handleDateRangeChange,
    placeholder: [labels.startPlaceholder, labels.endPlaceholder],
    format: 'YYYY-MM-DD',
    allowClear: true,
    allowEmpty: [true, true],
    className: 'gba:w-full'
  })
}
