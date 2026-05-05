import { useCallback, useMemo } from 'react'
import { formatExportDate } from '@/common/utils/excelExportUtils'
import { useExportBase } from '@/common/hooks/useExportBase'
import { extractCurrencyCode } from '@/common/utils/numberFormatter'
import type { InvestmentReport } from '@/common/data/investment/types/investmentReportTypes'
import type { InvestmentReportExportHelpers, ExportColumnDef } from '../components/shared/InvestmentReportTable'
import type { DynamicTableColumn } from '../utils/liquidFundReportColumnTransformer'

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

/** Builds the full set of date column keys for CSV escaping (fixed + dynamic DATE/DATETIME columns). */
const buildDateColumnKeys = (dynamicColumns?: DynamicTableColumn[]): Set<string> => {
  const keys = new Set<string>(['date', '__date'])
  dynamicColumns?.forEach(col => {
    if (col.type === 'DATE' || col.type === 'DATETIME') {
      keys.add(col.id)
    }
  })
  return keys
}

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

// ─── Dynamic columns (Liquid Fund) ───────────────────────────────────────────

const DYNAMIC_FIXED_COLUMNS = [
  {
    key: '__investment',
    title: 'Investment',
    type: 'TEXT',
    getValue: (row: any) => row.investment?.name || row.investmentName || '-'
  },
  {
    key: '__date',
    title: 'Report Date',
    type: 'DATE',
    getValue: (row: any) => formatExportDate(row.reportDate || row.date)
  }
] as const

/**
 * Returns the export-ready string for a single dynamic column cell.
 *
 * AMOUNT columns: formatted as `{rawValue} {currencyCode}` — matches CRM pattern, no currency symbol.
 * DATE columns:   formatted via `formatExportDate` — consistent with all other exports.
 * All others:     the column's own `getValue` output (text, %, numbers).
 */
const formatDynamicCell = (col: DynamicTableColumn, row: any): string => {
  if (col.type === 'AMOUNT') {
    // Parse the pre-formatted string back to a raw number so we can apply the CRM pattern.
    // getValue returns something like "€5,821,400" or "-"; we strip symbol and separators.
    const formatted = col.getValue(row) ?? '-'
    if (formatted === '-') return '-'
    const cleaned = formatted.replace(/[€£¥$,\s]/g, '')
    const num = Number(cleaned)
    if (!cleaned || Number.isNaN(num)) return formatted
    const currencyCode = extractCurrencyCode(row?.currency?.code || row?.currencyRef || row?.originalCurrency || '')
    return num === 0 ? '0' : formatAmount(num, currencyCode)
  }

  if (col.type === 'DATE' || col.type === 'DATETIME') {
    // Re-format using the shared export date formatter for consistency across all downloads.
    const formatted = col.getValue(row) ?? '-'
    if (formatted === '-') return '-'
    // Try to parse the already-formatted string back through dayjs via formatExportDate
    return formatExportDate(formatted) === '-' ? formatted : formatExportDate(formatted)
  }

  return col.getValue(row) ?? '-'
}

const buildDynamicFormatter = (dynamicColumns: DynamicTableColumn[]) => {
  return (row: any): Record<string, string> => {
    const result: Record<string, string> = {}
    DYNAMIC_FIXED_COLUMNS.forEach(col => {
      result[col.key] = col.getValue(row)
    })
    dynamicColumns.forEach(col => {
      result[col.id] = formatDynamicCell(col, row)
    })
    return result
  }
}

const buildDynamicColumns = (dynamicColumns: DynamicTableColumn[], hiddenColumnIds: string[] = []) => {
  const hiddenDynamicKeys = new Set(hiddenColumnIds.includes('investment') ? ['__investment'] : [])

  return [
    ...DYNAMIC_FIXED_COLUMNS.map(c => ({ key: c.key, title: c.title })),
    ...dynamicColumns.map(c => ({ key: c.id, title: c.label }))
  ].filter(column => !hiddenDynamicKeys.has(column.key)) as { key: string; title: string }[]
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
  /** Dynamic columns from the active table section (e.g. Liquid Fund). When present, replaces fixed columns. */
  dynamicColumns?: DynamicTableColumn[]
  hiddenColumnIds?: string[]
}

export function useInvestmentReportExport({
  exportHelpers,
  groupLabel,
  filenamePrefix = 'investment-reports',
  dynamicColumns,
  hiddenColumnIds = DEFAULT_HIDDEN_COLUMN_IDS
}: UseInvestmentReportExportOptions) {
  const hasDynamic = dynamicColumns && dynamicColumns.length > 0

  const fetchAllItems = useCallback(async (): Promise<any[]> => {
    if (!exportHelpers) return []
    const raw = await exportHelpers.fetchAll()
    return exportHelpers.dataTransformer ? exportHelpers.dataTransformer(raw) : raw
  }, [exportHelpers])

  const columns = useMemo(() => {
    if (hasDynamic) return buildDynamicColumns(dynamicColumns, hiddenColumnIds)
    const generatedCols = exportHelpers?.exportColumns
    if (generatedCols?.length) return generatedCols.map(c => ({ key: c.key, title: c.title }))
    return FIXED_EXPORT_COLUMNS.filter(column => !hiddenColumnIds.includes(column.key))
  }, [hasDynamic, dynamicColumns, exportHelpers, hiddenColumnIds])

  const formatItem = useMemo(() => {
    if (hasDynamic) return buildDynamicFormatter(dynamicColumns)
    const generatedCols = exportHelpers?.exportColumns
    if (generatedCols?.length) return buildGeneratedFormatter(generatedCols)
    return formatFixed
  }, [hasDynamic, dynamicColumns, exportHelpers])

  const dateColumnKeys = useMemo(() => {
    if (hasDynamic) return buildDateColumnKeys(dynamicColumns)
    const generatedCols = exportHelpers?.exportColumns
    if (generatedCols?.length) return buildGeneratedDateKeys(generatedCols)
    return FIXED_DATE_COLUMN_KEYS
  }, [hasDynamic, dynamicColumns, exportHelpers])

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
