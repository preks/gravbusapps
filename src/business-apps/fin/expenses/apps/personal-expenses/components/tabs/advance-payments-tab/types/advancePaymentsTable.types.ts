import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string
  onSearchChange?: (search: string) => void
  activeFilter?: string[]
  onFilterChange?: (filter: string[]) => void
  onClearFilters?: () => void
  filterGroups?: unknown[]
  handleFilterChange?: (filterId: string, selected: boolean) => void
  filterLabelMap?: Record<string, string>
  amountRange?: { min?: number; max?: number } | null
  advanceRange?: { min?: number; max?: number } | null
  setAmountRange?: (range: { min?: number; max?: number } | null) => void
  setAdvanceRange?: (range: { min?: number; max?: number } | null) => void
  selectedFilters?: string[]
  removeFilter?: (filterId: string) => void
  tableRefreshTrigger?: number
}
