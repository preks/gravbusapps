import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useDebounce } from '@/common/hooks/useDebounce'
import type {
  CompensationBudgetPlanCompanyRow,
  CompensationBudgetPlanListItem
} from '../../hooks/useBudgetSetupForCompany'
import {
  buildBudgetSetupPlanTableRows,
  type BudgetSetupCompanyOption,
  type BudgetSetupPlanTableRow
} from './budgetSetupPlanTableRows'
import {
  BUDGET_SETUP_PLANS_VISIBLE_COLUMN_IDS,
  buildBudgetSetupPlansTableColumns
} from './buildBudgetSetupPlansTableColumns'
import { formatBudgetPlanStatusLabelForDisplay } from './budgetSetupDisplayUtils'
import type { TranslateFn } from './budgetSetupDisplayUtils'
import { buildBudgetSetupPlansFilterConfiguration } from './buildBudgetSetupPlansFilterConfiguration'

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

function matchesNumberRange(value: number, range: { min?: number; max?: number } | null): boolean {
  if (range == null) {
    return true
  }
  if (range.min !== undefined && value < range.min) {
    return false
  }
  if (range.max !== undefined && value > range.max) {
    return false
  }
  return true
}

export function useBudgetSetupPlansTableModel(
  t: TranslateFn,
  companyBudgetPlanRows: CompensationBudgetPlanCompanyRow[],
  selectedCompanyId: string | null,
  currencyCode: string,
  plans: CompensationBudgetPlanListItem[],
  onEditRow: (row: BudgetSetupPlanTableRow) => void,
  selectedCompensationPlanId: string | null,
  companies: BudgetSetupCompanyOption[] = [],
  showCompanyColumn = false,
  editDisabled = false,
  showCycleColumn = true
) {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [selectedCompanyBudgetStatuses, setSelectedCompanyBudgetStatuses] = useState<string[]>([])
  const [salaryAmountRange, setSalaryAmountRange] = useState<{ min?: number; max?: number } | null>(null)
  const [salaryPercentRange, setSalaryPercentRange] = useState<{ min?: number; max?: number } | null>(null)
  const [allocationAmountRange, setAllocationAmountRange] = useState<{ min?: number; max?: number } | null>(null)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'companyBudgetStatus', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...BUDGET_SETUP_PLANS_VISIBLE_COLUMN_IDS])

  const allRows = useMemo(
    () =>
      buildBudgetSetupPlanTableRows(
        companyBudgetPlanRows,
        selectedCompanyId,
        currencyCode,
        plans,
        selectedCompensationPlanId,
        companies
      ),
    [companyBudgetPlanRows, selectedCompanyId, currencyCode, plans, selectedCompensationPlanId, companies]
  )

  const companyBudgetStatusOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const row of allRows) {
      if (row.companyBudgetStatus) {
        ids.add(row.companyBudgetStatus)
      }
    }
    return [...ids]
      .sort((a, b) => a.localeCompare(b))
      .map(id => ({ id, label: formatBudgetPlanStatusLabelForDisplay(id, t) || id }))
  }, [allRows, t])

  const filterConfiguration = useMemo(
    () => buildBudgetSetupPlansFilterConfiguration(t, companyBudgetStatusOptions, allRows),
    [t, companyBudgetStatusOptions, allRows]
  )

  const filteredRows = useMemo(() => {
    let list = allRows

    const q = debouncedSearch.trim().toLowerCase()
    if (q) {
      list = list.filter(row => {
        const statusLabel = formatBudgetPlanStatusLabelForDisplay(row.companyBudgetStatus, t).toLowerCase()
        return (
          row.id.toLowerCase().includes(q) ||
          row.compensationBudgetPlanId.toLowerCase().includes(q) ||
          row.budgetPlanLabel.toLowerCase().includes(q) ||
          row.companyId.toLowerCase().includes(q) ||
          row.companyLabel.toLowerCase().includes(q) ||
          statusLabel.includes(q) ||
          String(row.salaryBudgetAmount).includes(q) ||
          String(row.salaryBudgetPercent).includes(q) ||
          String(row.allocationAmount).includes(q)
        )
      })
    }

    if (selectedCompanyBudgetStatuses.length > 0) {
      const set = new Set(selectedCompanyBudgetStatuses)
      list = list.filter(row => row.companyBudgetStatus != null && set.has(row.companyBudgetStatus))
    }

    if (salaryAmountRange != null) {
      list = list.filter(row => matchesNumberRange(row.salaryBudgetAmount, salaryAmountRange))
    }

    if (salaryPercentRange != null) {
      list = list.filter(row => matchesNumberRange(row.salaryBudgetPercent, salaryPercentRange))
    }

    if (allocationAmountRange != null) {
      list = list.filter(row => matchesNumberRange(row.allocationAmount, allocationAmountRange))
    }

    return list
  }, [
    allRows,
    debouncedSearch,
    selectedCompanyBudgetStatuses,
    salaryAmountRange,
    salaryPercentRange,
    allocationAmountRange,
    t
  ])

  const hasActiveFilters = useMemo(
    () =>
      debouncedSearch.trim() !== '' ||
      selectedCompanyBudgetStatuses.length > 0 ||
      salaryAmountRange != null ||
      salaryPercentRange != null ||
      allocationAmountRange != null,
    [debouncedSearch, selectedCompanyBudgetStatuses, salaryAmountRange, salaryPercentRange, allocationAmountRange]
  )

  const emptyMessage = useMemo(() => {
    if (selectedCompensationPlanId == null) {
      return t('budget-setup-table-select-cycle-first')
    }
    if (hasActiveFilters) {
      return t('budget-setup-table-empty-filtered')
    }
    return t('budget-setup-table-empty')
  }, [hasActiveFilters, selectedCompensationPlanId, t])

  const filtersObject = useMemo(() => {
    const obj: Record<string, unknown> = {}
    if (selectedCompanyBudgetStatuses.length > 0) {
      obj.companyBudgetStatuses = selectedCompanyBudgetStatuses
    }
    if (salaryAmountRange != null) {
      obj.salaryBudgetAmount = { ...salaryAmountRange }
    }
    if (salaryPercentRange != null) {
      obj.salaryBudgetPercent = { ...salaryPercentRange }
    }
    if (allocationAmountRange != null) {
      obj.allocationAmount = { ...allocationAmountRange }
    }
    return obj
  }, [selectedCompanyBudgetStatuses, salaryAmountRange, salaryPercentRange, allocationAmountRange])

  const handleFilterChangeFromDisplay = useCallback((filters: Record<string, unknown>) => {
    const statuses = (filters.companyBudgetStatuses as string[] | undefined) ?? []
    setSelectedCompanyBudgetStatuses(statuses)

    setSalaryAmountRange(parseOptionalNumberRange(filters.salaryBudgetAmount))
    setSalaryPercentRange(parseOptionalNumberRange(filters.salaryBudgetPercent))
    setAllocationAmountRange(parseOptionalNumberRange(filters.allocationAmount))
  }, [])

  const columns = useMemo(
    () =>
      buildBudgetSetupPlansTableColumns(
        t,
        v => formatBudgetPlanStatusLabelForDisplay(v, t),
        onEditRow,
        showCompanyColumn,
        editDisabled,
        showCycleColumn
      ),
    [t, onEditRow, showCompanyColumn, editDisabled, showCycleColumn]
  )

  const visibleTableColumns = useMemo(
    () =>
      columns.filter(col =>
        visibleColumns.includes(String((col as ColumnDef<BudgetSetupPlanTableRow> & { id?: string }).id ?? ''))
      ),
    [columns, visibleColumns]
  )

  const sortableColumns = useMemo(
    () => [
      ...(showCompanyColumn ? [{ id: 'companyLabel', label: t('budget-setup-table-col-company') }] : []),
      ...(showCycleColumn ? [{ id: 'budgetPlanLabel', label: t('budget-setup-table-col-chosen-budget-plan') }] : []),
      { id: 'companyBudgetStatus', label: t('budget-setup-table-col-budget-plan-status') },
      { id: 'salaryBudgetAmount', label: t('budget-setup-table-col-salary-budget-amount') },
      { id: 'salaryBudgetPercent', label: t('budget-setup-table-col-salary-budget-percent') },
      { id: 'allocationAmount', label: t('budget-setup-table-col-allocation-amount') },
      { id: 'salaryBaseline', label: t('budget-setup-table-col-salary-baseline') },
      { id: 'actions', label: '' }
    ],
    [t, showCompanyColumn, showCycleColumn]
  )

  const availableColumnsForDisplay = useMemo(() => sortableColumns, [sortableColumns])

  const handlePaginationChange = useCallback((next: { pageIndex: number; pageSize: number }) => {
    setPagination(next)
  }, [])

  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }, [
    debouncedSearch,
    selectedCompanyBudgetStatuses,
    salaryAmountRange,
    salaryPercentRange,
    allocationAmountRange,
    sorting,
    selectedCompensationPlanId
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
