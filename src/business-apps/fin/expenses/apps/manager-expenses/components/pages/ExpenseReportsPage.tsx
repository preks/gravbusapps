import React, { useEffect, useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Spinner,
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  PageLayout
} from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, DownloadIcon, ArrowLeftIcon, FileTextIcon } from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpenseReportData, ReportType } from '../../hooks/useExpenseReportData'
import { ensureShortDateFormat } from '../../utils/dateUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../personal-expenses/utils'
import { sanitizeFilename } from '@/common/utils/textUtils'

// Shared helpers for rendering/exporting values
const dateKeys = new Set(['date', 'startDate', 'endDate', 'submissionDate', 'requestDate', 'createdAt', 'planDate'])

const formatCellValue = (key: string, raw: any): string => {
  if (raw == null) return ''
  if (dateKeys.has(key)) {
    return raw ? ensureShortDateFormat(raw) : ''
  }
  if (typeof raw === 'number') return String(raw)
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

const triggerFileDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename // Already sanitized by buildFilename()
  link.setAttribute('rel', 'noopener noreferrer')
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

interface ExpenseReportsPageProps extends BusinessAppContextProps {
  onNavigateBack: () => void
}

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
    fetchReportData,
    fetchAllForExport
  } = useExpenseReportData(contextProps)

  // Load initial data
  useEffect(() => {
    fetchReportData()
  }, [selectedReportType, currentPage, pageSize, searchTerm, fetchReportData])

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

  // Define columns based on report type
  type ColumnDef = { key: string; title: React.ReactNode; widthClass?: string }
  // Augment export with virtual columns not shown in UI
  const getExportColumns = (): ColumnDef[] => {
    const uiCols = getColumns()

    const insertCurrencyAfter = (afterKey: string) => {
      const alreadyHasCurrency = uiCols.some(c => c.key === 'currency')
      if (alreadyHasCurrency) return uiCols
      const idx = uiCols.findIndex(c => c.key === afterKey)
      if (idx === -1) return uiCols
      const currencyCol: ColumnDef = {
        key: 'currency',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.currency', 'Currency')
      }
      const next = [...uiCols]
      next.splice(idx + 1, 0, currencyCol)
      return next
    }

    switch (selectedReportType) {
      case ReportType.EXPENSE_ITEM:
        return insertCurrencyAfter('amount')
      case ReportType.EXPENSE_REQUEST:
        return insertCurrencyAfter('totalAmount')
      case ReportType.ADVANCE_PAYMENT:
        return insertCurrencyAfter('amount')
      default:
        return uiCols
    }
  }
  const getColumns = (): ColumnDef[] => {
    switch (selectedReportType) {
      case ReportType.EXPENSE_ITEM:
        return [
          {
            key: 'title',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.title', 'Title'),
            widthClass: 'gba:w-[20%]'
          },
          {
            key: 'code',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.expense_request_filter.request_number_input',
              'Expense Code'
            ),
            widthClass: 'gba:w-[8%]'
          },
          {
            key: 'employeeName',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee'),
            widthClass: 'gba:w-[13%]'
          },
          {
            key: 'date',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:acknowledge_sick_leave.submission_date',
              'Submission Date'
            ),
            widthClass: 'gba:w-[8%]'
          },
          {
            key: 'amount',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.expense_plan_table.amount',
              'Amount'
            )
          },
          {
            key: 'category',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.category', 'Category')
          },
          {
            key: 'status',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.expense_plan_table.status',
              'Status'
            )
          }
        ]
      case ReportType.EXPENSE_PLAN:
        return [
          {
            key: 'title',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.title', 'Title'),
            widthClass: 'gba:w-[18%]'
          },
          {
            key: 'code',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_table.code',
              'Plan Code'
            )
          },
          {
            key: 'expenseRequestCode',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.expense_request_filter.request_number_input',
              'Request Code'
            ),
            widthClass: 'gba:w-[8%]'
          },
          {
            key: 'employeeName',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee'),
            widthClass: 'gba:w-[15%]'
          },
          {
            key: 'createdAt',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:acknowledge_sick_leave.submission_date',
              'Submission Date'
            ),
            widthClass: 'gba:w-[8%]'
          },
          {
            key: 'status',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.expense_plan_table.status',
              'Status'
            ),
            widthClass: 'gba:w-[13%]'
          },
          {
            key: 'startDate',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.start_date', 'Start Date')
          },
          {
            key: 'endDate',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.end_date', 'End Date')
          }
        ]
      case ReportType.EXPENSE_REQUEST:
        return [
          {
            key: 'title',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.title', 'Title'),
            widthClass: 'gba:w-[25%]'
          },
          {
            key: 'code',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.expense_request_filter.request_number_input',
              'Request Code'
            )
          },
          {
            key: 'planCode',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_table.code',
              'Plan Code'
            )
          },
          {
            key: 'employeeName',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')
          },
          {
            key: 'createdAt',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:acknowledge_sick_leave.submission_date',
              'Submission Date'
            )
          },
          {
            key: 'status',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.expense_plan_table.status',
              'Status'
            )
          },
          {
            key: 'totalAmount',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.expense_plan_table.amount',
              'Total Amount'
            )
          }
        ]
      case ReportType.ADVANCE_PAYMENT:
        return [
          {
            key: 'title',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.title', 'Title'),
            widthClass: 'gba:w-[19%]'
          },
          {
            key: 'employeeName',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee'),
            widthClass: 'gba:w-[18%]'
          },
          {
            key: 'code',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_table.code',
              'Plan Code'
            )
          },
          {
            key: 'requestDate',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:acknowledge_sick_leave.submission_date',
              'Submission Date'
            ),
            widthClass: 'gba:w-[10%]'
          },
          {
            key: 'status',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.expense_plan_table.status',
              'Status'
            ),
            widthClass: 'gba:w-[11%]'
          },
          {
            key: 'amount',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.expense_plan_table.amount',
              'Amount'
            )
          },
          {
            key: 'paymentMethod',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:payment_method', 'Payment Method'),
            widthClass: 'gba:w-[8%]'
          },
          {
            key: 'costCenter',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:cost_center', 'Cost Center'),
            widthClass: 'gba:w-[8%]'
          }
        ]
      default:
        return []
    }
  }

  // Server-side search is now handled in the hook; no client-side filtering here

  // Handle download action (CSV export)
  const handleDownload = async () => {
    const cols = getExportColumns()
    if (!cols || cols.length === 0) {
      return
    }

    const header = cols.map(c => {
      const title = typeof c.title === 'string' ? c.title : String(c.key)
      return escapeCsv(title)
    })

    const allRows = await fetchAllForExport()
    const rows = (allRows as any[]).map(row => {
      return cols.map(c => escapeCsv(formatCellValue(c.key, row[c.key])))
    })

    const csvLines = [header.join(','), ...rows.map(r => r.join(','))]
    const csvContent = csvLines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const filename = buildFilename(String(selectedReportType), 'csv')
    triggerFileDownload(blob, filename)
  }

  // Handle download action (Excel .xls via HTML table)
  const handleDownloadExcel = async () => {
    const cols = getExportColumns()
    if (!cols || cols.length === 0) {
      return
    }

    const headerCells = cols
      .map(c => {
        const title = typeof c.title === 'string' ? c.title : String(c.key)
        return `<th>${htmlEscape(title)}</th>`
      })
      .join('')

    const allRows = await fetchAllForExport()
    const bodyRows = (allRows as any[])
      .map(row => {
        const tds = cols.map(c => `<td>${htmlEscape(formatCellValue(c.key, row[c.key]))}</td>`).join('')
        return `<tr>${tds}</tr>`
      })
      .join('')

    const headerHtml = `<thead><tr>${headerCells}</tr></thead>`
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><table>${headerHtml}<tbody>${bodyRows}</tbody></table></body></html>`

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const filename = buildFilename(String(selectedReportType), 'xls')
    triggerFileDownload(blob, filename)
  }

  const columns = getColumns()

  return (
    <div data-testid="expense-reports-page-container">
      <div className="gba:px-6 gba:pt-6 gba:pb-0">
        <div className="gba:flex gba:items-center gba:justify-between">
          <button
            onClick={onNavigateBack}
            className="gba:flex gba:items-center gba:text-foreground gba:hover:text-primary"
            data-testid="expense-reports-back-button"
          >
            <ArrowLeftIcon className="gba:mr-2" />
            <span>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.back_to_btn',
                'Back to Dashboard'
              )}
            </span>
          </button>
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
      </div>

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

          {/* Main Content - Report Table */}
          <div className="gba:flex-1 gba:flex gba:flex-col">
            {error && (
              <Alert className="gba:mb-4" data-testid="expense-reports-error-alert">
                <AlertDescription>
                  <strong>{getTranslationFromI18nKeyAndLabel('lowcoder:common.error_title', 'Error')}</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Search Bar for Table Data */}
            <div className="gba:mb-4">
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
            </div>

            {/* Report Table */}
            {(() => {
              if (isLoading) {
                return (
                  <div className="gba:flex gba:justify-center gba:p-8">
                    <Spinner data-testid="expense-reports-loading-spinner" />
                  </div>
                )
              }
              if (reportData && reportData.length > 0) {
                return (
                  <div className="gba:border gba:border-border gba:rounded-md gba:bg-background">
                    <div className="gba:overflow-x-auto gba:pr-4 gba:border-b gba:border-border">
                      <Table data-testid="expense-reports-table" className="gba:w-full">
                        <TableHeader className="gba:sticky gba:top-0 gba:bg-background gba:z-10 gba:border-b gba:border-border">
                          <TableRow>
                            {columns.map(column => (
                              <TableHead
                                key={column.key}
                                className={`${column.widthClass ?? ''} gba:bg-muted gba:font-semibold`}
                              >
                                {column.title}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.map((row: any, index: number) => (
                            <TableRow key={`${selectedReportType}-${index}`}>
                              {columns.map(column => {
                                let cellContent: React.ReactNode

                                if (column.key.includes('amount') || column.key.includes('Amount')) {
                                  cellContent = (
                                    <span className="gba:text-sm">
                                      {formatCurrencyDisplay(row[column.key] || 0, row.currency || 'EUR')}
                                    </span>
                                  )
                                } else if (
                                  [
                                    'date',
                                    'startDate',
                                    'endDate',
                                    'submissionDate',
                                    'requestDate',
                                    'createdAt',
                                    'planDate'
                                  ].includes(column.key)
                                ) {
                                  cellContent = (
                                    <span className="gba:text-sm">
                                      {row[column.key] ? ensureShortDateFormat(row[column.key]) : '-'}
                                    </span>
                                  )
                                } else {
                                  cellContent = <span className="gba:text-sm">{row[column.key] || '-'}</span>
                                }

                                return (
                                  <TableCell key={column.key} data-testid={`expense-reports-cell-${column.key}`}>
                                    {cellContent}
                                  </TableCell>
                                )
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination Footer */}
                    {totalCount > 0 && (
                      <div
                        className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4 gba:border-t gba:border-border"
                        data-testid="expense-reports-pagination"
                      >
                        <div
                          className="gba:text-sm gba:text-muted-foreground"
                          data-testid="expense-reports-pagination-info"
                        >
                          {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} ${totalCount}`}
                        </div>
                        <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
                          <div className="gba:flex gba:items-center gba:space-x-2">
                            <p className="gba:text-sm gba:font-medium">
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:personal_expenses.rows_per_page',
                                'Rows per page'
                              )}
                            </p>
                            <select
                              value={pageSize}
                              onChange={e => {
                                const size = Number(e.target.value)
                                setPageSize(size)
                                setCurrentPage(1)
                              }}
                              className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                              data-testid="expense-reports-page-size-select"
                            >
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </div>
                          <div
                            className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                            data-testid="expense-reports-page-info"
                          >
                            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.page', 'Page')} {currentPage}{' '}
                            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')}{' '}
                            {Math.ceil(totalCount / pageSize)}
                          </div>
                          <div className="gba:flex gba:items-center gba:space-x-2">
                            <Button
                              variant="outline"
                              className="gba:h-8 gba:w-8 gba:p-0"
                              onClick={() => setCurrentPage(1)}
                              disabled={currentPage === 1}
                              data-testid="expense-reports-first-page-button"
                            >
                              ⟪⟪
                            </Button>
                            <Button
                              variant="outline"
                              className="gba:h-8 gba:w-8 gba:p-0"
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              data-testid="expense-reports-previous-page-button"
                            >
                              ⟪
                            </Button>
                            <Button
                              variant="outline"
                              className="gba:h-8 gba:w-8 gba:p-0"
                              onClick={() =>
                                setCurrentPage(Math.min(Math.ceil(totalCount / pageSize), currentPage + 1))
                              }
                              disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                              data-testid="expense-reports-next-page-button"
                            >
                              ⟫
                            </Button>
                            <Button
                              variant="outline"
                              className="gba:h-8 gba:w-8 gba:p-0"
                              onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                              disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                              data-testid="expense-reports-last-page-button"
                            >
                              ⟫⟫
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
              return (
                <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center">
                  <div className="gba:text-muted-foreground gba:text-lg gba:font-medium gba:mb-2">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:team_expenses_page.dashboard_tab.no_expense_reports_found',
                      'No expense reports found'
                    )}
                  </div>
                  <div className="gba:text-muted-foreground gba:opacity-70 gba:mb-4">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:team_expenses_page.dashboard_tab.adjust_search',
                      'Try selecting a different report type or adjusting your search.'
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </PageLayout>
    </div>
  )
}

export default ExpenseReportsPage
