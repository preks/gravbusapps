import React, { useEffect, useState } from 'react'
import { DateInput } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

type DateRangeValue = [string | null, string | null]

export interface RangeDateInputFilterProps {
  onDateRangeChange: (startDate: string | null, endDate: string | null) => void
  initialStartDate?: string
  initialEndDate?: string
  filterTestId: string
  pickerTestId: string
}

interface CreateRangeDateInputFilterConfig<TProps> {
  displayName: string
  filterTestId: string
  pickerTestId: string
  getDateRangeChangeHandler: (props: TProps) => RangeDateInputFilterProps['onDateRangeChange']
}

export const RangeDateInputFilter: React.FC<RangeDateInputFilterProps> = ({
  onDateRangeChange,
  initialStartDate,
  initialEndDate,
  filterTestId,
  pickerTestId
}) => {
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null)

  useEffect(() => {
    if (initialStartDate && initialEndDate) {
      setDateRange([initialStartDate, initialEndDate])
      return
    }

    setDateRange(null)
  }, [initialStartDate, initialEndDate])

  const handleDateRangeChange = (value: string | DateRangeValue | null) => {
    if (Array.isArray(value)) {
      setDateRange(value)

      if (value[0] && value[1]) {
        onDateRangeChange(value[0], value[1])
        return
      }
    }

    setDateRange(null)
    onDateRangeChange(null, null)
  }

  const startDatePlaceholder = getTranslationFromI18nKeyAndLabel(
    'lowcoder:expense_plan_list.expense_plan_table.start_date',
    'Start Date'
  )
  const endDatePlaceholder = getTranslationFromI18nKeyAndLabel(
    'lowcoder:expense_plan_list.expense_plan_table.end_date',
    'End Date'
  )

  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid={filterTestId}>
      <DateInput
        mode="range"
        value={dateRange}
        onChange={handleDateRangeChange}
        placeholder={startDatePlaceholder}
        placeholderEnd={endDatePlaceholder}
        className="gba:w-60"
        outputFormat="local"
        showClearButton
        data-testid={pickerTestId}
      />
    </div>
  )
}

export function createRangeDateInputFilter<
  TProps extends Pick<RangeDateInputFilterProps, 'initialStartDate' | 'initialEndDate'>
>({ displayName, filterTestId, pickerTestId, getDateRangeChangeHandler }: CreateRangeDateInputFilterConfig<TProps>) {
  const RangeDateInputFilterWrapper: React.FC<TProps> = props => (
    <RangeDateInputFilter
      onDateRangeChange={getDateRangeChangeHandler(props)}
      initialStartDate={props.initialStartDate}
      initialEndDate={props.initialEndDate}
      filterTestId={filterTestId}
      pickerTestId={pickerTestId}
    />
  )

  RangeDateInputFilterWrapper.displayName = displayName

  return RangeDateInputFilterWrapper
}
