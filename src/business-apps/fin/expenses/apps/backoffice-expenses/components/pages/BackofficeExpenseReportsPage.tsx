import React, { useEffect, useMemo, useState } from 'react'
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
import type { ColumnDef as TanstackColumnDef, OnChangeFn, SortingState } from '@tanstack/react-table'
import { PiDownload, PiFileText, PiInfo } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useBackofficeExpenseReportData, ReportType } from '../../hooks/useBackofficeExpenseReportData'
import { useFilterData } from '../../hooks/useFilterData'
import { getActiveStructureDepartmentNames } from '../../utils/departmentOptions'
import { ensureShortDateFormat } from '../../../manager-expenses/utils/dateUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../personal-expenses/utils'
import {
  isDateKey,
  downloadCsvReport,
  downloadExcelReport,
  computeSlaKpis,
  type ReportColumnDef
} from './backofficeExpenseReportsPage.utils'

type BackofficeExpenseReportsPageProps = BusinessAppContextProps

type ReportSnapshot = {
  rows: any[]
  totalCount: number
}
type ReportFilterOptionSnapshot = {
  employees: string[]
  departments: string[]
}

const BackofficeExpenseReportsPage: React.FC<BackofficeExpenseReportsPageProps> = ({ accessToken, userInfo }) => {
  const toFilterText = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return String(value).trim()
    }
    return ''
  }

  const [filtersByReportType, setFiltersByReportType] = useState<Partial<Record<ReportType, Record<string, any>>>>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [reportSnapshotsByType, setReportSnapshotsByType] = useState<Partial<Record<ReportType, ReportSnapshot>>>({})
  const [fullFilterOptionsByType, setFullFilterOptionsByType] = useState<
    Partial<Record<ReportType, ReportFilterOptionSnapshot>>
  >({})

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
  } = useBackofficeExpenseReportData(contextProps, filtersByReportType, sorting)
  const { organizationalUnits } = useFilterData({ accessToken })
  const selectedFilters = useMemo(
    () => (selectedReportType ? (filtersByReportType[selectedReportType] ?? {}) : {}),
    [filtersByReportType, selectedReportType]
  )

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
    const allRows = await fetchAllForExport()
    downloadCsvReport(selectedReportType, cols, allRows as any[])
  }

  const handleDownloadExcel = async () => {
    const cols = getExportColumns()
    if (!cols || cols.length === 0) return
    const allRows = await fetchAllForExport()
    downloadExcelReport(selectedReportType, cols, allRows as any[])
  }

  const columns = useMemo(() => getColumns(), [selectedReportType])
  const isDataAlignedWithSelectedType = reportDataType === selectedReportType
  const selectedReportSnapshot = selectedReportType ? reportSnapshotsByType[selectedReportType] : undefined
  const baseReportRows = useMemo<any[]>(
    () =>
      isDataAlignedWithSelectedType && Array.isArray(reportData)
        ? (reportData as any[])
        : (selectedReportSnapshot?.rows ?? []),
    [isDataAlignedWithSelectedType, reportData, selectedReportSnapshot]
  )
  const hasReportRows = Array.isArray(baseReportRows) && baseReportRows.length > 0
  const displayTotalCount = isDataAlignedWithSelectedType ? totalCount : (selectedReportSnapshot?.totalCount ?? 0)
  const tableLoading = isLoading && !hasReportRows
  useEffect(() => {
    if (!selectedReportType || !isDataAlignedWithSelectedType || !Array.isArray(reportData)) return
    setReportSnapshotsByType(previous => ({
      ...previous,
      [selectedReportType]: {
        rows: reportData as any[],
        totalCount
      }
    }))
  }, [selectedReportType, isDataAlignedWithSelectedType, reportData, totalCount])

  const selectedReportMeta = reportTypes.find(type => type.key === selectedReportType)
  const tabsValue = selectedReportType || ReportType.APPROVAL_PAYOUT_CYCLE
  const handleReportTypeChange = (value: string) => {
    const nextReportType = reportTypes.find(type => type.key === value)?.key
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
  const approvalPayoutSlaKpiValues = useMemo(
    () => computeSlaKpis(selectedReportType, Array.isArray(reportData) ? (reportData as any[]) : []),
    [selectedReportType, reportData]
  )
  const approvalSlaCards = [
    {
      cardTestId: 'backoffice-approval-sla-breached-kpi',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:approval_sla_breached_rate', 'Approval SLA Breached'),
      triggerTestId: 'backoffice-approval-sla-breached-tooltip-trigger',
      triggerLabel: 'Approval SLA Breached formula',
      tooltip: approvalPayoutKpiTooltips.approvalBreached,
      value: approvalPayoutSlaKpiValues.approvalBreachedRate,
      label: approvalPayoutSlaKpiValues.approvalBreachedLabel
    },
    {
      cardTestId: 'backoffice-payout-sla-breached-kpi',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:payout_sla_breached_rate', 'Payout SLA Breached'),
      triggerTestId: 'backoffice-payout-sla-breached-tooltip-trigger',
      triggerLabel: 'Payout SLA Breached formula',
      tooltip: approvalPayoutKpiTooltips.payoutBreached,
      value: approvalPayoutSlaKpiValues.payoutBreachedRate,
      label: approvalPayoutSlaKpiValues.payoutBreachedLabel
    },
    {
      cardTestId: 'backoffice-total-cycle-sla-breached-kpi',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:total_cycle_sla_breached_rate', 'Total Cycle SLA Breached'),
      triggerTestId: 'backoffice-total-cycle-sla-breached-tooltip-trigger',
      triggerLabel: 'Total Cycle SLA Breached formula',
      tooltip: approvalPayoutKpiTooltips.totalBreached,
      value: approvalPayoutSlaKpiValues.totalBreachedRate,
      label: approvalPayoutSlaKpiValues.totalBreachedLabel
    },
    {
      cardTestId: 'backoffice-total-cycle-within-sla-kpi',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:total_cycle_within_sla_rate', 'Total Cycle Within SLA'),
      triggerTestId: 'backoffice-total-cycle-within-sla-tooltip-trigger',
      triggerLabel: 'Total Cycle Within SLA formula',
      tooltip: approvalPayoutKpiTooltips.totalWithin,
      value: approvalPayoutSlaKpiValues.withinTotalRate,
      label: approvalPayoutSlaKpiValues.withinTotalLabel
    }
  ]
  const backendSortableColumnKeys = useMemo(() => {
    switch (selectedReportType) {
      case ReportType.EXPENSE_ITEM:
        return new Set(['title', 'date', 'amount', 'status'])
      case ReportType.EXPENSE_REQUEST:
        return new Set(['title', 'code', 'createdAt', 'status', 'totalAmount', 'requestDate', 'startDate', 'endDate'])
      case ReportType.EXPENSE_PLAN:
        return new Set(['title', 'code', 'createdAt', 'status', 'totalAmount', 'startDate', 'endDate'])
      case ReportType.ADVANCE_PAYMENT:
        return new Set(['requestDate', 'status', 'amount', 'paymentMethod'])
      case ReportType.APPROVAL_PAYOUT_CYCLE:
        return new Set(['title', 'code', 'status', 'totalAmount'])
      default:
        return new Set<string>()
    }
  }, [selectedReportType])
  const renderTableCell = (columnKey: string, rowOriginal: any) => {
    const value = rowOriginal?.[columnKey]
    if (columnKey.includes('amount') || columnKey.includes('Amount')) {
      return <span className="gba:text-sm">{formatCurrencyDisplay(value || 0, rowOriginal?.currency || 'EUR')}</span>
    }
    if (isDateKey(columnKey)) {
      return <span className="gba:text-sm">{value ? ensureShortDateFormat(value) : '-'}</span>
    }
    if (columnKey === 'title') {
      const titleValue = value || '-'
      return (
        <span className="gba:block gba:max-w-[280px] gba:truncate gba:text-sm" title={titleValue}>
          {titleValue}
        </span>
      )
    }
    return (
      <span className="gba:text-sm">{value === null || value === undefined || value === '' ? '-' : String(value)}</span>
    )
  }
  const dataTableColumns = useMemo<TanstackColumnDef<any>[]>(() => {
    return columns.map(column => ({
      id: column.key,
      enableSorting: backendSortableColumnKeys.has(column.key),
      header: column.title ?? '',
      accessorFn: (row: any) => row?.[column.key],
      cell: ({ row }: any) => renderTableCell(column.key, row?.original)
    }))
  }, [columns, backendSortableColumnKeys])
  const alignedReportRows = useMemo<any[]>(
    () => (Array.isArray(baseReportRows) ? baseReportRows : []),
    [baseReportRows]
  )
  const transferRequiredFilterLabel = 'Transfer Required'
  const transferRequiredStatusAliases = useMemo(
    () =>
      new Set([
        transferRequiredFilterLabel,
        'VERIFIED',
        'BOOKED',
        'TRANSFERRED',
        getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.verified', 'Verified'),
        getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.booked', 'Booked'),
        getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.transferred', 'Transferred'),
        getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.booking_required', 'Booking Required')
      ]),
    [transferRequiredFilterLabel]
  )
  const normalizeStatusFilterValue = (value: unknown): string => {
    const normalizedValue = toFilterText(value)
    if (!normalizedValue) return ''
    if (
      transferRequiredStatusAliases.has(normalizedValue) ||
      transferRequiredStatusAliases.has(normalizedValue.toUpperCase())
    ) {
      return transferRequiredFilterLabel
    }
    return normalizedValue
  }
  const reportRowsWithGroupedStatuses = useMemo(
    () =>
      alignedReportRows.map(row => ({
        ...row,
        status: normalizeStatusFilterValue(row?.status)
      })),
    [alignedReportRows, transferRequiredStatusAliases, transferRequiredFilterLabel]
  )
  const statusFilterOptions = useMemo(() => {
    if (selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE) {
      return [
        { id: 'In Approval', label: 'In Approval' },
        { id: 'Verification Required', label: 'Verification Required' },
        { id: 'Payment Required', label: 'Payment Required' },
        { id: 'Prepared', label: 'Prepared' },
        { id: transferRequiredFilterLabel, label: transferRequiredFilterLabel },
        { id: 'Paid', label: 'Paid' }
      ]
    }
    const restrictedStatuses = new Set(['Payment Required', 'Prepared'])
    const options = Array.from(
      new Set(reportRowsWithGroupedStatuses.map(row => String(row?.status || '').trim()).filter(Boolean))
    )
      .sort((a, b) => a.localeCompare(b))
      .map(value => ({ id: value, label: value }))
    if (selectedReportType === ReportType.ADVANCE_PAYMENT) {
      return options
    }
    return options.filter(option => !restrictedStatuses.has(String(option.id)))
  }, [selectedReportType, reportRowsWithGroupedStatuses, transferRequiredFilterLabel])
  useEffect(() => {
    if (!selectedReportType) return
    if (fullFilterOptionsByType[selectedReportType]) return
    if (searchTerm.trim()) return
    const selectedStatuses = Array.isArray(selectedFilters?.status) ? selectedFilters.status : []
    const selectedEmployees = Array.isArray(selectedFilters?.employeeName) ? selectedFilters.employeeName : []
    const selectedDepartments = Array.isArray(selectedFilters?.departmentName) ? selectedFilters.departmentName : []
    if (selectedStatuses.length > 0 || selectedEmployees.length > 0 || selectedDepartments.length > 0) return

    let cancelled = false
    const loadAllRowsForFilterOptions = async () => {
      const allRows = (await fetchAllForExport()) as any[]
      if (cancelled) return
      const employees = Array.from(
        new Set(allRows.map(row => String(row?.employeeName || '').trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b))
      const departments = Array.from(
        new Set(allRows.map(row => String(row?.departmentName || '').trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b))
      setFullFilterOptionsByType(previous => ({
        ...previous,
        [selectedReportType]: { employees, departments }
      }))
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '92864d' },
        body: JSON.stringify({
          sessionId: '92864d',
          runId: 'pre-fix',
          hypothesisId: 'H3',
          location: 'BackofficeExpenseReportsPage.tsx:742',
          message: 'reports-full-filter-options-fetched',
          data: {
            selectedReportType,
            allRowsCount: allRows.length,
            employeesCount: employees.length,
            departmentsCount: departments.length
          },
          timestamp: Date.now()
        })
      }).catch(() => {})
      // #endregion
    }
    void loadAllRowsForFilterOptions()
    return () => {
      cancelled = true
    }
  }, [selectedReportType, fullFilterOptionsByType, searchTerm, selectedFilters, fetchAllForExport])

  const employeeFilterOptions = useMemo(() => {
    const fullEmployees = selectedReportType ? fullFilterOptionsByType[selectedReportType]?.employees || [] : []
    if (fullEmployees.length > 0) {
      return fullEmployees.map(value => ({ id: value, label: value }))
    }
    return []
  }, [selectedReportType, fullFilterOptionsByType])
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '92864d' },
      body: JSON.stringify({
        sessionId: '92864d',
        runId: 'pre-fix',
        hypothesisId: 'H13',
        location: 'BackofficeExpenseReportsPage.tsx:781',
        message: 'reports-employee-options-ready',
        data: {
          selectedReportType,
          employeeOptionsCount: employeeFilterOptions.length,
          hasFullEmployeeSnapshot: selectedReportType
            ? Boolean((fullFilterOptionsByType[selectedReportType]?.employees || []).length)
            : false
        },
        timestamp: Date.now()
      })
    }).catch(() => {})
    // #endregion
  }, [selectedReportType, employeeFilterOptions.length, fullFilterOptionsByType])
  const departmentFilterOptions = useMemo(() => {
    const structureDepartments = getActiveStructureDepartmentNames(organizationalUnits || []).map(value => ({
      id: value,
      label: value
    }))
    if (structureDepartments.length > 0) {
      return structureDepartments
    }
    const fullDepartments = selectedReportType ? fullFilterOptionsByType[selectedReportType]?.departments || [] : []
    if (fullDepartments.length > 0) {
      return fullDepartments.map(value => ({ id: value, label: value }))
    }
    return Array.from(
      new Set(reportRowsWithGroupedStatuses.map(row => String(row?.departmentName || '').trim()).filter(Boolean))
    )
      .sort((a, b) => a.localeCompare(b))
      .map(value => ({ id: value, label: value }))
  }, [organizationalUnits, reportRowsWithGroupedStatuses, selectedReportType, fullFilterOptionsByType])
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '92864d' },
      body: JSON.stringify({
        sessionId: '92864d',
        runId: 'post-fix',
        hypothesisId: 'H9',
        location: 'BackofficeExpenseReportsPage.tsx:792',
        message: 'reports-department-options-built-from-structure',
        data: {
          selectedReportType,
          organizationalUnitsCount: organizationalUnits.length,
          departmentOptionsCount: departmentFilterOptions.length
        },
        timestamp: Date.now()
      })
    }).catch(() => {})
    // #endregion
  }, [selectedReportType, organizationalUnits.length, departmentFilterOptions.length])
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '92864d' },
      body: JSON.stringify({
        sessionId: '92864d',
        runId: 'pre-fix',
        hypothesisId: 'H3',
        location: 'BackofficeExpenseReportsPage.tsx:736',
        message: 'reports-filter-options-derived-from-rows',
        data: {
          selectedReportType,
          reportRowsCount: reportRowsWithGroupedStatuses.length,
          employeeOptionsCount: employeeFilterOptions.length,
          departmentOptionsCount: departmentFilterOptions.length,
          statusOptionsCount: statusFilterOptions.length,
          pageSize,
          currentPage
        },
        timestamp: Date.now()
      })
    }).catch(() => {})
    // #endregion
  }, [
    selectedReportType,
    reportRowsWithGroupedStatuses.length,
    employeeFilterOptions.length,
    departmentFilterOptions.length,
    statusFilterOptions.length,
    pageSize,
    currentPage
  ])
  const filterConfiguration = useMemo<FilterConfiguration>(
    () => ({
      // Include report type in config id to reset filter sheet internals on tab switch.
      id: `backoffice-expense-reports-filters-${selectedReportType || 'unknown'}`,
      name: 'Report Filters',
      groups: [
        {
          id: 'status-group',
          label: 'Status',
          collapsible: true,
          defaultExpanded: false,
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
        },
        {
          id: 'department-group',
          label: 'Department',
          collapsible: true,
          defaultExpanded: false,
          filters: [
            {
              id: 'departmentName',
              field: 'departmentName',
              label: 'Department',
              type: 'multi-select',
              config: {
                options: departmentFilterOptions,
                searchPlaceholder: 'Search departments...',
                totalCount: departmentFilterOptions.length,
                hasMore: false
              }
            }
          ]
        }
      ]
    }),
    [statusFilterOptions, employeeFilterOptions, departmentFilterOptions, selectedReportType]
  )
  useEffect(() => {
    if (!selectedReportType) return

    const allowedStatusIds = new Set(statusFilterOptions.map(option => String(option.id)))
    const allowedEmployeeIds = new Set(employeeFilterOptions.map(option => String(option.id)))
    const allowedDepartmentIds = new Set(departmentFilterOptions.map(option => String(option.id)))
    const currentFilters = filtersByReportType[selectedReportType] ?? {}
    const selectedStatuses = Array.isArray(currentFilters.status) ? currentFilters.status.map(String) : []
    const selectedEmployees = Array.isArray(currentFilters.employeeName) ? currentFilters.employeeName.map(String) : []
    const selectedDepartments = Array.isArray(currentFilters.departmentName)
      ? currentFilters.departmentName.map(String)
      : []

    const sanitizedStatuses = selectedStatuses.filter(status => allowedStatusIds.has(status))
    const sanitizedEmployees = selectedEmployees.filter(employee => allowedEmployeeIds.has(employee))
    const sanitizedDepartments = selectedDepartments.filter(department => allowedDepartmentIds.has(department))

    const statusesChanged = sanitizedStatuses.length !== selectedStatuses.length
    const employeesChanged = sanitizedEmployees.length !== selectedEmployees.length
    const departmentsChanged = sanitizedDepartments.length !== selectedDepartments.length
    if (!statusesChanged && !employeesChanged && !departmentsChanged) return

    setFiltersByReportType(previous => ({
      ...previous,
      [selectedReportType]: {
        ...currentFilters,
        status: sanitizedStatuses,
        employeeName: sanitizedEmployees,
        departmentName: sanitizedDepartments
      }
    }))
  }, [selectedReportType, statusFilterOptions, employeeFilterOptions, departmentFilterOptions, filtersByReportType])
  const filteredReportRows = useMemo(() => {
    const isBackendFilteringReport =
      selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE ||
      selectedReportType === ReportType.EXPENSE_REQUEST ||
      selectedReportType === ReportType.EXPENSE_PLAN ||
      selectedReportType === ReportType.ADVANCE_PAYMENT
    const selectedStatuses = Array.isArray(selectedFilters?.status) ? selectedFilters.status : []
    const selectedEmployees = Array.isArray(selectedFilters?.employeeName) ? selectedFilters.employeeName : []
    const selectedDepartments = Array.isArray(selectedFilters?.departmentName) ? selectedFilters.departmentName : []
    if (selectedStatuses.length === 0 && selectedEmployees.length === 0 && selectedDepartments.length === 0) {
      return reportRowsWithGroupedStatuses
    }
    const selectedStatusSet = isBackendFilteringReport
      ? new Set<string>()
      : new Set(selectedStatuses.map((status: string) => normalizeStatusFilterValue(status)).filter(Boolean))
    const selectedEmployeeSet = isBackendFilteringReport ? new Set<string>() : new Set(selectedEmployees.map(String))
    const selectedDepartmentSet = isBackendFilteringReport
      ? new Set<string>()
      : new Set(selectedDepartments.map(String))
    return reportRowsWithGroupedStatuses.filter(row => {
      const statusMatch = selectedStatusSet.size === 0 || selectedStatusSet.has(String(row?.status || ''))
      const employeeMatch = selectedEmployeeSet.size === 0 || selectedEmployeeSet.has(String(row?.employeeName || ''))
      const departmentMatch =
        selectedDepartmentSet.size === 0 || selectedDepartmentSet.has(String(row?.departmentName || ''))
      return statusMatch && employeeMatch && departmentMatch
    })
  }, [
    selectedReportType,
    reportRowsWithGroupedStatuses,
    selectedFilters,
    transferRequiredStatusAliases,
    transferRequiredFilterLabel
  ])
  const hasClientSideFilters = useMemo(() => {
    const isBackendFilteringReport =
      selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE ||
      selectedReportType === ReportType.EXPENSE_REQUEST ||
      selectedReportType === ReportType.EXPENSE_PLAN ||
      selectedReportType === ReportType.ADVANCE_PAYMENT
    const selectedStatuses = Array.isArray(selectedFilters?.status) ? selectedFilters.status : []
    const selectedEmployees = Array.isArray(selectedFilters?.employeeName) ? selectedFilters.employeeName : []
    const selectedDepartments = Array.isArray(selectedFilters?.departmentName) ? selectedFilters.departmentName : []
    return (
      !isBackendFilteringReport &&
      (selectedEmployees.length > 0 || selectedStatuses.length > 0 || selectedDepartments.length > 0)
    )
  }, [selectedFilters, selectedReportType])
  const sortableColumns = useMemo(
    () =>
      columns
        .filter(column => backendSortableColumnKeys.has(column.key))
        .map(column => ({
          id: column.key,
          label: typeof column.title === 'string' ? column.title : column.key
        })),
    [columns, backendSortableColumnKeys]
  )
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }
  const handleFilterChange = (filters: Record<string, any>) => {
    if (!selectedReportType) return
    const nextFilters = filters || {}
    const currentFilters = filtersByReportType[selectedReportType] || {}
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '92864d' },
      body: JSON.stringify({
        sessionId: '92864d',
        runId: 'pre-fix',
        hypothesisId: 'H4',
        location: 'BackofficeExpenseReportsPage.tsx:914',
        message: 'reports-filter-change-requested',
        data: {
          selectedReportType,
          currentFilterKeys: Object.keys(currentFilters || {}),
          nextFilterKeys: Object.keys(nextFilters || {}),
          nextStatusCount: Array.isArray(nextFilters?.status) ? nextFilters.status.length : 0,
          nextEmployeeCount: Array.isArray(nextFilters?.employeeName) ? nextFilters.employeeName.length : 0,
          nextDepartmentCount: Array.isArray(nextFilters?.departmentName) ? nextFilters.departmentName.length : 0
        },
        timestamp: Date.now()
      })
    }).catch(() => {})
    // #endregion
    if (JSON.stringify(currentFilters) === JSON.stringify(nextFilters)) return
    setFiltersByReportType(previous => ({
      ...previous,
      [selectedReportType]: nextFilters
    }))
    setCurrentPage(1)
  }
  const handleSortingChange: OnChangeFn<SortingState> = updater => {
    setSorting(previous => (typeof updater === 'function' ? updater(previous) : updater))
    setCurrentPage(1)
  }
  const tablePagination = useMemo(
    () => ({
      pageIndex: Math.max(currentPage - 1, 0),
      pageSize
    }),
    [currentPage, pageSize]
  )
  const handleTablePaginationChange = (pagination: { pageIndex: number; pageSize: number }) => {
    if (pagination.pageSize === pageSize) {
      setCurrentPage(pagination.pageIndex + 1)
      return
    }
    setPageSize(pagination.pageSize)
    setCurrentPage(1)
  }

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

            <div className="gba:mb-4 gba:min-h-[140px]" data-testid="backoffice-expense-reports-kpi-row">
              <TooltipProvider>
                <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-4">
                  {approvalSlaCards.map(card => (
                    <Card key={card.cardTestId} className="gba:min-h-[124px]" data-testid={card.cardTestId}>
                      <CardContent className="gba:p-4">
                        <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                          {card.title}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="gba:inline-flex gba:items-center gba:text-muted-foreground"
                                aria-label={card.triggerLabel}
                                data-testid={card.triggerTestId}
                              >
                                <PiInfo />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="gba:max-w-[320px]">{card.tooltip}</TooltipContent>
                          </Tooltip>
                        </p>
                        <p className="gba:text-xl gba:font-semibold">{card.value}</p>
                        <p className="gba:text-xs gba:text-muted-foreground">{card.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TooltipProvider>
            </div>

            <div>
              <Tabs
                value={tabsValue}
                onValueChange={handleReportTypeChange}
                data-testid="backoffice-expense-reports-tabs-card"
              >
                <TabsList className="gba:grid gba:w-full gba:grid-cols-5">
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

            <div>
              <DataDisplay
                key={`backoffice-reports-datadisplay-${selectedReportType || 'unknown'}`}
                titleSections={[
                  {
                    id: 'results',
                    label: getTranslationFromI18nKeyAndLabel('lowcoder:common.data', 'Data'),
                    metadata: {
                      count: hasClientSideFilters ? filteredReportRows.length : displayTotalCount,
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
                onSortingChange={handleSortingChange}
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
                enableLiveFiltering={true}
                data-testid="backoffice-expense-reports-filters-card"
              >
                <div className="gba:border gba:border-border gba:rounded-md gba:bg-background">
                  <DataTable
                    data={filteredReportRows}
                    columns={dataTableColumns}
                    loading={tableLoading}
                    totalCount={hasClientSideFilters ? filteredReportRows.length : displayTotalCount}
                    pagination={tablePagination}
                    onPaginationChange={handleTablePaginationChange}
                    enablePagination
                    enableSorting
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
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
