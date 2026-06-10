import { useCallback } from 'react'
import { useExportBase } from '@/common/hooks/useExportBase'
import type { RevenueAlignmentRow } from '@/common/data/customer/queries/campaignDashboardQueries'
import { formatRevenueAlignmentRowForExport } from './revenueAlignmentTableData'

interface UseRevenueAlignmentExportOptions {
  rows: RevenueAlignmentRow[]
  columns: readonly { key: string; title: string }[]
}

const EMPTY_DATE_COLUMN_KEYS = new Set<string>()

export const useRevenueAlignmentExport = ({ rows, columns }: UseRevenueAlignmentExportOptions) => {
  const fetchAllItems = useCallback(async () => rows, [rows])

  return useExportBase<RevenueAlignmentRow>({
    fetchAllItems,
    formatItem: formatRevenueAlignmentRowForExport,
    columns,
    dateColumnKeys: EMPTY_DATE_COLUMN_KEYS,
    sheetName: 'Revenue Alignment',
    entityLabel: 'revenue alignment rows',
    totalCount: rows.length,
    filenamePrefix: 'revenue-alignment'
  })
}
