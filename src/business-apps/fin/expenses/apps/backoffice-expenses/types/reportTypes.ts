import type { SlaKpiCounts } from '../hooks/backofficeReportUtils'

export enum ReportType {
  EXPENSE_ITEM = 'expense_item',
  EXPENSE_PLAN = 'expense_plan',
  EXPENSE_REQUEST = 'expense_request',
  ADVANCE_PAYMENT = 'advance_payment',
  APPROVAL_PAYOUT_CYCLE = 'approval_payout_cycle'
}

export interface ReportMetadata {
  id: string
  name: string
  type: ReportType
  description?: string
  selected?: boolean
}

export interface ReportItem {
  id: string
  [key: string]: string | number | boolean | null | undefined
}

export interface ExpenseItemReport extends ReportItem {
  date: string
  title: string
  description: string
  category: string
  amount: number
  employeeName: string
  departmentName?: string
  status: string
  code?: string
  currency?: string
}

export interface ExpensePlanReport extends ReportItem {
  code: string
  title: string
  startDate: string
  endDate: string
  status: string
  totalAmount: number
  advancePaidAmount: number
  remainingAmount: number
  employeeName: string
  departmentName?: string
  expenseRequestCode?: string
  currency: string
  createdAt?: string
}

export interface ExpenseRequestReport extends ReportItem {
  code: string
  planCode?: string
  title: string
  requestDate: string
  startDate: string
  endDate: string
  createdAt: string
  status: string
  totalAmount: number
  advancePaidAmount: number
  remainingAmount: number
  employeeName: string
  departmentName?: string
  currency: string
}

export interface AdvancePaymentReport extends ReportItem {
  code: string
  title: string
  requestDate: string
  status: string
  amount: number
  employeeName: string
  departmentName?: string
  paymentMethod?: string
  costCenter?: string
  currency?: string
}

export interface ApprovalPayoutCycleReport extends ReportItem {
  code: string
  title: string
  employeeName: string
  departmentName?: string
  createdAt: string
  pendingAt: string
  approvedAt: string
  paidAt: string
  approvalDays: number | null
  payoutDays: number | null
  totalCycleDays: number | null
  approvalSlaLimitDays: number
  payoutSlaLimitDays: number | null
  totalCycleSlaLimitDays: number
  approvalSlaStatus: string
  payoutSlaStatus: string
  totalCycleSlaStatus: string
  bottleneckStage: string
  status: string
  totalAmount: number
  currency: string
}

export interface UseBackofficeExpenseReportDataReturn {
  reportTypes: ReportMetadata[]
  selectedReportType: ReportType | null
  reportDataType: ReportType | null
  setSelectedReportType: (type: ReportType) => void
  reportData: ReportItem[]
  isLoading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  setCurrentPage: (page: number) => void
  pageSize: number
  setPageSize: (size: number) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  fetchReportData: () => Promise<void>
  fetchAllForExport: () => Promise<ReportItem[]>
  fetchAllForFilterOptions: () => Promise<ReportItem[]>
  slaKpiCounts: SlaKpiCounts | null
}

export type ExportFilterOverrides = {
  searchTerm?: string
  statusFilters?: string[]
  employeeFilters?: string[]
  departmentFilters?: string[]
}
