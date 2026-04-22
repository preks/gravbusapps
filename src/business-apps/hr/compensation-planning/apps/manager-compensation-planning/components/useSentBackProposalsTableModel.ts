import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { TranslateFn } from '../../compensation-planning/components/views/budgetSetupDisplayUtils'
import { formatBudgetPlanStatusLabelForDisplay } from '../../compensation-planning/components/views/budgetSetupDisplayUtils'
import {
  SENT_BACK_PROPOSALS_VISIBLE_COLUMN_IDS,
  buildSentBackProposalsTableColumns
} from './buildSentBackProposalsTableColumns'
import type { SentBackProposalTableRow } from './sentBackProposalTableRow'

export function useSentBackProposalsTableModel(
  t: TranslateFn,
  currencyCode: string,
  sourceRows: SentBackProposalTableRow[],
  onEditRow: (row: SentBackProposalTableRow) => void
) {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'employeeDisplayName', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...SENT_BACK_PROPOSALS_VISIBLE_COLUMN_IDS])

  const filteredRows = useMemo(() => {
    let list = sourceRows

    const q = debouncedSearch.trim().toLowerCase()
    if (q) {
      list = list.filter(row => {
        const name = row.employeeDisplayName.toLowerCase()
        const notes = (row.reviewNotes ?? '').toLowerCase()
        const just = (row.justification ?? '').toLowerCase()
        const statusLabel = formatBudgetPlanStatusLabelForDisplay(row.budgetPlanStatus, t).toLowerCase()
        const nums = [
          String(row.allocationAmount),
          String(row.proposedSalaryIncreaseAmount),
          String(row.proposedNewSalary)
        ].join(' ')
        return name.includes(q) || notes.includes(q) || just.includes(q) || statusLabel.includes(q) || nums.includes(q)
      })
    }

    return list
  }, [debouncedSearch, sourceRows, t])

  const hasActiveSearch = useMemo(() => debouncedSearch.trim() !== '', [debouncedSearch])

  const emptyMessage = useMemo(() => {
    if (sourceRows.length === 0) {
      return t('sent-back-table-empty-none')
    }
    if (filteredRows.length === 0 && hasActiveSearch) {
      return t('sent-back-table-empty-filtered')
    }
    return t('sent-back-table-empty-none')
  }, [filteredRows.length, hasActiveSearch, sourceRows.length, t])

  const columns = useMemo(
    () => buildSentBackProposalsTableColumns(t, currencyCode, onEditRow),
    [currencyCode, onEditRow, t]
  )

  const visibleTableColumns = useMemo(
    () =>
      columns.filter(col => {
        const id = String((col as ColumnDef<SentBackProposalTableRow> & { id?: string }).id ?? '')
        return visibleColumns.includes(id)
      }),
    [columns, visibleColumns]
  )

  const sortableColumns = useMemo(
    () => [
      { id: 'employeeDisplayName', label: t('sent-back-col-employee') },
      { id: 'budgetPlanStatus', label: t('sent-back-col-status') },
      { id: 'allocationAmount', label: t('sent-back-col-allocation') },
      { id: 'proposedSalaryIncreaseAmount', label: t('sent-back-col-increase-amount') },
      { id: 'proposedSalaryIncreasePercent', label: t('sent-back-col-increase-pct') },
      { id: 'proposedNewSalary', label: t('sent-back-col-new-salary') }
    ],
    [t]
  )

  const availableColumnsForDisplay = useMemo(() => sortableColumns, [sortableColumns])

  const handlePaginationChange = useCallback((next: { pageIndex: number; pageSize: number }) => {
    setPagination(next)
  }, [])

  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }, [debouncedSearch, sorting])

  return {
    searchInput,
    setSearchInput,
    sorting,
    setSorting,
    pagination,
    visibleColumns,
    setVisibleColumns,
    filteredRows,
    emptyMessage,
    visibleTableColumns,
    sortableColumns,
    availableColumnsForDisplay,
    handlePaginationChange
  }
}
