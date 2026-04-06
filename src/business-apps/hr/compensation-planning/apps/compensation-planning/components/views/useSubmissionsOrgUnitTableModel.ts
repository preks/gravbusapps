import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { SubmissionsOrgUnitTableRow } from './submissionsOrgUnitTableRows'
import {
  SUBMISSIONS_ORG_UNIT_TABLE_VISIBLE_COLUMN_IDS,
  buildSubmissionsOrgUnitTableColumns
} from './buildSubmissionsOrgUnitTableColumns'
import { formatBudgetPlanStatusLabelForDisplay } from './budgetSetupDisplayUtils'
import type { TranslateFn } from './budgetSetupDisplayUtils'
import { buildSubmissionsOrgUnitFilterConfiguration } from './buildSubmissionsOrgUnitFilterConfiguration'

export function useSubmissionsOrgUnitTableModel(
  t: TranslateFn,
  sourceRows: SubmissionsOrgUnitTableRow[],
  hasCompanyBudgetRows: boolean
) {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [selectedOrgUnitBudgetStatuses, setSelectedOrgUnitBudgetStatuses] = useState<string[]>([])
  const [sorting, setSorting] = useState<SortingState>([{ id: 'organizationalUnitName', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [
    ...SUBMISSIONS_ORG_UNIT_TABLE_VISIBLE_COLUMN_IDS
  ])

  const formatStatus = useCallback((v: string) => formatBudgetPlanStatusLabelForDisplay(v, t) || v, [t])

  const orgUnitBudgetStatusOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const row of sourceRows) {
      if (row.budgetPlanStatus) {
        ids.add(row.budgetPlanStatus)
      }
    }
    return [...ids]
      .sort((a, b) => a.localeCompare(b))
      .map(id => ({ id, label: formatBudgetPlanStatusLabelForDisplay(id, t) || id }))
  }, [sourceRows, t])

  const filterConfiguration = useMemo(
    () => buildSubmissionsOrgUnitFilterConfiguration(t, orgUnitBudgetStatusOptions),
    [t, orgUnitBudgetStatusOptions]
  )

  const filteredRows = useMemo(() => {
    let list = sourceRows

    const q = debouncedSearch.trim().toLowerCase()
    if (q) {
      list = list.filter(row => {
        const statusLabel = formatBudgetPlanStatusLabelForDisplay(row.budgetPlanStatus, t).toLowerCase()
        return (
          row.organizationalUnitName.toLowerCase().includes(q) ||
          row.organizationalUnitId.toLowerCase().includes(q) ||
          row.budgetPlanLabel.toLowerCase().includes(q) ||
          statusLabel.includes(q) ||
          String(row.salaryBudgetAmount).includes(q) ||
          String(row.salaryBudgetPercent).includes(q)
        )
      })
    }

    if (selectedOrgUnitBudgetStatuses.length > 0) {
      const set = new Set(selectedOrgUnitBudgetStatuses)
      list = list.filter(row => row.budgetPlanStatus != null && set.has(row.budgetPlanStatus))
    }

    return list
  }, [sourceRows, debouncedSearch, selectedOrgUnitBudgetStatuses, t])

  const hasActiveFilters = useMemo(
    () => debouncedSearch.trim() !== '' || selectedOrgUnitBudgetStatuses.length > 0,
    [debouncedSearch, selectedOrgUnitBudgetStatuses]
  )

  const emptyMessage = useMemo(() => {
    if (!hasCompanyBudgetRows) {
      return t('submissions-table-empty-no-company-budgets')
    }
    if (sourceRows.length === 0) {
      return t('submissions-table-empty-no-org-unit-rows')
    }
    if (hasActiveFilters) {
      return t('submissions-table-empty-filtered')
    }
    return t('submissions-table-empty-no-org-unit-rows')
  }, [hasActiveFilters, hasCompanyBudgetRows, sourceRows.length, t])

  const filtersObject = useMemo(() => {
    const obj: Record<string, unknown> = {}
    if (selectedOrgUnitBudgetStatuses.length > 0) {
      obj.orgUnitBudgetStatuses = selectedOrgUnitBudgetStatuses
    }
    return obj
  }, [selectedOrgUnitBudgetStatuses])

  const handleFilterChangeFromDisplay = useCallback((filters: Record<string, unknown>) => {
    const statuses = (filters.orgUnitBudgetStatuses as string[] | undefined) ?? []
    setSelectedOrgUnitBudgetStatuses(statuses)
  }, [])

  const columns = useMemo(() => buildSubmissionsOrgUnitTableColumns(t, formatStatus), [formatStatus, t])

  const visibleTableColumns = useMemo(
    () =>
      columns.filter(col =>
        visibleColumns.includes(String((col as ColumnDef<SubmissionsOrgUnitTableRow> & { id?: string }).id ?? ''))
      ),
    [columns, visibleColumns]
  )

  const sortableColumns = useMemo(
    () => [
      { id: 'organizationalUnitName', label: t('submissions-table-col-org-unit') },
      { id: 'budgetPlanLabel', label: t('submissions-table-col-company-budget-plan') },
      { id: 'budgetPlanStatus', label: t('budget-setup-table-col-budget-plan-status') },
      { id: 'salaryBudgetAmount', label: t('budget-setup-table-col-salary-budget-amount') },
      { id: 'salaryBudgetPercent', label: t('budget-setup-table-col-salary-budget-percent') }
    ],
    [t]
  )

  const availableColumnsForDisplay = useMemo(() => sortableColumns, [sortableColumns])

  const handlePaginationChange = useCallback((next: { pageIndex: number; pageSize: number }) => {
    setPagination(next)
  }, [])

  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }, [debouncedSearch, selectedOrgUnitBudgetStatuses, sorting])

  return {
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
  }
}
