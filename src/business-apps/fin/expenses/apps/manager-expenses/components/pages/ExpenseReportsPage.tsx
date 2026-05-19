import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { DataDisplay, Button, PageLayout, Tabs, TabsList, TabsTrigger, useTranslation } from '@newwork/nw-design-system'
import { DownloadIcon, FileTextIcon } from '@phosphor-icons/react'
import { useDebounce } from '@/common/hooks/useDebounce'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpenseReportData, ReportType, type ReportItem } from '../../hooks/useExpenseReportData'
import { useManagerExpenseReportUrlSync } from '../../hooks/useManagerExpenseReportUrlSync'
import { useManagerExpenseReportSearchByType } from '../../hooks/useManagerExpenseReportSearchByType'
import { ExpenseDataTable } from '../../../../common/components/table/ExpenseDataTable'
import { useTableSetup } from '../../../../common/hooks/useTableSetup'
import { createExpenseReportTableColumns, getExportFieldsForReportType } from '../expense-reports/expenseReportColumns'
import { getManagerExpenseReportTypeTabs } from '../expense-reports/managerExpenseReportPageTabConfig'
import { parseManagerReportTypeParam } from '../../utils/managerExpenseReportPageUrlUtils'
import {
  buildManagerExpenseReportDownloadFilename,
  escapeManagerExpenseReportCsv,
  formatManagerExpenseReportCell,
  htmlEscapeForManagerExpenseReport,
  type FormatManagerExpenseReportCellOptions
} from '../../utils/managerExpenseReportPageExportUtils'
import translations from '../../_i18n'
import {
  EXPENSE_REPORT_SEGMENTED_TAB_TRIGGER_CLASS,
  EXPENSE_REPORT_TABS_ROOT_CLASS,
  getExpenseReportSegmentedTabsListClassName
} from '../../../../common/utils/segmentedExpenseReportTabsClassNames'

type ExpenseReportsPageProps = BusinessAppContextProps

const ExpenseReportsPage: React.FC<ExpenseReportsPageProps> = ({ accessToken, userInfo }) => {
  const { t } = useTranslation(translations)
  const contextProps = useMemo(
    () => ({
      accessToken,
      userInfo
    }),
    [accessToken, userInfo]
  )

  const {
    reportData,
    isLoading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    setSearchTerm,
    selectedReportType,
    setSelectedReportType,
    fetchAllForExport
  } = useExpenseReportData(contextProps)

  const [localSearchText, setLocalSearchText] = useState('')
  const debouncedSearch = useDebounce(localSearchText, 300)

  const { resetSearchState } = useManagerExpenseReportSearchByType({
    selectedReportType,
    setLocalSearchText,
    setSearchTerm,
    setCurrentPage
  })

  useEffect(() => {
    setSearchTerm(debouncedSearch)
    setCurrentPage(1)
  }, [debouncedSearch, setSearchTerm, setCurrentPage])

  useManagerExpenseReportUrlSync(setSelectedReportType, selectedReportType)

  const allColumns = useMemo(
    () => createExpenseReportTableColumns(selectedReportType ?? ReportType.EXPENSE_ITEM, t),
    [selectedReportType, t]
  )

  const { columns, pagination, handlePaginationChange } = useTableSetup(
    contextProps,
    allColumns,
    [],
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize
  )

  const reportTypes = useMemo(() => getManagerExpenseReportTypeTabs(t), [t])
  const handleManagerReportSearchChange = useCallback((value: string) => {
    setLocalSearchText(value)
  }, [])

  const handleReportTypeTabChange = useCallback(
    (value: string) => {
      const next = parseManagerReportTypeParam(value)
      if (next) {
        resetSearchState()
        setSelectedReportType(next)
      }
    },
    [resetSearchState, setSelectedReportType]
  )

  const handleDownload = async () => {
    if (!selectedReportType) {
      return
    }
    const cols = getExportFieldsForReportType(selectedReportType, t)
    if (cols.length === 0) {
      return
    }

    const cellOpts: FormatManagerExpenseReportCellOptions = { reportType: selectedReportType, translate: t }

    const header = cols.map(c => escapeManagerExpenseReportCsv(c.title))

    const allRows = await fetchAllForExport()
    const rows = allRows.map(row => {
      const record = row as Record<string, unknown>
      return cols.map(c =>
        escapeManagerExpenseReportCsv(formatManagerExpenseReportCell(c.key, record[c.key], cellOpts))
      )
    })

    const csvLines = [header.join(','), ...rows.map(r => r.join(','))]
    const csvContent = csvLines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const filename = buildManagerExpenseReportDownloadFilename(String(selectedReportType), 'csv')

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.setAttribute('rel', 'noopener noreferrer')
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleDownloadExcel = async () => {
    if (!selectedReportType) {
      return
    }
    const cols = getExportFieldsForReportType(selectedReportType, t)
    if (cols.length === 0) {
      return
    }

    const cellOpts: FormatManagerExpenseReportCellOptions = { reportType: selectedReportType, translate: t }

    const headerCells = cols.map(c => `<th>${htmlEscapeForManagerExpenseReport(c.title)}</th>`).join('')

    const allRows = await fetchAllForExport()
    const bodyRows = allRows
      .map(row => {
        const tds = cols
          .map(
            c =>
              `<td>${htmlEscapeForManagerExpenseReport(
                formatManagerExpenseReportCell(c.key, (row as Record<string, unknown>)[c.key], cellOpts)
              )}</td>`
          )
          .join('')
        return `<tr>${tds}</tr>`
      })
      .join('')

    const headerHtml = `<thead><tr>${headerCells}</tr></thead>`
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><table>${headerHtml}<tbody>${bodyRows}</tbody></table></body></html>`

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const filename = buildManagerExpenseReportDownloadFilename(String(selectedReportType), 'xls')

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.setAttribute('rel', 'noopener noreferrer')
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div data-testid="expense-reports-page-container">
      <PageLayout
        headerTitle={t('expense-reports-title')}
        headerDescription={t('expense-reports-subheader')}
        headerIcon={FileTextIcon as any}
        className="gba:min-h-screen"
      >
        <div
          className="gba:px-6 gba:pb-6 gba:min-w-0 gba:flex-1 gba:flex gba:flex-col gba:gap-4"
          data-testid="expense-reports-page"
        >
          {/* Same pattern as backoffice: full-width tab list, then toolbar (DataDisplay below there) */}
          <Tabs
            value={selectedReportType ?? ReportType.EXPENSE_ITEM}
            onValueChange={handleReportTypeTabChange}
            className={EXPENSE_REPORT_TABS_ROOT_CLASS}
            data-testid="manager-expense-reports-tabs"
          >
            <TabsList className={getExpenseReportSegmentedTabsListClassName(4)}>
              {reportTypes.map(type => (
                <TabsTrigger
                  key={type.key}
                  value={type.key}
                  className={EXPENSE_REPORT_SEGMENTED_TAB_TRIGGER_CLASS}
                  data-testid={`expense-reports-type-${type.key}`}
                >
                  {type.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <DataDisplay
            key={selectedReportType ?? ReportType.EXPENSE_ITEM}
            titleSections={[
              {
                id: 'results',
                label: t('expense-reports-data-label'),
                metadata: { count: totalCount, isLoading }
              }
            ]}
            currentSection="results"
            searchValue={localSearchText}
            searchPlaceholder={t('expense-reports-search-placeholder')}
            onSearchChange={handleManagerReportSearchChange}
            toolbarDensity="default"
            enableLiveFiltering
            primaryAction={
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="gba:flex gba:shrink-0 gba:items-center gba:gap-2"
                  data-testid="expense-reports-download-button"
                >
                  <DownloadIcon className="gba:text-sm" />
                  {t('expense-reports-download-report')}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadExcel}
                  className="gba:flex gba:shrink-0 gba:items-center gba:gap-2"
                  data-testid="expense-reports-download-excel-button"
                >
                  <DownloadIcon className="gba:text-sm" />
                  {t('expense-reports-download-excel')}
                </Button>
              </div>
            }
            data-testid="expense-reports-filters-card"
          >
            <div className="gba:min-w-0">
              <ExpenseDataTable<ReportItem>
                key={selectedReportType ?? 'report-type'}
                data={reportData}
                columns={columns}
                loading={isLoading}
                error={error}
                totalCount={totalCount}
                tableLayout="auto"
                pagination={pagination}
                onPaginationChange={handlePaginationChange}
                emptyMessage={`${t('expense-reports-empty')}. ${t('expense-reports-empty-hint')}`}
                dataTestId="expense-reports-table"
              />
            </div>
          </DataDisplay>
        </div>
      </PageLayout>
    </div>
  )
}

export default ExpenseReportsPage
