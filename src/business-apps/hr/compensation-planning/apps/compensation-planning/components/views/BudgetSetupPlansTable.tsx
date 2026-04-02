import React from 'react'
import { DataDisplay, DataTable, TooltipProvider, useTranslation } from '@newwork/nw-design-system'
import type { CompensationBudgetPlanCompanyRow } from '../../hooks/useBudgetSetupForCompany'
import type { BudgetSetupPlanTableRow } from './budgetSetupPlanTableRows'
import { useBudgetSetupPlansTableModel } from './useBudgetSetupPlansTableModel'
import translations from '../../_i18n'

export interface BudgetSetupPlansTableProps {
  /** Legal entity selected in the app toolbar — table shows `compensation_budget_plan_company` for this id only. */
  companyId: string
  plans: CompensationBudgetPlanListItem[]
  companyRowsByPlanId: Record<string, CompensationBudgetPlanCompanyRow>
  teamSalaryBaseline: number
  currencyCode: string
  loading: boolean
  error: string | null
  toolbarEnd?: React.ReactNode
}

export const BudgetSetupPlansTable: React.FC<BudgetSetupPlansTableProps> = ({
  companyId,
  companyRowsByPlanId,
  teamSalaryBaseline,
  currencyCode,
  loading,
  error,
  toolbarEnd
}) => {
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
  } = useBudgetSetupPlansTableModel(t, companyRowsByPlanId, companyId, teamSalaryBaseline, currencyCode)

  return (
    <DataDisplay
      data-testid="budget-setup-plans-display"
      titleSections={[
        {
          id: 'budget-plans',
          label: t('budget-setup-table-section-title'),
          metadata: { count: filteredRows.length, isLoading: loading }
        }
      ]}
      currentSection="budget-plans"
      toolbarDensity="default"
      searchValue={searchInput}
      searchPlaceholder={t('budget-setup-table-search-placeholder')}
      onSearchChange={setSearchInput}
      filters={filtersObject}
      filterConfiguration={filterConfiguration}
      onFilterChange={handleFilterChangeFromDisplay}
      enableLiveFiltering
      filterSheetTitle={t('budget-setup-table-filter-sheet-title')}
      filterSheetDescription={t('budget-setup-table-filter-sheet-description')}
      sorting={sorting}
      sortableColumns={sortableColumns}
      onSortingChange={setSorting}
      availableColumns={availableColumnsForDisplay}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={setVisibleColumns}
      secondaryActions={toolbarEnd}
    >
      <TooltipProvider>
        <DataTable<BudgetSetupPlanTableRow>
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
          tableLayout="fixed"
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage={emptyMessage}
          data-testid="budget-setup-plans-table"
        />
      </TooltipProvider>
    </DataDisplay>
  )
}
