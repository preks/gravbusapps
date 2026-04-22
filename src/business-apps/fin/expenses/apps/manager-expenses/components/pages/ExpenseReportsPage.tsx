import React, { useState, useMemo } from 'react'
import { Button, Card, CardContent, PageLayout } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, DownloadIcon, FileTextIcon } from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpenseReportData, ReportType, type ReportItem } from '../../hooks/useExpenseReportData'
import { ensureShortDateFormat } from '../../utils/dateUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { sanitizeFilename } from '@/common/utils/textUtils'
import { ExpenseDataTable } from '../../../../common/components/table/ExpenseDataTable'
import { useTableSetup } from '../../../../common/hooks/useTableSetup'
import { createExpenseReportTableColumns, getExportFieldsForReportType } from '../expense-reports/expenseReportColumns'

// Shared helpers for rendering/exporting values
const dateKeys = new Set(['date', 'startDate', 'endDate', 'submissionDate', 'requestDate', 'createdAt', 'planDate'])

const REPORT_EXPORT_EMPTY = '-'

const formatCellValue = (key: string, raw: unknown): string => {
  if (raw == null) {
    return REPORT_EXPORT_EMPTY
  }
  if (typeof raw === 'string' && !raw.trim()) {
    return REPORT_EXPORT_EMPTY
  }
  if (dateKeys.has(key)) {
    return raw ? ensureShortDateFormat(String(raw)) : REPORT_EXPORT_EMPTY
  }
  if (typeof raw === 'number') {
    return String(raw)
  }
  return String(raw)
}

const escapeCsv = (value: string) => {
  const needsQuotes = /[",\r\n]/.test(value)
  // SonarCloud: Using replace() for ES2020 compatibility (replaceAll requires ES2021)
  const out = value.replace(/"/g, '""')
  return needsQuotes ? `"${out}"` : out
}

// SonarCloud: Using replace() for ES2020 compatibility (replaceAll requires ES2021)
const htmlEscape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const buildFilename = (type: string, ext: string) => {
  const ts = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const filename = `expense-report-${type}-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.${ext}`

  // Sanitize once at the end for defense-in-depth
  // Note: type and ext are hardcoded, but sanitizing final filename provides security layer
  return sanitizeFilename(filename)
}

type ExpenseReportsPageProps = BusinessAppContextProps

const ExpenseReportsPage: React.FC<ExpenseReportsPageProps> = ({ accessToken, userInfo }) => {
  // State
  // search term handled by hook; keep local for type search only
  const [reportTypeSearchTerm, setReportTypeSearchTerm] = useState('')
  // remove duplicate selectedReportType; use hook state

  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(
    () => ({
      accessToken,
      userInfo
    }),
    [accessToken, userInfo]
  )

  // Hook to get expense report data
  const {
    reportData,
    isLoading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchTerm,
    setSearchTerm,
    selectedReportType,
    setSelectedReportType,
    fetchAllForExport
  } = useExpenseReportData(contextProps)

  const allColumns = useMemo(
    () => createExpenseReportTableColumns(selectedReportType ?? ReportType.EXPENSE_ITEM),
    [selectedReportType]
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

  // Define report types with display names
  const reportTypes: Array<{ key: ReportType; name: string; description: string }> = [
    {
      key: ReportType.EXPENSE_ITEM,
      name: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_items', 'Expense Items'),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.individual_expense_transactions',
        'Individual expense items and transactions'
      )
    },
    {
      key: ReportType.EXPENSE_PLAN,
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.expense_plans',
        'Expense Plans'
      ),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.expense_plans_subheader',
        'Budget plans and allocations'
      )
    },
    {
      key: ReportType.EXPENSE_REQUEST,
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_list.flows_button.expense_requests',
        'Expense Requests'
      ),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.expense_requests_subheader',
        'Submitted expense requests and approvals'
      )
    },
    {
      key: ReportType.ADVANCE_PAYMENT,
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:backoffice_expense_landing_page.advance_title',
        'Advance Payments'
      ),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.advance_payments_subheader',
        'Cash advances and prepayments'
      )
    }
  ]

  // Filter report types based on search
  const filteredReportTypes = reportTypes.filter(
    type =>
      type.name.toLowerCase().includes(reportTypeSearchTerm.toLowerCase()) ||
      type.description.toLowerCase().includes(reportTypeSearchTerm.toLowerCase())
  )

  // Handle download action (CSV export)
  const handleDownload = async () => {
    const cols = getExportFieldsForReportType(selectedReportType)
    if (cols.length === 0) {
      return
    }

    const header = cols.map(c => escapeCsv(c.title))

    const allRows = await fetchAllForExport()
    const rows = (allRows as ReportItem[]).map(row => {
      const record = row as Record<string, unknown>
      return cols.map(c => escapeCsv(formatCellValue(c.key, record[c.key])))
    })

    const csvLines = [header.join(','), ...rows.map(r => r.join(','))]
    const csvContent = csvLines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const filename = buildFilename(String(selectedReportType), 'csv')

    const link = document.createElement('a')
    link.href = url
    link.download = filename // Already sanitized by buildFilename()
    // Set additional security attributes
    link.setAttribute('rel', 'noopener noreferrer')
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  // Handle download action (Excel .xls via HTML table)
  const handleDownloadExcel = async () => {
    const cols = getExportFieldsForReportType(selectedReportType)
    if (cols.length === 0) {
      return
    }

    const headerCells = cols.map(c => `<th>${htmlEscape(c.title)}</th>`).join('')

    const allRows = await fetchAllForExport()
    const bodyRows = (allRows as ReportItem[])
      .map(row => {
        const tds = cols
          .map(c => `<td>${htmlEscape(formatCellValue(c.key, (row as Record<string, unknown>)[c.key]))}</td>`)
          .join('')
        return `<tr>${tds}</tr>`
      })
      .join('')

    const headerHtml = `<thead><tr>${headerCells}</tr></thead>`
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><table>${headerHtml}<tbody>${bodyRows}</tbody></table></body></html>`

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const filename = buildFilename(String(selectedReportType), 'xls')

    const link = document.createElement('a')
    link.href = url
    link.download = filename // Already sanitized by buildFilename()
    // Set additional security attributes
    link.setAttribute('rel', 'noopener noreferrer')
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div data-testid="expense-reports-page-container">
      <PageLayout
        headerTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.modal_list_or_flow_button.absence_same_location_btn',
          'Expense Reports'
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.expense_reports_subheader',
          'Generate and download comprehensive expense reports across different categories and time periods'
        )}
        headerIcon={FileTextIcon as any}
        className="gba:min-h-screen"
      >
        <div className="gba:px-6 gba:h-full gba:flex gba:gap-6" data-testid="expense-reports-page">
          {/* Left Sidebar - Report Types */}
          <div className="gba:w-80 gba:flex gba:flex-col gba:space-y-4">
            <div>
              <h3 className="gba:text-lg gba:font-medium gba:mb-4">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.report_types',
                  'Report Types'
                )}
              </h3>

              {/* Search Report Types */}
              <div className="gba:relative gba:mb-4">
                <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:w-4 gba:h-4 gba:pointer-events-none" />
                <DebouncedInput
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.search_report_types',
                    'Search report types...'
                  )}
                  onChange={val => setReportTypeSearchTerm(val)}
                  value={reportTypeSearchTerm}
                  className="gba:pl-10 gba:h-10 gba:text-sm gba:border-input"
                  data-testid="expense-reports-type-search-input"
                />
              </div>

              {/* Report Type List */}
              <div className="gba:space-y-2">
                {filteredReportTypes.map(type => (
                  <Card
                    key={type.key}
                    className={`gba:cursor-pointer gba:transition-colors gba:hover:bg-accent ${
                      selectedReportType === type.key ? 'gba:border-primary gba:bg-accent' : ''
                    }`}
                    onClick={() => setSelectedReportType(type.key)}
                    data-testid={`expense-reports-type-${type.key}`}
                  >
                    <CardContent className="gba:p-4">
                      <h4 className="gba:font-medium gba:text-sm">{type.name}</h4>
                      <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{type.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Report Table (min-w-0 so flex + wide DataTable use inner overflow-x like personal-expenses) */}
          <div className="gba:min-w-0 gba:flex-1 gba:flex gba:flex-col">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
              <div className="gba:relative gba:w-64">
                <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:w-4 gba:h-4 gba:pointer-events-none" />
                <DebouncedInput
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.search_report_data',
                    'Search report data...'
                  )}
                  onChange={val => {
                    setSearchTerm(val)
                    setCurrentPage(1)
                  }}
                  value={searchTerm}
                  className="gba:pl-10 gba:h-10 gba:text-sm gba:border-input"
                  data-testid="expense-reports-data-search-input"
                />
              </div>
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="gba:flex gba:items-center gba:gap-2"
                  data-testid="expense-reports-download-button"
                >
                  <DownloadIcon className="gba:text-sm" />
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.download_report',
                    'Download CSV'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadExcel}
                  className="gba:flex gba:items-center gba:gap-2"
                  data-testid="expense-reports-download-excel-button"
                >
                  <DownloadIcon className="gba:text-sm" />
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.download_report_excel',
                    'Download Excel'
                  )}
                </Button>
              </div>
            </div>

            <ExpenseDataTable<ReportItem>
              key={selectedReportType ?? 'report-type'}
              data={reportData}
              columns={columns}
              loading={isLoading}
              error={error}
              totalCount={totalCount}
              pagination={pagination}
              onPaginationChange={handlePaginationChange}
              emptyMessage={[
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.no_expense_reports_found',
                  'No expense reports found'
                ),
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.adjust_search',
                  'Try selecting a different report type or adjusting your search.'
                )
              ].join(' ')}
              dataTestId="expense-reports-table"
            />
          </div>
        </div>
      </PageLayout>
    </div>
  )
}

export default ExpenseReportsPage
