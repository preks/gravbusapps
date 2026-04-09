import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { DataFilterGroup } from '@/components/data-filter/DataFilter'
import type { ExpensePlan } from '../../../../hooks/useGetExpensePlans'

export interface ExpensePlansTableProps extends BusinessAppContextProps {
  items: ExpensePlan[] | undefined
  isLoading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  pageSize: number
  onTableChange: (pagination: any, filters: any, sorter: any) => void
  search: string
  onSearchChange: (search: string) => void
  selectedFilters: string[]
  setFilters: (filters: string[]) => void
  filterGroups: DataFilterGroup[]
  handleFilterChange: (filterId: string, selected: boolean) => void
  clearFilters: () => void
  filterLabelMap: Record<string, string>
  addFilter: (filterId: string, selected: boolean) => void
  removeFilter: (filterId: string) => void
  tableRefreshTrigger?: number
  currencyStats?: Array<{ ref: string; code: string; count: number }>
  sortField?: string
  sortOrder?: 'ascend' | 'descend' | null
  planDateRange?: [Date | null, Date | null] | null
  setPlanDateRange?: (range: [Date | null, Date | null] | null) => void
  startDateRange?: [Date | null, Date | null] | null
  setStartDateRange?: (range: [Date | null, Date | null] | null) => void
  endDateRange?: [Date | null, Date | null] | null
  setEndDateRange?: (range: [Date | null, Date | null] | null) => void
  effectiveDateRange?: [Date | null, Date | null] | null
  setEffectiveDateRange?: (range: [Date | null, Date | null] | null) => void
  onFiltersChange?: () => void
  availableStatuses?: string[]
  widgetTopDestinationFilterTokens?: string[]
}
