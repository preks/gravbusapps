import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  items?: any[]
  isLoading?: boolean
  error?: string | null
  totalCount?: number
  currentPage?: number
  pageSize?: number
  onTableChange?: (pagination: any, filters: any, sorter: any) => void
  search?: string
  onSearchChange?: (search: string) => void
  selectedFilters?: string[]
  setFilters?: (filters: string[]) => void
  handleFilterChange?: (filterId: string, selected: boolean) => void
  clearFilters?: () => void
  filterLabelMap?: Record<string, string>
  onAddExpenseRequest?: () => void
  onForceRefresh?: () => void
  tableRefreshTrigger?: number
  addFilter?: (filterId: string) => void
  removeFilter?: (filterId: string) => void
  requestDateRange?: [Date | null, Date | null] | null
  setRequestDateRange?: (range: [Date | null, Date | null] | null) => void
  startDateRange?: [Date | null, Date | null] | null
  setStartDateRange?: (range: [Date | null, Date | null] | null) => void
  endDateRange?: [Date | null, Date | null] | null
  setEndDateRange?: (range: [Date | null, Date | null] | null) => void
  effectiveDateRange?: [Date | null, Date | null] | null
  setEffectiveDateRange?: (range: [Date | null, Date | null] | null) => void
  reimbursableAmountRange?: { min?: number; max?: number } | null
  setReimbursableAmountRange?: (range: { min?: number; max?: number } | null) => void
  advanceAmountRange?: { min?: number; max?: number } | null
  setAdvanceAmountRange?: (range: { min?: number; max?: number } | null) => void
  currencyStats?: Array<{ ref: string; code: string; count: number }>
}
