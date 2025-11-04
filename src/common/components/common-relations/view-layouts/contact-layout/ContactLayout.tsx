import type { ColumnDef } from '@tanstack/react-table'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { DataDisplay } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ContactListLayout } from './ContactListLayout'
import type { CommonContact } from '@/common/data/relations/types/commonContactTypes'

/**
 * Contact Layout Props
 */
export interface ContactLayoutProps<TContact extends CommonContact = CommonContact> {
  // Data
  contacts: TContact[]
  totalCount: number
  loading: boolean
  error: string | null

  // Display
  columns: ColumnDef<TContact>[]
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
  onRowClick?: (contact: TContact) => void
  renderRowActions?: (row: { original: TContact }) => React.ReactNode

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
 * Dumb Contact Layout Component
 * Pure presentational component that displays contacts in a data display layout
 * All business logic should be in the consuming smart components
 */
export function ContactLayout<TContact extends CommonContact = CommonContact>(props: ContactLayoutProps<TContact>) {
  const {
    contacts,
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
    dataTestId = 'contact-view'
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
            label: getTranslationFromI18nKeyAndLabel('common:allContacts', 'All Contacts'),
            metadata: {
              count: totalCount,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('common:searchContacts', 'Search contacts...')}
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
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('common:filterContacts', 'Filter Contacts')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'common:filterContactsDescription',
          'Apply filters to narrow down the contact list'
        )}
      >
        <ContactListLayout<TContact>
          data={contacts}
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

export default ContactLayout
