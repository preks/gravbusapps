import { useCallback, useMemo } from 'react'
import { formatExportDate } from '@/common/utils/excelExportUtils'
import { useExportBase } from '@/common/hooks/useExportBase'
import type { InvestmentReport } from '@/common/data/investment/types/investmentReportTypes'
import type { InvestmentReportExportHelpers, ExportColumnDef } from '../components/shared/InvestmentReportTable'

const FIXED_EXPORT_COLUMNS = [
  { key: 'investment', title: 'Investment' },
  { key: 'date', title: 'Report Date' },
  { key: 'investmentGroup', title: 'Group' },
  { key: 'investmentType', title: 'Type' },
  { key: 'investmentStatus', title: 'Status' },
  { key: 'currency', title: 'Currency' },
  { key: 'totalInvestmentAmount', title: 'Total Investment Amount' },
  { key: 'investmentMarketValue', title: 'Investment Market Value' },
  { key: 'stakePercentage', title: 'Stake (%)' },
  { key: 'irr', title: 'IRR' },
  { key: 'moic', title: 'MOIC' }
] as const

const FIXED_DATE_COLUMN_KEYS = new Set(['date'])
const DEFAULT_HIDDEN_COLUMN_IDS: string[] = []

/** Formats a numeric amount as `{value} {currencyCode}`, matching the CRM pattern (no currency symbol). */
const formatAmount = (value: number | null | undefined, currencyCode: string): string => {
  if (value == null) return '-'
  if (value === 0) return '0'
  return currencyCode ? `${value} ${currencyCode}` : String(value)
}

const formatNumber = (value: number | null | undefined): string => {
  if (value == null) return '-'
  return String(value)
}

const formatFixed = (report: InvestmentReport): Record<string, string> => {
  const currencyCode =
    report.currency?.code?.split(':').pop() || report.investment?.currency?.code?.split(':').pop() || ''

  return {
    investment: report.investment?.name || '-',
    date: formatExportDate(report.date),
    investmentGroup: report.investment?.investmentGroup?.value || '-',
    investmentType: report.investment?.investmentType?.value || '-',
    investmentStatus: report.investmentStatus?.value || '-',
    currency: currencyCode || '-',
    totalInvestmentAmount: formatAmount(report.totalInvestmentAmount, currencyCode),
    investmentMarketValue: formatAmount(report.investmentMarketValue, currencyCode),
    stakePercentage: report.stakePercentage == null ? '-' : `${report.stakePercentage}%`,
    irr: formatNumber(report.irr),
    moic: formatNumber(report.moic)
  }
}

// ─── Generated columns path (Equity, Real Estate, and other non-Liquid-Fund groups) ──

const buildGeneratedFormatter =
  (exportColumns: ExportColumnDef[]) =>
  (record: any): Record<string, string> => {
    const result: Record<string, string> = {}
    exportColumns.forEach(col => {
      result[col.key] = col.getTextValue(record)
    })
    return result
  }

const buildGeneratedDateKeys = (exportColumns: ExportColumnDef[]): Set<string> =>
  new Set(exportColumns.filter(c => c.isDate).map(c => c.key))

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseInvestmentReportExportOptions {
  exportHelpers: InvestmentReportExportHelpers | null
  groupLabel: string
  filenamePrefix?: string
  hiddenColumnIds?: string[]
}

export function useInvestmentReportExport({
  exportHelpers,
  groupLabel,
  filenamePrefix = 'investment-reports',
  hiddenColumnIds = DEFAULT_HIDDEN_COLUMN_IDS
}: UseInvestmentReportExportOptions) {
  const fetchAllItems = useCallback(async (): Promise<any[]> => {
    if (!exportHelpers) return []
    return exportHelpers.fetchAll()
  }, [exportHelpers])

  const columns = useMemo(() => {
    const generatedCols = exportHelpers?.exportColumns
    if (generatedCols?.length) return generatedCols.map(c => ({ key: c.key, title: c.title }))
    return FIXED_EXPORT_COLUMNS.filter(column => !hiddenColumnIds.includes(column.key))
  }, [exportHelpers, hiddenColumnIds])

  const formatItem = useMemo(() => {
    const generatedCols = exportHelpers?.exportColumns
    if (generatedCols?.length) return buildGeneratedFormatter(generatedCols)
    return formatFixed
  }, [exportHelpers])

  const dateColumnKeys = useMemo(() => {
    const generatedCols = exportHelpers?.exportColumns
    if (generatedCols?.length) return buildGeneratedDateKeys(generatedCols)
    return FIXED_DATE_COLUMN_KEYS
  }, [exportHelpers])

  return useExportBase<any>({
    fetchAllItems,
    formatItem,
    columns,
    dateColumnKeys,
    sheetName: groupLabel,
    entityLabel: 'reports',
    totalCount: exportHelpers?.totalCount ?? 0,
    filenamePrefix
  })
}
