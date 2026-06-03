import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { SubmissionsOrgUnitTableRow } from './submissionsOrgUnitTableRows'
import {
  type SubmissionsOrgUnitSelectionParams,
  SUBMISSIONS_ORG_UNIT_TABLE_VISIBLE_COLUMN_IDS,
  buildSubmissionsOrgUnitTableColumns
} from './buildSubmissionsOrgUnitTableColumns'
import { formatOrgUnitBudgetStatusLabelForDisplay } from './budgetSetupDisplayUtils'
import type { TranslateFn } from './budgetSetupDisplayUtils'
import { buildSubmissionsOrgUnitFilterConfiguration } from './buildSubmissionsOrgUnitFilterConfiguration'

function parseOptionalNumberRange(value: unknown): { min?: number; max?: number } | null {
  if (value == null || typeof value !== 'object') {
    return null
  }
  const o = value as { min?: unknown; max?: unknown }
  const min = typeof o.min === 'number' && !Number.isNaN(o.min) ? o.min : undefined
  const max = typeof o.max === 'number' && !Number.isNaN(o.max) ? o.max : undefined
  if (min === undefined && max === undefined) {
    return null
  }
  return { min, max }
}

function matchesNumberRange(value: number | null, range: { min?: number; max?: number } | null): boolean {
  if (range == null) {
    return true
  }
  const n = value ?? 0
  if (range.min !== undefined && n < range.min) {
    return false
  }
  if (range.max !== undefined && n > range.max) {
    return false
  }
  return true
}

export function useSubmissionsOrgUnitTableModel(
  t: TranslateFn,
  sourceRows: SubmissionsOrgUnitTableRow[],
  hasCompanyBudgetRows: boolean,
  compensationPlanSelected = true,
  selection?: SubmissionsOrgUnitSelectionParams
) {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [selectedOrgUnitBudgetStatuses, setSelectedOrgUnitBudgetStatuses] = useState<string[]>([])
  const [salaryBudgetAmountRange, setSalaryBudgetAmountRange] = useState<{ min?: number; max?: number } | null>(null)
  const [allocationAmountRange, setAllocationAmountRange] = useState<{ min?: number; max?: number } | null>(null)
  const [poolShareRange, setPoolShareRange] = useState<{ min?: number; max?: number } | null>(null)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'organizationalUnitName', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [
    ...SUBMISSIONS_ORG_UNIT_TABLE_VISIBLE_COLUMN_IDS
  ])

  const formatStatus = useCallback((v: string) => formatOrgUnitBudgetStatusLabelForDisplay(v, t) || v, [t])

  const orgUnitBudgetStatusOptions = useMemo(() => {
    const statusCounts = new Map<string, number>()
    for (const row of sourceRows) {
      if (row.budgetPlanStatus) {
        statusCounts.set(row.budgetPlanStatus, (statusCounts.get(row.budgetPlanStatus) ?? 0) + 1)
      }
    }
    return [...statusCounts.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map(id => {
        const label = formatOrgUnitBudgetStatusLabelForDisplay(id, t) || id
        return { id, label: `${label} (${statusCounts.get(id) ?? 0})` }
      })
  }, [sourceRows, t])

  const filterConfiguration = useMemo(
    () => buildSubmissionsOrgUnitFilterConfiguration(t, orgUnitBudgetStatusOptions, sourceRows),
    [t, orgUnitBudgetStatusOptions, sourceRows]
  )

  const filteredRows = useMemo(() => {
    let list = sourceRows

    const q = debouncedSearch.trim().toLowerCase()
    if (q) {
      list = list.filter(row => {
        const statusLabel = formatOrgUnitBudgetStatusLabelForDisplay(row.budgetPlanStatus, t).toLowerCase()
        return (
          row.organizationalUnitName.toLowerCase().includes(q) ||
          row.organizationalUnitId.toLowerCase().includes(q) ||
          row.budgetPlanLabel.toLowerCase().includes(q) ||
          statusLabel.includes(q) ||
          String(row.salaryBudgetAmount).includes(q) ||
          String(row.allocationAmount).includes(q) ||
          String(row.allocationShareOfCompanyPoolPercent ?? '').includes(q) ||
          String(row.proposedNewSalary).includes(q) ||
          String(row.organizationalUnitCurrentTotalSalary).includes(q)
        )
      })
    }

    if (selectedOrgUnitBudgetStatuses.length > 0) {
      const set = new Set(selectedOrgUnitBudgetStatuses)
      list = list.filter(row => row.budgetPlanStatus != null && set.has(row.budgetPlanStatus))
    }

    if (salaryBudgetAmountRange != null) {
      list = list.filter(row => matchesNumberRange(row.salaryBudgetAmount, salaryBudgetAmountRange))
    }

    if (allocationAmountRange != null) {
      list = list.filter(row => matchesNumberRange(row.allocationAmount, allocationAmountRange))
    }

    if (poolShareRange != null) {
      list = list.filter(row => matchesNumberRange(row.allocationShareOfCompanyPoolPercent, poolShareRange))
    }

    return list
  }, [
    sourceRows,
    debouncedSearch,
    selectedOrgUnitBudgetStatuses,
    salaryBudgetAmountRange,
    allocationAmountRange,
    poolShareRange,
    t
  ])

  const hasActiveFilters = useMemo(
    () =>
      debouncedSearch.trim() !== '' ||
      selectedOrgUnitBudgetStatuses.length > 0 ||
      salaryBudgetAmountRange != null ||
      allocationAmountRange != null ||
      poolShareRange != null,
    [allocationAmountRange, debouncedSearch, poolShareRange, salaryBudgetAmountRange, selectedOrgUnitBudgetStatuses]
  )

  const emptyMessage = useMemo(() => {
    if (!compensationPlanSelected) {
      return t('submissions-table-empty-select-compensation-cycle')
    }
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
  }, [compensationPlanSelected, hasActiveFilters, hasCompanyBudgetRows, sourceRows.length, t])

  const filtersObject = useMemo(() => {
    const obj: Record<string, unknown> = {}
    if (selectedOrgUnitBudgetStatuses.length > 0) {
      obj.orgUnitBudgetStatuses = selectedOrgUnitBudgetStatuses
    }
    if (salaryBudgetAmountRange != null) {
      obj.salaryBudgetAmount = { ...salaryBudgetAmountRange }
    }
    if (allocationAmountRange != null) {
      obj.allocationAmount = { ...allocationAmountRange }
    }
    if (poolShareRange != null) {
      obj.allocationShareOfCompanyPoolPercent = { ...poolShareRange }
    }
    return obj
  }, [allocationAmountRange, poolShareRange, salaryBudgetAmountRange, selectedOrgUnitBudgetStatuses])

  const handleFilterChangeFromDisplay = useCallback((filters: Record<string, unknown>) => {
    const statuses = (filters.orgUnitBudgetStatuses as string[] | undefined) ?? []
    setSelectedOrgUnitBudgetStatuses(statuses)
    setSalaryBudgetAmountRange(parseOptionalNumberRange(filters.salaryBudgetAmount))
    setAllocationAmountRange(parseOptionalNumberRange(filters.allocationAmount))
    setPoolShareRange(parseOptionalNumberRange(filters.allocationShareOfCompanyPoolPercent))
  }, [])

  const columns = useMemo(
    () => buildSubmissionsOrgUnitTableColumns(t, formatStatus, selection),
    [formatStatus, selection, t]
  )

  const visibleTableColumns = useMemo(
    () =>
      columns.filter(
        col =>
          String((col as ColumnDef<SubmissionsOrgUnitTableRow> & { id?: string }).id ?? '') === 'selection' ||
          visibleColumns.includes(String((col as ColumnDef<SubmissionsOrgUnitTableRow> & { id?: string }).id ?? ''))
      ),
    [columns, visibleColumns]
  )

  const sortableColumns = useMemo(
    () => [
      { id: 'organizationalUnitName', label: t('submissions-table-col-org-unit') },
      { id: 'budgetPlanLabel', label: t('submissions-table-col-company-budget-plan') },
      { id: 'budgetPlanStatus', label: t('budget-setup-table-col-budget-plan-status') },
      { id: 'salaryBudgetAmount', label: t('submissions-table-col-department-salary-budget') },
      { id: 'allocationAmount', label: t('submissions-table-col-org-unit-allocation-amount') },
      { id: 'allocationShareOfCompanyPoolPercent', label: t('submissions-table-col-allocation-share-percent') },
      { id: 'proposedNewSalary', label: t('submissions-table-col-proposed-new-salary') },
      { id: 'organizationalUnitCurrentTotalSalary', label: t('submissions-table-col-org-unit-current-total-salary') }
    ],
    [t]
  )

  const availableColumnsForDisplay = useMemo(() => sortableColumns, [sortableColumns])

  const handlePaginationChange = useCallback((next: { pageIndex: number; pageSize: number }) => {
    setPagination(next)
  }, [])

  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }, [
    allocationAmountRange,
    debouncedSearch,
    poolShareRange,
    salaryBudgetAmountRange,
    selectedOrgUnitBudgetStatuses,
    sorting
  ])

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
