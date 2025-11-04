import type { ColumnDef } from '@tanstack/react-table'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { DataDisplay } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { LeadListLayout } from './LeadListLayout'
import type { CommonLead } from '@/common/data/relations/types/commonLeadTypes'

/**
 * Lead Layout Props
 */
export interface LeadLayoutProps<TLead extends CommonLead = CommonLead> {
  // Data
  leads: TLead[]
  totalCount: number
  loading: boolean
  error: string | null

  // Display
  columns: ColumnDef<TLead>[]
  visibleColumns: string[]
  availableColumns: Array<{ id: string; label: string }>
  onVisibleColumnsChange: (columns: string[]) => void

  // Search & Filter
  searchTerm: string
  onSearchChange: (term: string) => void
  filterConfig: FilterConfiguration
  selectedFilters: Record<string, any>
  onFilterChange: (filters: Record<string, any>) => void

  // Sorting & Pagination
  sorting: Array<{ id: string; desc: boolean }>
  onSortingChange: (sorting: Array<{ id: string; desc: boolean }>) => void
  sortableColumns: Array<{ id: string; label: string }>
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void

  // Interactions
  onRowClick?: (lead: TLead) => void
  renderRowActions?: (row: { original: TLead }) => React.ReactNode

  // Optional sections
  renderStatistics?: () => React.ReactNode
  primaryAction?: React.ReactNode

  // Config
  hideFilters?: boolean
  hideStatistics?: boolean
  hideCreate?: boolean
  dataTestId?: string
}

/**
 * Dumb Lead Layout Component
 * Pure presentational component that displays leads in a data display layout
 * All business logic should be in the consuming smart components
 */
export function LeadLayout<TLead extends CommonLead = CommonLead>(props: LeadLayoutProps<TLead>) {
  const {
    leads,
    totalCount,
    loading,
    error,
    columns,
    visibleColumns,
    availableColumns,
    onVisibleColumnsChange,
    searchTerm,
    onSearchChange,
    filterConfig,
    selectedFilters,
    onFilterChange,
    sorting,
    onSortingChange,
    sortableColumns,
    pagination,
    onPaginationChange,
    onRowClick,
    renderRowActions,
    renderStatistics,
    primaryAction,
    hideFilters = false,
    hideStatistics = false,
    hideCreate = false,
    dataTestId = 'lead-view'
  } = props

  return (
    <div data-testid={dataTestId}>
      {/* Statistics */}
      {!hideStatistics && renderStatistics?.()}

      {/* DataDisplay */}
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('common:allLeads', 'All Leads'),
            metadata: {
              count: totalCount,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('common:searchLeads', 'Search leads...')}
        onSearchChange={onSearchChange}
        filters={hideFilters ? undefined : selectedFilters}
        filterConfiguration={hideFilters ? undefined : filterConfig}
        onFilterChange={hideFilters ? undefined : onFilterChange}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={onSortingChange}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={onVisibleColumnsChange}
        primaryAction={hideCreate ? undefined : primaryAction}
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('common:filterLeads', 'Filter Leads')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'common:filterLeadsDescription',
          'Apply filters to narrow down the lead list'
        )}
      >
        <LeadListLayout<TLead>
          data={leads}
          loading={loading}
          error={error}
          totalCount={totalCount}
          columns={columns.filter(col => visibleColumns.includes(col.id as string))}
          sorting={sorting}
          onSortingChange={onSortingChange}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          actions={renderRowActions}
          onRowClick={onRowClick}
          dataTestId={`${dataTestId}-list`}
        />
      </DataDisplay>
    </div>
  )
}

export default LeadLayout
