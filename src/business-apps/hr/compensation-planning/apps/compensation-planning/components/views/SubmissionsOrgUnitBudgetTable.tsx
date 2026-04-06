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
  toolbarSecondary?: React.ReactNode
}

export function SubmissionsOrgUnitBudgetTable({
  rows,
  loading,
  error,
  hasCompanyBudgetRows,
  toolbarSecondary
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
  } = useSubmissionsOrgUnitTableModel(t, rows, hasCompanyBudgetRows)

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
      secondaryActions={
        toolbarSecondary ? (
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">{toolbarSecondary}</div>
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
