import type { ReactNode } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnConfig } from '@/business-apps/fin/expenses/common/types/columnTypes'

export interface BackofficeListTableToolbarProps {
  totalCount: number
  isLoading: boolean
  searchText: string
  searchPlaceholder: string
  onSearchChange: (value: string) => void
  filtersObject: Record<string, unknown>
  filterConfiguration: FilterConfiguration
  onFilterChange: (filters: Record<string, unknown>) => void
  listSectionLabel: string
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  sortableColumns: ColumnConfig[]
  availableColumns: ColumnConfig[]
  visibleColumns: string[]
  onVisibleColumnsChange: (columns: string[]) => void
  secondaryActions: ReactNode
  filterSheetTitle: string
  filterSheetDescription: string
}

export interface BackofficeListTableDisplayProps extends BackofficeListTableToolbarProps {
  children: ReactNode
}

export function BackofficeListTableDisplay({
  children,
  totalCount,
  isLoading,
  searchText,
  searchPlaceholder,
  onSearchChange,
  filtersObject,
  filterConfiguration,
  onFilterChange,
  listSectionLabel,
  sorting,
  onSortingChange,
  sortableColumns,
  availableColumns,
  visibleColumns,
  onVisibleColumnsChange,
  secondaryActions,
  filterSheetTitle,
  filterSheetDescription
}: Readonly<BackofficeListTableDisplayProps>) {
  return (
    <DataDisplay
      titleSections={[
        {
          id: 'list',
          label: listSectionLabel,
          metadata: { count: totalCount, isLoading }
        }
      ]}
      currentSection="list"
      searchValue={searchText}
      searchPlaceholder={searchPlaceholder}
      onSearchChange={onSearchChange}
      filters={filtersObject}
      filterConfiguration={filterConfiguration}
      onFilterChange={onFilterChange}
      sorting={sorting}
      sortableColumns={sortableColumns}
      onSortingChange={onSortingChange}
      availableColumns={availableColumns}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={onVisibleColumnsChange}
      toolbarDensity="default"
      enableLiveFiltering={true}
      filterSheetTitle={filterSheetTitle}
      filterSheetDescription={filterSheetDescription}
      secondaryActions={secondaryActions}
    >
      {children}
    </DataDisplay>
  )
}
