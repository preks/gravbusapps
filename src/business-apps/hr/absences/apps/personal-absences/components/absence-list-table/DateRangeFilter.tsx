import { createRangeDateInputFilter } from './RangeDateInputFilter'

interface DateRangeFilterProps {
  onDateRangeChange: (startDate: string | null, endDate: string | null) => void
  initialStartDate?: string
  initialEndDate?: string
}

export const DateRangeFilter = createRangeDateInputFilter<DateRangeFilterProps>({
  displayName: 'DateRangeFilter',
  filterTestId: 'date-range-filter',
  pickerTestId: 'date-range-picker',
  getDateRangeChangeHandler: ({ onDateRangeChange }) => onDateRangeChange
})
