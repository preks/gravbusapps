import { createRangeDateInputFilter } from './RangeDateInputFilter'

interface CreationDateFilterProps {
  onCreationDateRangeChange: (startDate: string | null, endDate: string | null) => void
  initialStartDate?: string
  initialEndDate?: string
}

export const CreationDateFilter = createRangeDateInputFilter<CreationDateFilterProps>({
  displayName: 'CreationDateFilter',
  filterTestId: 'creation-date-filter',
  pickerTestId: 'creation-date-picker',
  getDateRangeChangeHandler: ({ onCreationDateRangeChange }) => onCreationDateRangeChange
})
