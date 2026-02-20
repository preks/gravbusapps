import React from 'react'
import AnalyticsDataTable from './AnalyticsDataTable'
import type { AnalyticsDataTableColumn } from './AnalyticsDataTable'
import type { AnalyticsChartConfig } from './analyticsTabTypes'

export interface AnalyticsTableSectionProps<T> {
  tableRef: React.Ref<HTMLDivElement>
  selectedConfig: AnalyticsChartConfig<T> | undefined
  resolveExportingFormat: (testId: string) => 'excel' | 'pdf' | null
  handleExport: (
    format: 'excel' | 'pdf',
    testId: string,
    title: string,
    columns: AnalyticsDataTableColumn[],
    rows: Record<string, unknown>[]
  ) => void
  exportExcelLabel: string
  exportPdfLabel: string
  tableTitle: string
  entriesText: string
  clickToViewMessage: string
  getRowKey?: (row: T, index: number) => string
  renderCell?: (row: T, column: AnalyticsDataTableColumn, index: number) => React.ReactNode
  footer?: React.ReactNode
}

/**
 * Shared section for analytics tabs: table ref container, conditional AnalyticsDataTable,
 * and "click to view table" empty state. Reduces duplication across Employment,
 * HeadcountTrends, TurnoverRetention.
 */
function AnalyticsTableSection<T>({
  tableRef,
  selectedConfig,
  resolveExportingFormat,
  handleExport,
  exportExcelLabel,
  exportPdfLabel,
  tableTitle,
  entriesText,
  clickToViewMessage,
  getRowKey,
  renderCell,
  footer
}: AnalyticsTableSectionProps<T>) {
  return (
    <div ref={tableRef}>
      {selectedConfig && (
        <AnalyticsDataTable<T>
          dataTestId={`${selectedConfig.testId}-table`}
          className="gba:mt-6"
          title={tableTitle}
          description={selectedConfig.description}
          entriesText={entriesText}
          columns={selectedConfig.exportColumns}
          rows={selectedConfig.tableData}
          exportingFormat={resolveExportingFormat(selectedConfig.testId)}
          exportExcelLabel={exportExcelLabel}
          exportPdfLabel={exportPdfLabel}
          onExport={format =>
            handleExport(
              format,
              selectedConfig.testId,
              selectedConfig.title,
              selectedConfig.exportColumns,
              selectedConfig.tableData as unknown as Record<string, unknown>[]
            )
          }
          getRowKey={getRowKey ?? ((_, index) => `${selectedConfig.testId}-${index}`)}
          renderCell={renderCell}
          footer={footer}
        />
      )}
      {!selectedConfig && (
        <div className="gba:text-center gba:py-8">
          <p className="gba:text-muted-foreground">{clickToViewMessage}</p>
        </div>
      )}
    </div>
  )
}

export default AnalyticsTableSection
