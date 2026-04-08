import React from 'react'
import { DataDisplay, DataTable, TooltipProvider, useTranslation } from '@newwork/nw-design-system'
import type { SubmissionsOrgUnitTableRow } from './submissionsOrgUnitTableRows'
import { useSubmissionsOrgUnitTableModel } from './useSubmissionsOrgUnitTableModel'
import translations from '../../_i18n'

export interface SubmissionsOrgUnitBudgetTableProps {
  rows: SubmissionsOrgUnitTableRow[]
  loading: boolean
  error: string | null
  hasCompanyBudgetRows: boolean
  /** Company selector aligned with the DataDisplay toolbar (search / filters / sort). */
  companyToolbar?: React.ReactNode
  /** Opens manager-compensation-planning for supervisor review (submitted proposals). */
  onReviewTeam?: (row: SubmissionsOrgUnitTableRow) => void
}

export function SubmissionsOrgUnitBudgetTable({
  rows,
  loading,
  error,
  hasCompanyBudgetRows,
  companyToolbar,
  onReviewTeam
}: Readonly<SubmissionsOrgUnitBudgetTableProps>) {
  const { t } = useTranslation(translations)
  const {
    searchInput,
    setSearchInput,
    sorting,
    setSorting,
    pagination,
    visibleColumns,
    setVisibleColumns,
    filterConfiguration,
    filteredRows,
    filtersObject,
    handleFilterChangeFromDisplay,
    emptyMessage,
    visibleTableColumns,
    sortableColumns,
    availableColumnsForDisplay,
    handlePaginationChange
  } = useSubmissionsOrgUnitTableModel(t, rows, hasCompanyBudgetRows, onReviewTeam)

  return (
    <DataDisplay
      data-testid="submissions-org-unit-table-display"
      titleSections={[
        {
          id: 'submissions-org-units',
          label: t('submissions-table-section-title'),
          metadata: { count: filteredRows.length, isLoading: loading }
        }
      ]}
      currentSection="submissions-org-units"
      toolbarDensity="default"
      searchValue={searchInput}
      searchPlaceholder={t('submissions-table-search-placeholder')}
      onSearchChange={setSearchInput}
      filters={filtersObject}
      filterConfiguration={filterConfiguration}
      onFilterChange={handleFilterChangeFromDisplay}
      enableLiveFiltering
      filterSheetTitle={t('submissions-table-filter-sheet-title')}
      filterSheetDescription={t('submissions-table-filter-sheet-description')}
      sorting={sorting}
      sortableColumns={sortableColumns}
      onSortingChange={setSorting}
      availableColumns={availableColumnsForDisplay}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={setVisibleColumns}
      primaryAction={
        companyToolbar ? (
          <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-3 gba:pl-2 gba:md:pl-3">{companyToolbar}</div>
        ) : undefined
      }
    >
      <TooltipProvider>
        <DataTable<SubmissionsOrgUnitTableRow>
          data={filteredRows}
          columns={visibleTableColumns}
          loading={loading}
          error={error ?? undefined}
          sorting={sorting}
          onSortingChange={setSorting}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          enablePagination
          enableSorting
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          tableLayout="auto"
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage={emptyMessage}
          data-testid="submissions-org-unit-budget-table"
        />
      </TooltipProvider>
    </DataDisplay>
  )
}
