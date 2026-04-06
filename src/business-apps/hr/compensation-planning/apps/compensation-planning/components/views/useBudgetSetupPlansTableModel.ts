import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useDebounce } from '@/common/hooks/useDebounce'
import type {
  CompensationBudgetPlanCompanyRow,
  CompensationBudgetPlanListItem
} from '../../hooks/useBudgetSetupForCompany'
import { buildBudgetSetupPlanTableRows, type BudgetSetupPlanTableRow } from './budgetSetupPlanTableRows'
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
  selectedCompanyId: string,
  currencyCode: string,
  plans: CompensationBudgetPlanListItem[]
) {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [selectedCompensationBudgetPlanIds, setSelectedCompensationBudgetPlanIds] = useState<string[]>([])
  const [selectedCompanyBudgetStatuses, setSelectedCompanyBudgetStatuses] = useState<string[]>([])
  const [salaryAmountRange, setSalaryAmountRange] = useState<{ min?: number; max?: number } | null>(null)
  const [salaryPercentRange, setSalaryPercentRange] = useState<{ min?: number; max?: number } | null>(null)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'companyBudgetStatus', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...BUDGET_SETUP_PLANS_VISIBLE_COLUMN_IDS])

  const allRows = useMemo(
    () => buildBudgetSetupPlanTableRows(companyBudgetPlanRows, selectedCompanyId, currencyCode, plans),
    [companyBudgetPlanRows, selectedCompanyId, currencyCode, plans]
  )

  const budgetPlanOptions = useMemo(() => {
    const byId = new Map<string, string>()
    for (const row of allRows) {
      if (!byId.has(row.compensationBudgetPlanId)) {
        byId.set(row.compensationBudgetPlanId, row.budgetPlanLabel)
      }
    }
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([id, label]) => ({ id, label }))
  }, [allRows])

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
    () => buildBudgetSetupPlansFilterConfiguration(t, budgetPlanOptions, companyBudgetStatusOptions),
    [t, budgetPlanOptions, companyBudgetStatusOptions]
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
          statusLabel.includes(q) ||
          String(row.salaryBudgetAmount).includes(q) ||
          String(row.salaryBudgetPercent).includes(q)
        )
      })
    }

    if (selectedCompensationBudgetPlanIds.length > 0) {
      const planSet = new Set(selectedCompensationBudgetPlanIds)
      list = list.filter(row => planSet.has(row.compensationBudgetPlanId))
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

    return list
  }, [
    allRows,
    debouncedSearch,
    selectedCompensationBudgetPlanIds,
    selectedCompanyBudgetStatuses,
    salaryAmountRange,
    salaryPercentRange,
    t
  ])

  const hasActiveFilters = useMemo(
    () =>
      debouncedSearch.trim() !== '' ||
      selectedCompensationBudgetPlanIds.length > 0 ||
      selectedCompanyBudgetStatuses.length > 0 ||
      salaryAmountRange != null ||
      salaryPercentRange != null,
    [
      debouncedSearch,
      selectedCompensationBudgetPlanIds,
      selectedCompanyBudgetStatuses,
      salaryAmountRange,
      salaryPercentRange
    ]
  )

  const emptyMessage = hasActiveFilters ? t('budget-setup-table-empty-filtered') : t('budget-setup-table-empty')

  const filtersObject = useMemo(() => {
    const obj: Record<string, unknown> = {}
    if (selectedCompensationBudgetPlanIds.length > 0) {
      obj.compensationBudgetPlanIds = selectedCompensationBudgetPlanIds
    }
    if (selectedCompanyBudgetStatuses.length > 0) {
      obj.companyBudgetStatuses = selectedCompanyBudgetStatuses
    }
    if (salaryAmountRange != null) {
      obj.salaryBudgetAmount = { ...salaryAmountRange }
    }
    if (salaryPercentRange != null) {
      obj.salaryBudgetPercent = { ...salaryPercentRange }
    }
    return obj
  }, [selectedCompensationBudgetPlanIds, selectedCompanyBudgetStatuses, salaryAmountRange, salaryPercentRange])

  const handleFilterChangeFromDisplay = useCallback((filters: Record<string, unknown>) => {
    const planIds = (filters.compensationBudgetPlanIds as string[] | undefined) ?? []
    setSelectedCompensationBudgetPlanIds(planIds)

    const statuses = (filters.companyBudgetStatuses as string[] | undefined) ?? []
    setSelectedCompanyBudgetStatuses(statuses)

    setSalaryAmountRange(parseOptionalNumberRange(filters.salaryBudgetAmount))
    setSalaryPercentRange(parseOptionalNumberRange(filters.salaryBudgetPercent))
  }, [])

  const columns = useMemo(
    () => buildBudgetSetupPlansTableColumns(t, v => formatBudgetPlanStatusLabelForDisplay(v, t)),
    [t]
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
      { id: 'budgetPlanLabel', label: t('budget-setup-table-col-chosen-budget-plan') },
      { id: 'companyBudgetStatus', label: t('budget-setup-table-col-budget-plan-status') },
      { id: 'salaryBudgetAmount', label: t('budget-setup-table-col-salary-budget-amount') },
      { id: 'salaryBudgetPercent', label: t('budget-setup-table-col-salary-budget-percent') },
      { id: 'salaryBaseline', label: t('budget-setup-table-col-salary-baseline') }
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
    debouncedSearch,
    selectedCompensationBudgetPlanIds,
    selectedCompanyBudgetStatuses,
    salaryAmountRange,
    salaryPercentRange,
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
