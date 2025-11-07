import type { ColumnDef } from '@tanstack/react-table'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { DataDisplay } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AccountListLayout } from './AccountListLayout'
import type { CommonAccount } from '@/common/data/relations/types/commonAccountTypes'
import { AccountStatisticsLayout, type AccountStatisticsData } from './components/AccountStatisticsLayout'

/**
 * Account Layout Props
 */
export interface AccountLayoutProps<TAccount extends CommonAccount = CommonAccount> {
  // Data
  accounts: TAccount[]
  totalCount: number
  loading: boolean
  error: string | null

  // Display
  columns: ColumnDef<TAccount>[]
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
  onRowClick?: (account: TAccount) => void
  renderRowActions?: (row: { original: TAccount }) => React.ReactNode

  // Optional sections
  accountStatistics?: AccountStatisticsData
  variant?: 'customer' | 'investment'
  primaryAction?: React.ReactNode

  // Config
  hideFilters?: boolean
  hideStatistics?: boolean
  hideCreate?: boolean
  dataTestId?: string
}

/**
 * Dumb Account Layout Component
 * Pure presentational component that displays accounts in a data display layout
 * All business logic should be in the consuming smart components
 */
export function AccountLayout<TAccount extends CommonAccount = CommonAccount>(props: AccountLayoutProps<TAccount>) {
  const {
    accounts,
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
    accountStatistics,
    variant = 'customer',
    primaryAction,
    hideFilters = false,
    hideStatistics = false,
    hideCreate = false,
    dataTestId = 'account-view'
  } = props

  return (
    <div data-testid={dataTestId}>
      {/* Statistics */}
      {!hideStatistics && accountStatistics && (
        <AccountStatisticsLayout
          statistics={accountStatistics}
          variant={variant}
          data-testid={`${dataTestId}-statistics`}
        />
      )}

      {/* DataDisplay */}
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('common:allAccounts', 'All Accounts'),
            metadata: {
              count: totalCount,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('common:searchAccounts', 'Search accounts...')}
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
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('common:filterAccounts', 'Filter Accounts')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'common:filterAccountsDescription',
          'Apply filters to narrow down the account list'
        )}
      >
        <AccountListLayout<TAccount>
          data={accounts}
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

export default AccountLayout
