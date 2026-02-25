import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  DataDisplay,
  type FilterConfiguration,
  DataTable,
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  PageLayout,
  Tabs,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import type { ColumnDef as TanstackColumnDef, SortingState } from '@tanstack/react-table'
import { PiDownload, PiFileText, PiInfo } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useBackofficeExpenseReportData, ReportType } from '../../hooks/useBackofficeExpenseReportData'
import { ensureShortDateFormat } from '../../../manager-expenses/utils/dateUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../personal-expenses/utils'
import { sanitizeFilename } from '@/common/utils/textUtils'

const dateKeys = new Set([
  'date',
  'startDate',
  'endDate',
  'submissionDate',
  'requestDate',
  'createdAt',
  'planDate',
  'pendingAt',
  'approvedAt',
  'paidAt'
])

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
  const out = value.replace(/"/g, '""')
  return needsQuotes ? `"${out}"` : out
}

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
  return sanitizeFilename(filename)
}

interface BackofficeExpenseReportsPageProps extends BusinessAppContextProps {
  onNavigateBack: () => void
}

const BackofficeExpenseReportsPage: React.FC<BackofficeExpenseReportsPageProps> = ({ accessToken, userInfo }) => {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [fixedApprovalPayoutKpis, setFixedApprovalPayoutKpis] = useState({
    approvalBreachedLabel: '0/0',
    approvalBreachedRate: '0.0%',
    payoutBreachedLabel: '0/0',
    payoutBreachedRate: '0.0%',
    totalBreachedLabel: '0/0',
    totalBreachedRate: '0.0%',
    withinTotalLabel: '0/0',
    withinTotalRate: '0.0%'
  })

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
    searchTerm,
    setSearchTerm,
    selectedReportType,
    reportDataType,
    setSelectedReportType,
    fetchAllForExport
  } = useBackofficeExpenseReportData(contextProps)

  const reportTypes: Array<{ key: ReportType; name: string; description: string }> = [
    {
      key: ReportType.APPROVAL_PAYOUT_CYCLE,
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.approval_payout_cycle',
        'Approval & Payout Cycle'
      ),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.approval_payout_cycle_subheader',
        'Pending to approved to paid cycle durations'
      )
    },
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

  type ReportColumnDef = { key: string; title: React.ReactNode; widthClass?: string }
  const getExportColumns = (): ReportColumnDef[] => {
    const uiCols = getColumns()
    const insertCurrencyAfter = (afterKey: string) => {
      const alreadyHasCurrency = uiCols.some(c => c.key === 'currency')
      if (alreadyHasCurrency) return uiCols
      const idx = uiCols.findIndex(c => c.key === afterKey)
      if (idx === -1) return uiCols
      const currencyCol: ReportColumnDef = {
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
      case ReportType.EXPENSE_PLAN:
        return insertCurrencyAfter('totalAmount')
      case ReportType.EXPENSE_REQUEST:
        return insertCurrencyAfter('totalAmount')
      case ReportType.ADVANCE_PAYMENT:
        return insertCurrencyAfter('amount')
      case ReportType.APPROVAL_PAYOUT_CYCLE:
        return insertCurrencyAfter('totalAmount')
      default:
        return uiCols
    }
  }

  const getColumns = (): ReportColumnDef[] => {
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
            key: 'totalAmount',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.expense_plan_table.amount',
              'Total Amount'
            )
          },
          {
            key: 'advancePaidAmount',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.advance_payments_subheader',
              'Advance Payment'
            )
          },
          {
            key: 'remainingAmount',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.plan_vs_request',
              'Remaining Amount'
            )
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
          },
          {
            key: 'advancePaidAmount',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.advance_payments_subheader',
              'Advance Payment'
            )
          },
          {
            key: 'remainingAmount',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.plan_vs_request',
              'Remaining Amount'
            )
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
      case ReportType.APPROVAL_PAYOUT_CYCLE:
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
              'Request Code'
            )
          },
          {
            key: 'employeeName',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')
          },
          {
            key: 'pendingAt',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.submitted_label',
              'Pending At'
            )
          },
          {
            key: 'approvedAt',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:approval_date', 'Approved At')
          },
          {
            key: 'paidAt',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:payment_date', 'Paid At')
          },
          {
            key: 'approvalDays',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:approval_days', 'Approval Days')
          },
          {
            key: 'payoutDays',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:payout_days', 'Payout Days')
          },
          {
            key: 'totalCycleDays',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:total_cycle_days', 'Total Cycle Days')
          },
          {
            key: 'approvalSlaLimitDays',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:approval_sla_limit_days', 'Approval SLA Limit (Days)')
          },
          {
            key: 'payoutSlaLimitDays',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:payout_sla_limit_days', 'Payout SLA Limit (Days)')
          },
          {
            key: 'totalCycleSlaLimitDays',
            title: getTranslationFromI18nKeyAndLabel(
              'lowcoder:total_cycle_sla_limit_days',
              'Total Cycle SLA Limit (Days)'
            )
          },
          {
            key: 'approvalSlaStatus',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:approval_sla_status', 'Approval SLA Status')
          },
          {
            key: 'payoutSlaStatus',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:payout_sla_status', 'Payout SLA Status')
          },
          {
            key: 'totalCycleSlaStatus',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:total_cycle_sla_status', 'Total Cycle SLA Status')
          },
          {
            key: 'bottleneckStage',
            title: getTranslationFromI18nKeyAndLabel('lowcoder:bottleneck_stage', 'Bottleneck Stage')
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
      default:
        return []
    }
  }

  const handleDownload = async () => {
    const cols = getExportColumns()
    if (!cols || cols.length === 0) return
    const header = cols.map(c => {
      const title = typeof c.title === 'string' ? c.title : String(c.key)
      return escapeCsv(title)
    })
    const allRows = await fetchAllForExport()
    const rows = (allRows as any[]).map(row => cols.map(c => escapeCsv(formatCellValue(c.key, row[c.key]))))
    const csvLines = [header.join(','), ...rows.map(r => r.join(','))]
    const csvContent = csvLines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const filename = buildFilename(String(selectedReportType), 'csv')
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
    const cols = getExportColumns()
    if (!cols || cols.length === 0) return
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
    const url = URL.createObjectURL(blob)
    const filename = buildFilename(String(selectedReportType), 'xls')
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.setAttribute('rel', 'noopener noreferrer')
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const columns = useMemo(() => getColumns(), [selectedReportType])
  const isDataAlignedWithSelectedType = reportDataType === selectedReportType
  const hasReportRows = isDataAlignedWithSelectedType && Array.isArray(reportData) && reportData.length > 0
  const displayTotalCount = isDataAlignedWithSelectedType ? totalCount : 0
  const tableLoading = isLoading && !hasReportRows

  const selectedReportMeta = reportTypes.find(type => type.key === selectedReportType)
  const tabsValue = selectedReportType || ReportType.APPROVAL_PAYOUT_CYCLE
  const handleReportTypeChange = (value: string) => {
    const nextReportType = reportTypes.find(type => type.key === value)?.key
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: 'post-fix-tab-refresh-8',
        hypothesisId: 'H13',
        location: 'BackofficeExpenseReportsPage.tsx:handleReportTypeChange',
        message: 'tab ui value change event',
        data: {
          currentType: selectedReportType,
          nextType: nextReportType,
          rawValue: value,
          isSameType: selectedReportType === nextReportType
        },
        timestamp: Date.now()
      })
    }).catch(() => {})
    // #endregion
    if (nextReportType) {
      setSelectedReportType(nextReportType)
    }
  }
  const approvalPayoutKpiTooltips = {
    approvalBreached:
      'Share of requests where Approval SLA Status is Breached. Formula: breached approval rows / evaluable approval rows. Rows with missing approval timeline are excluded.',
    payoutBreached:
      'Share of requests where Payout SLA Status is Breached. Payout SLA limit is dynamic per request: min(next or same Monday after approval, remaining total SLA window = total SLA - approval days).',
    totalBreached:
      'Share of requests where Total Cycle SLA Status is Breached. Formula: breached total-cycle rows / evaluable total-cycle rows. Total cycle compares pending-to-paid duration against total SLA limit.',
    totalWithin:
      'Share of requests where Total Cycle SLA Status is Within SLA. Formula: within-SLA total-cycle rows / evaluable total-cycle rows.'
  }
  const approvalPayoutSlaKpis = useMemo(() => {
    if (selectedReportType !== ReportType.APPROVAL_PAYOUT_CYCLE) return null
    const rows = Array.isArray(reportData) ? (reportData as any[]) : []
    const evaluatedApproval = rows.filter(row => row?.approvalSlaStatus !== '-')
    const evaluatedPayout = rows.filter(row => row?.payoutSlaStatus !== '-')
    const evaluatedTotal = rows.filter(row => row?.totalCycleSlaStatus !== '-')

    const approvalBreached = evaluatedApproval.filter(row => row?.approvalSlaStatus === 'Breached').length
    const payoutBreached = evaluatedPayout.filter(row => row?.payoutSlaStatus === 'Breached').length
    const totalBreached = evaluatedTotal.filter(row => row?.totalCycleSlaStatus === 'Breached').length
    const withinTotal = evaluatedTotal.filter(row => row?.totalCycleSlaStatus === 'Within SLA').length

    const formatRate = (count: number, total: number) => (total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0.0%')

    return {
      approvalBreachedLabel: `${approvalBreached}/${evaluatedApproval.length}`,
      approvalBreachedRate: formatRate(approvalBreached, evaluatedApproval.length),
      payoutBreachedLabel: `${payoutBreached}/${evaluatedPayout.length}`,
      payoutBreachedRate: formatRate(payoutBreached, evaluatedPayout.length),
      totalBreachedLabel: `${totalBreached}/${evaluatedTotal.length}`,
      totalBreachedRate: formatRate(totalBreached, evaluatedTotal.length),
      withinTotalLabel: `${withinTotal}/${evaluatedTotal.length}`,
      withinTotalRate: formatRate(withinTotal, evaluatedTotal.length)
    }
  }, [selectedReportType, reportData])
  useEffect(() => {
    if (approvalPayoutSlaKpis) {
      setFixedApprovalPayoutKpis(approvalPayoutSlaKpis)
    }
  }, [approvalPayoutSlaKpis])
  const approvalPayoutSlaKpiValues = fixedApprovalPayoutKpis
  const dataTableColumns = useMemo<TanstackColumnDef<any>[]>(() => {
    return columns.map(column => ({
      id: column.key,
      header: () => <>{column.title ?? ''}</>,
      accessorFn: (row: any) => row?.[column.key],
      cell: ({ row }: any) => {
        const value = row?.original?.[column.key]
        if (column.key.includes('amount') || column.key.includes('Amount')) {
          return (
            <span className="gba:text-sm">{formatCurrencyDisplay(value || 0, row?.original?.currency || 'EUR')}</span>
          )
        }
        if (dateKeys.has(column.key)) {
          return <span className="gba:text-sm">{value ? ensureShortDateFormat(value) : '-'}</span>
        }
        if (column.key === 'title') {
          const titleValue = value || '-'
          return (
            <span className="gba:block gba:max-w-[280px] gba:truncate gba:text-sm" title={titleValue}>
              {titleValue}
            </span>
          )
        }
        return (
          <span className="gba:text-sm">
            {value === null || value === undefined || value === '' ? '-' : String(value)}
          </span>
        )
      }
    }))
  }, [columns])
  const alignedReportRows = useMemo<any[]>(
    () => (isDataAlignedWithSelectedType && Array.isArray(reportData) ? (reportData as any[]) : []),
    [isDataAlignedWithSelectedType, reportData]
  )
  const statusFilterOptions = useMemo(() => {
    return Array.from(new Set(alignedReportRows.map(row => String(row?.status || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
      .map(value => ({ id: value, label: value }))
  }, [alignedReportRows])
  const employeeFilterOptions = useMemo(() => {
    return Array.from(new Set(alignedReportRows.map(row => String(row?.employeeName || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
      .map(value => ({ id: value, label: value }))
  }, [alignedReportRows])
  const filterConfiguration = useMemo<FilterConfiguration>(
    () => ({
      id: 'backoffice-expense-reports-filters',
      name: 'Report Filters',
      groups: [
        {
          id: 'status-group',
          label: 'Status',
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'status',
              field: 'status',
              label: 'Status',
              type: 'multi-select',
              config: {
                options: statusFilterOptions,
                searchPlaceholder: 'Search status...',
                totalCount: statusFilterOptions.length,
                hasMore: false
              }
            }
          ]
        },
        {
          id: 'employee-group',
          label: 'Employee',
          collapsible: true,
          defaultExpanded: false,
          filters: [
            {
              id: 'employeeName',
              field: 'employeeName',
              label: 'Employee',
              type: 'multi-select',
              config: {
                options: employeeFilterOptions,
                searchPlaceholder: 'Search employee...',
                totalCount: employeeFilterOptions.length,
                hasMore: false
              }
            }
          ]
        }
      ]
    }),
    [statusFilterOptions, employeeFilterOptions]
  )
  const filteredReportRows = useMemo(() => {
    const selectedStatuses = Array.isArray(selectedFilters?.status) ? selectedFilters.status : []
    const selectedEmployees = Array.isArray(selectedFilters?.employeeName) ? selectedFilters.employeeName : []
    if (selectedStatuses.length === 0 && selectedEmployees.length === 0) return alignedReportRows
    return alignedReportRows.filter(row => {
      const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(String(row?.status || ''))
      const employeeMatch =
        selectedEmployees.length === 0 || selectedEmployees.includes(String(row?.employeeName || ''))
      return statusMatch && employeeMatch
    })
  }, [alignedReportRows, selectedFilters])
  const hasActiveFilters = useMemo(() => {
    const selectedStatuses = Array.isArray(selectedFilters?.status) ? selectedFilters.status : []
    const selectedEmployees = Array.isArray(selectedFilters?.employeeName) ? selectedFilters.employeeName : []
    return selectedStatuses.length > 0 || selectedEmployees.length > 0
  }, [selectedFilters])
  const sortableColumns = useMemo(
    () =>
      columns.map(column => ({
        id: column.key,
        label: typeof column.title === 'string' ? column.title : column.key
      })),
    [columns]
  )
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }
  const handleFilterChange = (filters: Record<string, any>) => {
    setSelectedFilters(filters || {})
    setCurrentPage(1)
  }
  const tablePagination = useMemo(
    () => ({
      pageIndex: Math.max(currentPage - 1, 0),
      pageSize
    }),
    [currentPage, pageSize]
  )
  const previousDataTableColumnsRef = useRef<TanstackColumnDef<any>[] | null>(null)
  const previousFilterConfigurationRef = useRef<FilterConfiguration | null>(null)
  const kpiRowRef = useRef<HTMLDivElement | null>(null)
  const tabsContainerRef = useRef<HTMLDivElement | null>(null)
  const toolbarContainerRef = useRef<HTMLDivElement | null>(null)
  const tableContainerRef = useRef<HTMLDivElement | null>(null)
  const handleTablePaginationChange = (pagination: { pageIndex: number; pageSize: number }) => {
    if (pagination.pageSize === pageSize) {
      setCurrentPage(pagination.pageIndex + 1)
      return
    }
    setPageSize(pagination.pageSize)
    setCurrentPage(1)
  }
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: 'post-fix-tab-refresh-2',
        hypothesisId: 'H6',
        location: 'BackofficeExpenseReportsPage.tsx:renderState',
        message: 'page render state',
        data: {
          selectedReportType,
          reportDataType,
          isLoading,
          hasReportRows,
          tableLoading,
          reportRows: Array.isArray(reportData) ? reportData.length : 0,
          alignedRows: alignedReportRows.length,
          filteredRows: filteredReportRows.length,
          currentPage,
          pageSize
        },
        timestamp: Date.now()
      })
    }).catch(() => {})
    // #endregion
  }, [
    selectedReportType,
    reportDataType,
    isLoading,
    hasReportRows,
    tableLoading,
    reportData,
    alignedReportRows.length,
    filteredReportRows.length,
    currentPage,
    pageSize
  ])
  useEffect(() => {
    const previousColumns = previousDataTableColumnsRef.current
    const previousFilters = previousFilterConfigurationRef.current
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: 'post-fix-tab-refresh-5',
        hypothesisId: 'H9',
        location: 'BackofficeExpenseReportsPage.tsx:identityChurn',
        message: 'toolbar/table identity churn',
        data: {
          selectedReportType,
          columnsChanged: previousColumns !== dataTableColumns,
          filtersChanged: previousFilters !== filterConfiguration,
          columnCount: dataTableColumns.length,
          statusOptionsCount: statusFilterOptions.length,
          employeeOptionsCount: employeeFilterOptions.length,
          selectedFilterKeys: Object.keys(selectedFilters || {}).length
        },
        timestamp: Date.now()
      })
    }).catch(() => {})
    // #endregion
    previousDataTableColumnsRef.current = dataTableColumns
    previousFilterConfigurationRef.current = filterConfiguration
  }, [
    selectedReportType,
    dataTableColumns,
    filterConfiguration,
    statusFilterOptions.length,
    employeeFilterOptions.length,
    selectedFilters
  ])
  useEffect(() => {
    const kpiRect = kpiRowRef.current?.getBoundingClientRect()
    const tabsRect = tabsContainerRef.current?.getBoundingClientRect()
    const toolbarRect = toolbarContainerRef.current?.getBoundingClientRect()
    const tableRect = tableContainerRef.current?.getBoundingClientRect()
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: 'post-fix-tab-refresh-9',
        hypothesisId: 'H14',
        location: 'BackofficeExpenseReportsPage.tsx:layoutMetrics',
        message: 'reports layout metrics after render',
        data: {
          selectedReportType,
          tableLoading,
          hasReportRows,
          kpiTop: kpiRect?.top ?? null,
          kpiHeight: kpiRect?.height ?? null,
          tabsTop: tabsRect?.top ?? null,
          tabsHeight: tabsRect?.height ?? null,
          toolbarTop: toolbarRect?.top ?? null,
          toolbarHeight: toolbarRect?.height ?? null,
          tableTop: tableRect?.top ?? null,
          tableHeight: tableRect?.height ?? null
        },
        timestamp: Date.now()
      })
    }).catch(() => {})
    // #endregion
  }, [selectedReportType, tableLoading, hasReportRows, filteredReportRows.length, dataTableColumns.length])
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: 'post-fix-tab-refresh-7',
        hypothesisId: 'H11',
        location: 'BackofficeExpenseReportsPage.tsx:lifecycle',
        message: 'page component mounted',
        data: { selectedReportType },
        timestamp: Date.now()
      })
    }).catch(() => {})
    // #endregion
    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: 'post-fix-tab-refresh-7',
          hypothesisId: 'H11',
          location: 'BackofficeExpenseReportsPage.tsx:lifecycle',
          message: 'page component unmounted',
          data: { selectedReportType },
          timestamp: Date.now()
        })
      }).catch(() => {})
      // #endregion
    }
  }, [])

  return (
    <div data-testid="backoffice-expense-reports-page-container">
      <PageLayout
        headerTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.modal_list_or_flow_button.absence_same_location_btn',
          'Expense Reports'
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.expense_reports_subheader',
          'Generate and download comprehensive expense reports across different categories and time periods'
        )}
        headerIcon={PiFileText as any}
        className="gba:min-h-screen"
      >
        <div
          className="gba:px-6 gba:pb-6 gba:flex gba:flex-col gba:gap-4"
          data-testid="backoffice-expense-reports-page"
        >
          <div className="gba:flex-1 gba:flex gba:flex-col gba:gap-4">
            {error && (
              <Alert data-testid="backoffice-expense-reports-error-alert">
                <AlertDescription>
                  <strong>{getTranslationFromI18nKeyAndLabel('lowcoder:common.error_title', 'Error')}</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            <div
              ref={kpiRowRef}
              className="gba:mb-4 gba:min-h-[140px]"
              data-testid="backoffice-expense-reports-kpi-row"
            >
              <TooltipProvider>
                <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-4">
                  <Card className="gba:min-h-[124px]" data-testid="backoffice-approval-sla-breached-kpi">
                    <CardContent className="gba:p-4">
                      <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:approval_sla_breached_rate',
                          'Approval SLA Breached'
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="gba:inline-flex gba:items-center gba:text-muted-foreground"
                              aria-label="Approval SLA Breached formula"
                              data-testid="backoffice-approval-sla-breached-tooltip-trigger"
                            >
                              <PiInfo />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="gba:max-w-[320px]">
                            {approvalPayoutKpiTooltips.approvalBreached}
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="gba:text-xl gba:font-semibold">{approvalPayoutSlaKpiValues.approvalBreachedRate}</p>
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {approvalPayoutSlaKpiValues.approvalBreachedLabel}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="gba:min-h-[124px]" data-testid="backoffice-payout-sla-breached-kpi">
                    <CardContent className="gba:p-4">
                      <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:payout_sla_breached_rate', 'Payout SLA Breached')}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="gba:inline-flex gba:items-center gba:text-muted-foreground"
                              aria-label="Payout SLA Breached formula"
                              data-testid="backoffice-payout-sla-breached-tooltip-trigger"
                            >
                              <PiInfo />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="gba:max-w-[320px]">
                            {approvalPayoutKpiTooltips.payoutBreached}
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="gba:text-xl gba:font-semibold">{approvalPayoutSlaKpiValues.payoutBreachedRate}</p>
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {approvalPayoutSlaKpiValues.payoutBreachedLabel}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="gba:min-h-[124px]" data-testid="backoffice-total-cycle-sla-breached-kpi">
                    <CardContent className="gba:p-4">
                      <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:total_cycle_sla_breached_rate',
                          'Total Cycle SLA Breached'
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="gba:inline-flex gba:items-center gba:text-muted-foreground"
                              aria-label="Total Cycle SLA Breached formula"
                              data-testid="backoffice-total-cycle-sla-breached-tooltip-trigger"
                            >
                              <PiInfo />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="gba:max-w-[320px]">
                            {approvalPayoutKpiTooltips.totalBreached}
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="gba:text-xl gba:font-semibold">{approvalPayoutSlaKpiValues.totalBreachedRate}</p>
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {approvalPayoutSlaKpiValues.totalBreachedLabel}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="gba:min-h-[124px]" data-testid="backoffice-total-cycle-within-sla-kpi">
                    <CardContent className="gba:p-4">
                      <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:total_cycle_within_sla_rate',
                          'Total Cycle Within SLA'
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="gba:inline-flex gba:items-center gba:text-muted-foreground"
                              aria-label="Total Cycle Within SLA formula"
                              data-testid="backoffice-total-cycle-within-sla-tooltip-trigger"
                            >
                              <PiInfo />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="gba:max-w-[320px]">
                            {approvalPayoutKpiTooltips.totalWithin}
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="gba:text-xl gba:font-semibold">{approvalPayoutSlaKpiValues.withinTotalRate}</p>
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {approvalPayoutSlaKpiValues.withinTotalLabel}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TooltipProvider>
            </div>

            <div ref={tabsContainerRef}>
              <Tabs
                value={tabsValue}
                onValueChange={handleReportTypeChange}
                data-testid="backoffice-expense-reports-tabs-card"
              >
                <TabsList
                  className="gba:grid gba:w-full"
                  style={{ gridTemplateColumns: `repeat(${reportTypes.length}, 1fr)` }}
                >
                  {reportTypes.map(type => (
                    <TabsTrigger
                      key={type.key}
                      value={type.key}
                      data-testid={`backoffice-expense-reports-type-${type.key}`}
                    >
                      {type.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <p
              className="gba:text-xs gba:text-muted-foreground gba:px-1"
              data-testid="backoffice-expense-reports-selected-type-description"
            >
              {selectedReportMeta?.description}
            </p>

            <div ref={toolbarContainerRef}>
              <DataDisplay
                titleSections={[
                  {
                    id: 'results',
                    label: getTranslationFromI18nKeyAndLabel('lowcoder:common.data', 'Data'),
                    metadata: {
                      count: hasActiveFilters ? filteredReportRows.length : displayTotalCount,
                      isLoading: tableLoading
                    }
                  }
                ]}
                currentSection="results"
                searchValue={searchTerm}
                searchPlaceholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.search_report_data',
                  'Search report data...'
                )}
                onSearchChange={handleSearchChange}
                filters={selectedFilters}
                filterConfiguration={filterConfiguration}
                onFilterChange={handleFilterChange}
                sorting={sorting}
                sortableColumns={sortableColumns}
                onSortingChange={setSorting}
                primaryAction={
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Button
                      variant="outline"
                      onClick={handleDownload}
                      className="gba:flex gba:items-center gba:gap-2"
                      data-testid="backoffice-expense-reports-download-button"
                    >
                      <PiDownload className="gba:text-sm" />
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:team_expenses_page.dashboard_tab.download_report',
                        'Download CSV'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadExcel}
                      className="gba:flex gba:items-center gba:gap-2"
                      data-testid="backoffice-expense-reports-download-excel-button"
                    >
                      <PiDownload className="gba:text-sm" />
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:team_expenses_page.dashboard_tab.download_report_excel',
                        'Download Excel'
                      )}
                    </Button>
                  </div>
                }
                toolbarDensity="default"
                data-testid="backoffice-expense-reports-filters-card"
              >
                <div ref={tableContainerRef} className="gba:border gba:border-border gba:rounded-md gba:bg-background">
                  <DataTable
                    data={filteredReportRows}
                    columns={dataTableColumns}
                    loading={tableLoading}
                    totalCount={hasActiveFilters ? filteredReportRows.length : displayTotalCount}
                    pagination={tablePagination}
                    onPaginationChange={handleTablePaginationChange}
                    enablePagination
                    enableSorting
                    sorting={sorting}
                    onSortingChange={setSorting}
                    enableSelection={false}
                    enableColumnPinning
                    enableResizing={true}
                    tableLayout="fixed"
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    showPageNumbers
                    maxVisiblePages={7}
                    emptyMessage={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:team_expenses_page.dashboard_tab.no_expense_reports_found',
                      'No expense reports found'
                    )}
                    data-testid="backoffice-expense-reports-table"
                  />
                </div>
              </DataDisplay>
            </div>
          </div>
        </div>
      </PageLayout>
    </div>
  )
}

export default BackofficeExpenseReportsPage
