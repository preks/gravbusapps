/**
 * Backoffice Expense Report Data hook - global data (no supervisor/manager filter).
 * Adapted from manager useExpenseReportData; removes managerId from all queries.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  GET_EXPENSE_ITEMS_BACKOFFICE,
  GET_EXPENSE_PLANS_BACKOFFICE,
  GET_EXPENSE_REQUESTS_BACKOFFICE,
  GET_ADVANCE_PAYMENTS_REPORT_BACKOFFICE,
  GET_APPROVAL_PAYOUT_CYCLE_BACKOFFICE
} from '../queries/backofficeReportQueries'
import {
  getExpenseRequestStatusDisplay,
  getExpensePlanStatusDisplay,
  getAdvancePaymentStatusDisplay
} from '../../manager-expenses/utils'
import { useBackofficeExpensesOverview } from './useBackofficeExpensesOverview'

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
  [key: string]: any
}

export interface ExpenseItemReport extends ReportItem {
  date: string
  title: string
  description: string
  category: string
  amount: number
  employeeName: string
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
  currency: string
}

export interface AdvancePaymentReport extends ReportItem {
  code: string
  title: string
  requestDate: string
  status: string
  amount: number
  employeeName: string
  paymentMethod?: string
  costCenter?: string
  currency?: string
}

export interface ApprovalPayoutCycleReport extends ReportItem {
  code: string
  title: string
  employeeName: string
  createdAt: string
  pendingAt: string
  approvedAt: string
  paidAt: string
  approvalDays: number | null
  payoutDays: number | null
  totalCycleDays: number | null
  bottleneckStage: string
  status: string
  totalAmount: number
  currency: string
}

export interface UseBackofficeExpenseReportDataReturn {
  reportTypes: ReportMetadata[]
  selectedReportType: ReportType | null
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
}

const buildEmployeeDisplayName = (e: any): string => {
  if (!e) return ''
  const full = (e.fullName || '').trim()
  if (full) return full
  return `${e.firstName || ''} ${e.lastName || ''}`.trim()
}

const FORMER_EMPLOYEE_LABEL = 'Former employee'

const GET_EMPLOYEE_POSITIONS_BY_IDENTIFIERS = `
  query GetEmployeePositionsByIdentifiers($where: EmployeePositionBoolExp!) {
    EmployeePosition(where: $where) {
      id
      userId
      employeeId
      firstName
      lastName
    }
  }
`

const GET_EMPLOYEES_BY_IDS = `
  query GetEmployeesByIds($ids: [uuid!]) {
    Employee(where: { id: { _in: $ids }, isDeleted: { _eq: false } }) {
      id
      fullName
      firstName
      lastName
      displayName
    }
  }
`

const getSettledAdvancePaidAmount = (advancePayments: any[]): number => {
  return (Array.isArray(advancePayments) ? advancePayments : [])
    .filter((payment: any) => ['PAID', 'CLOSED', 'TRANSFERRED'].includes(String(payment?.status || '').toUpperCase()))
    .reduce((sum: number, payment: any) => sum + Number(payment?.amount || 0), 0)
}

const parseDateOrNull = (value: unknown): Date | null => {
  if (!value) return null
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

const isPaidLikeStatus = (value: unknown): boolean =>
  ['PAID', 'CLOSED', 'TRANSFERRED', 'VERIFIED', 'BOOKED'].includes(String(value || '').toUpperCase())

const toUpperText = (value: unknown): string => String(value || '').toUpperCase()

const hasStatusTransition = (text: string, statuses: string[]): boolean => {
  const normalized = toUpperText(text)
  return statuses.some(status => {
    if (!status) return false
    return (
      normalized.includes(`TO: ${status}`) ||
      normalized.includes(`TO ${status}`) ||
      normalized.includes(`STATUS: ${status}`) ||
      normalized.includes(`STATUS ${status}`) ||
      normalized.includes(status)
    )
  })
}

const pickEarliest = (values: Array<unknown>): string => {
  const sorted = values
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .map(v => ({ raw: v, date: parseDateOrNull(v) }))
    .filter(v => v.date)
    .sort((a, b) => a.date!.getTime() - b.date!.getTime())
  return sorted[0]?.raw || ''
}

const daysDiff = (from: string, to: string): number | null => {
  const a = parseDateOrNull(from)
  const b = parseDateOrNull(to)
  if (!a || !b) return null
  return Number(((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)).toFixed(2))
}

export const useBackofficeExpenseReportData = ({
  accessToken,
  userInfo
}: BusinessAppContextProps): UseBackofficeExpenseReportDataReturn => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [reportData, setReportData] = useState<ReportItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(ReportType.EXPENSE_ITEM)
  const employeeNameCacheRef = useRef<Record<string, string>>({})
  const overview = useBackofficeExpensesOverview(
    { accessToken, userInfo },
    {
      currencyRef: undefined,
      searchTerm,
      requests: { limit: pageSize, offset: (currentPage - 1) * pageSize },
      plans: { limit: pageSize, offset: (currentPage - 1) * pageSize },
      payments: { limit: pageSize, offset: (currentPage - 1) * pageSize }
    }
  )

  const resolveEmployeeNamesByIds = useCallback(
    async (employeeIds: string[]) => {
      if (!graphqlClient || employeeIds.length === 0) return employeeNameCacheRef.current

      const uniqueIds = Array.from(new Set(employeeIds.filter(Boolean)))
      const unresolvedIds = uniqueIds.filter(id => !employeeNameCacheRef.current[id])
      if (unresolvedIds.length === 0) return employeeNameCacheRef.current

      const chunkSize = 50
      for (let i = 0; i < unresolvedIds.length; i += chunkSize) {
        const batchIds = unresolvedIds.slice(i, i + chunkSize)
        try {
          const where = {
            _or: batchIds.flatMap(id => [{ id: { _eq: id } }, { userId: { _eq: id } }, { employeeId: { _eq: id } }])
          }
          const result = await graphqlClient.request(GET_EMPLOYEE_POSITIONS_BY_IDENTIFIERS, { where })
          const rows = Array.isArray(result?.EmployeePosition) ? result.EmployeePosition : []

          rows.forEach((row: any) => {
            const displayName = `${row?.firstName || ''} ${row?.lastName || ''}`.trim()
            if (!displayName) return
            if (row?.id) employeeNameCacheRef.current[String(row.id)] = displayName
            if (row?.userId) employeeNameCacheRef.current[String(row.userId)] = displayName
            if (row?.employeeId) employeeNameCacheRef.current[String(row.employeeId)] = displayName
          })
        } catch {
          // Keep unresolved identifiers empty; UI should not display UUID fallback.
        }
      }

      const unresolvedAfterPositions = unresolvedIds.filter(id => !employeeNameCacheRef.current[id])
      if (unresolvedAfterPositions.length > 0) {
        for (let i = 0; i < unresolvedAfterPositions.length; i += chunkSize) {
          const batchIds = unresolvedAfterPositions.slice(i, i + chunkSize)
          try {
            const result = await graphqlClient.request(GET_EMPLOYEES_BY_IDS, { ids: batchIds })
            const rows = Array.isArray(result?.Employee) ? result.Employee : []
            rows.forEach((employee: any) => {
              const displayName =
                String(employee?.fullName || '').trim() ||
                `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() ||
                String(employee?.displayName || '').trim()
              if (!displayName) return
              if (employee?.id) employeeNameCacheRef.current[String(employee.id)] = displayName
            })
          } catch {
            // Keep unresolved IDs as fallback label.
          }
        }
      }

      return employeeNameCacheRef.current
    },
    [graphqlClient]
  )

  const resolveDisplayName = useCallback(
    (candidates: Array<string | undefined | null>, employeeNameById: Record<string, string>) => {
      for (const id of candidates) {
        const key = String(id || '')
        if (!key) continue
        const resolved = employeeNameById[key]
        if (resolved) return resolved
      }
      return FORMER_EMPLOYEE_LABEL
    },
    []
  )

  const mapRequestsFromOverview = useCallback(
    (rows: any[], employeeNameById: Record<string, string>): ExpenseRequestReport[] => {
      return (rows || []).map((request: any) => {
        const statusDisplay = request.status
          ? getExpenseRequestStatusDisplay(request.status)
          : { label: '', type: 'draft' }
        return {
          id: request.id,
          code: request.code || '',
          planCode: request.expensePlan?.code || '',
          title: request.title || '',
          requestDate: request.requestDate || '',
          startDate: request.startDate || '',
          endDate: request.endDate || '',
          createdAt: request.createdAt || '',
          status: statusDisplay.label,
          totalAmount: Number(request.totalAmount || 0),
          advancePaidAmount: getSettledAdvancePaidAmount(request?.expensePlan?.advancePayment),
          remainingAmount: Math.max(
            Number(request.totalAmount || 0) - getSettledAdvancePaidAmount(request?.expensePlan?.advancePayment),
            0
          ),
          currency: request.currencyRef ? String(request.currencyRef).split(':').pop() || 'EUR' : 'EUR',
          employeeName:
            buildEmployeeDisplayName(request.employee) ||
            resolveDisplayName([request.employeeId, request.createdBy], employeeNameById)
        } as ExpenseRequestReport
      })
    },
    [resolveDisplayName]
  )

  const mapPlansFromOverview = useCallback(
    (rows: any[], employeeNameById: Record<string, string>): ExpensePlanReport[] => {
      return (rows || []).map((plan: any) => {
        const statusDisplay = plan.status ? getExpensePlanStatusDisplay(plan.status) : { label: '', type: 'draft' }
        return {
          id: plan.id,
          code: plan.code || '',
          title: plan.title || '',
          startDate: plan.startDate || '',
          endDate: plan.endDate || '',
          status: statusDisplay.label,
          totalAmount: Number(plan.totalAmount || 0),
          advancePaidAmount: getSettledAdvancePaidAmount(plan?.advancePayment),
          remainingAmount: Math.max(
            Number(plan.totalAmount || 0) - getSettledAdvancePaidAmount(plan?.advancePayment),
            0
          ),
          currency: plan.currencyRef ? String(plan.currencyRef).split(':').pop() || 'EUR' : 'EUR',
          employeeName:
            buildEmployeeDisplayName(plan.employee) ||
            resolveDisplayName([plan.employeeId, plan.createdBy], employeeNameById),
          expenseRequestCode:
            Array.isArray(plan.expenseRequest) && plan.expenseRequest.length > 0
              ? plan.expenseRequest[0].code || ''
              : '',
          createdAt: plan.createdAt || ''
        } as ExpensePlanReport
      })
    },
    [resolveDisplayName]
  )

  const mapPaymentsFromOverview = useCallback(
    (rows: any[], employeeNameById: Record<string, string>): AdvancePaymentReport[] => {
      return (rows || []).map((p: any) => {
        const statusDisplay = p.status ? getAdvancePaymentStatusDisplay(p.status) : { label: '', type: 'draft' }
        return {
          id: p.id,
          code: p.expensePlan?.code || p.code || '',
          title: p.expensePlan?.title || '',
          requestDate: p.createdAt || '',
          status: statusDisplay.label,
          amount: Number(p.amount || 0),
          employeeName:
            buildEmployeeDisplayName(p.expensePlan?.employee) ||
            buildEmployeeDisplayName(p.employee) ||
            resolveDisplayName([p.expensePlan?.employeeId, p.createdBy], employeeNameById),
          paymentMethod: p.paymentMethod || undefined,
          costCenter: p.costCenter?.name || p.costCenter?.code || undefined,
          currency: p.currencyRef ? String(p.currencyRef).split(':').pop() || 'EUR' : 'EUR'
        } as AdvancePaymentReport
      })
    },
    [resolveDisplayName]
  )

  useEffect(() => {
    if (
      !selectedReportType ||
      selectedReportType === ReportType.EXPENSE_ITEM ||
      selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE
    ) {
      return
    }

    setIsLoading(overview.isLoading)
    if (overview.error) {
      setError(overview.error)
      return
    }
    if (overview.isLoading) return

    let cancelled = false
    const loadRows = async () => {
      switch (selectedReportType) {
        case ReportType.EXPENSE_REQUEST: {
          const rows = overview.data?.expenseRequests || []
          const ids = rows
            .flatMap((request: any) => [String(request?.employeeId || ''), String(request?.createdBy || '')])
            .filter(Boolean)
          const employeeNameById = await resolveEmployeeNamesByIds(ids)
          if (cancelled) return
          setReportData(mapRequestsFromOverview(rows, employeeNameById))
          setTotalCount(overview.data?.expenseRequestsTotal || 0)
          setError(null)
          break
        }
        case ReportType.EXPENSE_PLAN: {
          const rows = overview.data?.expensePlans || []
          const ids = rows
            .flatMap((plan: any) => [String(plan?.employeeId || ''), String(plan?.createdBy || '')])
            .filter(Boolean)
          const employeeNameById = await resolveEmployeeNamesByIds(ids)
          if (cancelled) return
          setReportData(mapPlansFromOverview(rows, employeeNameById))
          setTotalCount(overview.data?.expensePlansTotal || 0)
          setError(null)
          break
        }
        case ReportType.ADVANCE_PAYMENT: {
          const rows = overview.data?.advancePayments || []
          const ids = rows
            .flatMap((payment: any) => [
              String(payment?.expensePlan?.employeeId || ''),
              String(payment?.createdBy || ''),
              String(payment?.expensePlan?.createdBy || '')
            ])
            .filter(Boolean)
          const employeeNameById = await resolveEmployeeNamesByIds(ids)
          if (cancelled) return
          setReportData(mapPaymentsFromOverview(rows, employeeNameById))
          setTotalCount(overview.data?.advancePaymentsTotal || 0)
          setError(null)
          break
        }
      }
    }

    void loadRows()
    return () => {
      cancelled = true
    }
  }, [
    selectedReportType,
    overview.data,
    overview.isLoading,
    overview.error,
    resolveEmployeeNamesByIds,
    mapRequestsFromOverview,
    mapPlansFromOverview,
    mapPaymentsFromOverview
  ])

  const buildExpenseRequestWhere = useCallback((search: string) => {
    const where: any = {
      isDeleted: { _eq: false },
      status: { _nin: ['CREATED', 'DISCARDED'] }
    }
    if (search?.trim()) {
      const searchPattern = `%${search.trim()}%`
      where._or = [
        { code: { _ilike: searchPattern } },
        { title: { _ilike: searchPattern } },
        { status: { _ilike: searchPattern } }
      ]
    }
    return where
  }, [])

  const processExpenseItemsData = (data: any, employeeNameById: Record<string, string> = {}): ExpenseItemReport[] => {
    if (!data?.ExpenseItem?.length) return []
    return data.ExpenseItem.map((item: any) => {
      const expenseGroup =
        item.expensePosition && item.expensePosition.length > 0 && item.expensePosition[0].expenseGroupRef
          ? item.expensePosition[0].expenseGroupRef.replaceAll('ExpenseGroup:v1:', '')
          : 'Uncategorized'
      const statusDisplay = item.expenseRequest?.status
        ? getExpenseRequestStatusDisplay(item.expenseRequest.status)
        : { label: '', type: 'draft' }
      return {
        id: item.id,
        code: item.expenseRequest?.code || '',
        currency: item.expenseRequest?.currencyRef
          ? String(item.expenseRequest.currencyRef).split(':').pop() || 'EUR'
          : 'EUR',
        date:
          item.expenseRequest?.requestTypeRef === 'ExpenseRequestType:v1:TRIP'
            ? item.expenseRequest?.startDate || ''
            : item.expenseDate || '',
        title: item.title || '',
        description: item.description || '',
        category: expenseGroup,
        amount: item.totalAmount || 0,
        employeeName:
          buildEmployeeDisplayName(item.employee) ||
          employeeNameById[item.employeeId] ||
          employeeNameById[item.createdBy] ||
          FORMER_EMPLOYEE_LABEL,
        status: statusDisplay.label
      }
    })
  }

  const processExpensePlansData = (data: any, employeeNameById: Record<string, string> = {}): ExpensePlanReport[] => {
    if (!data?.ExpensePlan?.length) return []
    return data.ExpensePlan.map((plan: any) => {
      const statusDisplay = plan.status ? getExpensePlanStatusDisplay(plan.status) : { label: '', type: 'draft' }
      return {
        id: plan.id,
        code: plan.code || '',
        title: plan.title || '',
        startDate: plan.startDate || '',
        endDate: plan.endDate || '',
        status: statusDisplay.label,
        totalAmount: plan.totalAmount || 0,
        currency: plan.currencyRef ? String(plan.currencyRef).split(':').pop() || 'EUR' : 'EUR',
        employeeName: resolveDisplayName([plan.employeeId, plan.createdBy], employeeNameById),
        expenseRequestCode:
          Array.isArray(plan.expenseRequest) && plan.expenseRequest.length > 0 ? plan.expenseRequest[0].code || '' : '',
        createdAt: plan.createdAt || ''
      }
    })
  }

  const processExpenseRequestsData = (
    data: any,
    employeeNameById: Record<string, string> = {}
  ): ExpenseRequestReport[] => {
    if (!data?.ExpenseRequest?.length) return []
    return data.ExpenseRequest.map((request: any) => {
      const statusDisplay = request.status
        ? getExpenseRequestStatusDisplay(request.status)
        : { label: '', type: 'draft' }
      return {
        id: request.id,
        code: request.code || '',
        planCode: request.expensePlan?.code || '',
        title: request.title || '',
        requestDate: request.requestDate || '',
        startDate: request.startDate || '',
        endDate: request.endDate || '',
        createdAt: request.createdAt || '',
        status: statusDisplay.label,
        totalAmount: Number(request.totalAmount || 0),
        advancePaidAmount: getSettledAdvancePaidAmount(request?.expensePlan?.advancePayment),
        remainingAmount: Math.max(
          Number(request.totalAmount || 0) - getSettledAdvancePaidAmount(request?.expensePlan?.advancePayment),
          0
        ),
        currency: request.currencyRef ? String(request.currencyRef).split(':').pop() || 'EUR' : 'EUR',
        employeeName: resolveDisplayName([request.employeeId, request.createdBy], employeeNameById)
      }
    })
  }

  const processApprovalPayoutCycleData = (
    data: any,
    employeeNameById: Record<string, string> = {}
  ): ApprovalPayoutCycleReport[] => {
    const rows = Array.isArray(data?.ExpenseRequest) ? data.ExpenseRequest : []
    return rows.map((request: any) => {
      const comments = Array.isArray(request?.expenseRequestComment) ? request.expenseRequestComment : []
      const paymentRows = Array.isArray(request?.expensePlan?.advancePayment) ? request.expensePlan.advancePayment : []
      const paymentComments = paymentRows.flatMap((p: any) =>
        Array.isArray(p?.advancePaymentComment) ? p.advancePaymentComment : []
      )

      const pendingFromComments = comments
        .filter((c: any) => {
          const text = String(c?.comment || '')
          const type = toUpperText(c?.commentType)
          return (
            type === 'SYSTEM_COMMENT' &&
            (hasStatusTransition(text, ['PENDING']) || toUpperText(text).includes('SUBMIT'))
          )
        })
        .map((c: any) => c?.commentDate)
      const pendingAt = pickEarliest([...pendingFromComments, request?.createdAt])

      const approvedFromComments = comments
        .filter((c: any) => {
          const text = String(c?.comment || '')
          const type = toUpperText(c?.commentType)
          return (
            type === 'APPROVE_COMMENT' || hasStatusTransition(text, ['APPROVED', 'VERIFIED', 'BOOKED', 'TRANSFERRED'])
          )
        })
        .map((c: any) => c?.commentDate)
      const approvedAt = pickEarliest([...approvedFromComments, request?.decisionDate, request?.updatedAt, pendingAt])

      const paidFromPayments = paymentRows
        .filter((p: any) => isPaidLikeStatus(p?.status))
        .map((p: any) => p?.transactionDate || p?.decisionDate || p?.createdAt)
      const paidFromComments = paymentComments
        .filter((c: any) => {
          const text = String(c?.comment || '')
          return (
            hasStatusTransition(text, ['PAID', 'TRANSFERRED', 'VERIFIED', 'BOOKED']) ||
            toUpperText(text).includes('PAY')
          )
        })
        .map((c: any) => c?.commentDate)
      const paidAt =
        pickEarliest([...paidFromPayments, ...paidFromComments]) ||
        (isPaidLikeStatus(request?.status) ? pickEarliest([request?.updatedAt, request?.decisionDate, approvedAt]) : '')

      const approvalDays = daysDiff(pendingAt, approvedAt)
      const payoutDays = daysDiff(approvedAt, paidAt)
      const totalCycleDays = daysDiff(pendingAt, paidAt)

      const bottleneckStage = paidAt
        ? (approvalDays || 0) >= (payoutDays || 0)
          ? 'Approval'
          : 'Payout'
        : approvedAt
          ? 'Payout'
          : 'Approval'

      const statusDisplay = request?.status
        ? getExpenseRequestStatusDisplay(request.status)
        : { label: '', type: 'draft' }
      return {
        id: request.id,
        code: request.code || '',
        title: request.title || '',
        employeeName: resolveDisplayName([request.employeeId, request.createdBy], employeeNameById),
        createdAt: request.createdAt || '',
        pendingAt,
        approvedAt,
        paidAt,
        approvalDays,
        payoutDays,
        totalCycleDays,
        bottleneckStage,
        status: statusDisplay.label,
        totalAmount: Number(request.totalAmount || 0),
        currency: request.currencyRef ? String(request.currencyRef).split(':').pop() || 'EUR' : 'EUR'
      } as ApprovalPayoutCycleReport
    })
  }

  const fetchExpenseItems = useCallback(async () => {
    if (!graphqlClient) return
    try {
      setIsLoading(true)
      setError(null)
      const result = await graphqlClient.request(GET_EXPENSE_ITEMS_BACKOFFICE, {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        searchTerm: searchTerm ? `%${searchTerm}%` : '%%'
      })
      const employeeIds = (result?.ExpenseItem || [])
        .flatMap((item: any) => [String(item?.employeeId || ''), String(item?.createdBy || '')])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      const processedData = processExpenseItemsData(result, employeeNameById)
      setReportData(processedData)
      setTotalCount(result?.ExpenseItemAggregate?.aggregate?.count || 0)
    } catch {
      setError('Failed to load expense items data')
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, pageSize, currentPage, searchTerm, resolveEmployeeNamesByIds])

  const fetchApprovalPayoutCycle = useCallback(async () => {
    if (!graphqlClient) return
    try {
      setIsLoading(true)
      setError(null)
      const where = buildExpenseRequestWhere(searchTerm)
      const result = await graphqlClient.request(GET_APPROVAL_PAYOUT_CYCLE_BACKOFFICE, {
        where,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        orderBy: [{ createdAt: 'DESC' }]
      })
      const employeeIds = (result?.ExpenseRequest || [])
        .flatMap((request: any) => [String(request?.employeeId || ''), String(request?.createdBy || '')])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      setReportData(processApprovalPayoutCycleData(result, employeeNameById))
      setTotalCount(result?.ExpenseRequestAggregate?.aggregate?.count || 0)
    } catch {
      setError('Failed to load approval and payout cycle data')
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, pageSize, currentPage, searchTerm, buildExpenseRequestWhere, resolveEmployeeNamesByIds])

  const mapAdvancePaymentToReport = useCallback(
    (p: any, employeeNameById: Record<string, string>): AdvancePaymentReport => {
      const statusDisplay = p.status ? getAdvancePaymentStatusDisplay(p.status) : { label: '', type: 'draft' }
      const currencyCode = p?.currencyRef ? String(p.currencyRef).split(':').pop() || 'EUR' : 'EUR'
      return {
        id: p.id,
        code: p.expensePlan?.code || p.code || '',
        title: p.expensePlan?.title || '',
        requestDate: p.createdAt || '',
        status: statusDisplay.label,
        amount: p.amount || 0,
        employeeName: resolveDisplayName([p.expensePlan?.employeeId, p.createdBy], employeeNameById),
        paymentMethod: p.paymentMethod || undefined,
        costCenter: p.costCenter?.name || p.costCenter?.code || undefined,
        currency: currencyCode
      }
    },
    [resolveDisplayName]
  )

  const fetchBatchedData = useCallback(
    async <T extends ReportItem>(
      fetchFn: (offset: number, limit: number) => Promise<T[]>,
      errorContext: string
    ): Promise<T[]> => {
      const batchLimit = 1000
      const all: T[] = []
      let offset = 0
      try {
        while (true) {
          const processed = await fetchFn(offset, batchLimit)
          all.push(...processed)
          if (!Array.isArray(processed) || processed.length < batchLimit) break
          offset += batchLimit
        }
      } catch {
        setError(`Partial export: some ${errorContext} could not be fetched`)
      }
      return all
    },
    []
  )

  const fetchExpenseItemsForExport = useCallback(
    async (offset: number, limit: number) => {
      const result = await graphqlClient.request(GET_EXPENSE_ITEMS_BACKOFFICE, {
        limit,
        offset,
        searchTerm: searchTerm ? `%${searchTerm}%` : '%%'
      })
      const employeeIds = (result?.ExpenseItem || [])
        .flatMap((item: any) => [String(item?.employeeId || ''), String(item?.createdBy || '')])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      return processExpenseItemsData(result, employeeNameById)
    },
    [graphqlClient, searchTerm, resolveEmployeeNamesByIds]
  )

  const fetchExpensePlansForExport = useCallback(
    async (offset: number, limit: number) => {
      const result = await graphqlClient.request(GET_EXPENSE_PLANS_BACKOFFICE, {
        limit,
        offset,
        searchTerm: searchTerm ? `%${searchTerm}%` : '%%'
      })
      const employeeIds = (result?.ExpensePlan || [])
        .flatMap((plan: any) => [String(plan?.employeeId || ''), String(plan?.createdBy || '')])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      return processExpensePlansData(result, employeeNameById)
    },
    [graphqlClient, searchTerm, resolveEmployeeNamesByIds]
  )

  const fetchExpenseRequestsForExport = useCallback(
    async (offset: number, limit: number) => {
      const where = buildExpenseRequestWhere(searchTerm)
      const result = await graphqlClient.request(GET_EXPENSE_REQUESTS_BACKOFFICE, {
        where,
        limit,
        offset,
        orderBy: [{ createdAt: 'DESC' }]
      })
      const employeeIds = (result?.ExpenseRequest || [])
        .flatMap((request: any) => [String(request?.employeeId || ''), String(request?.createdBy || '')])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      return processExpenseRequestsData(result, employeeNameById)
    },
    [graphqlClient, searchTerm, buildExpenseRequestWhere, resolveEmployeeNamesByIds]
  )

  const fetchAdvancePaymentsForExport = useCallback(
    async (offset: number, limit: number) => {
      const result = await graphqlClient.request(GET_ADVANCE_PAYMENTS_REPORT_BACKOFFICE, {
        limit,
        offset,
        searchTerm: searchTerm ? `%${searchTerm}%` : '%%'
      })
      const employeeIds = (result?.AdvancePayment || [])
        .flatMap((payment: any) => [
          String(payment?.expensePlan?.employeeId || ''),
          String(payment?.createdBy || ''),
          String(payment?.expensePlan?.createdBy || '')
        ])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      return (result?.AdvancePayment || []).map((payment: any) => mapAdvancePaymentToReport(payment, employeeNameById))
    },
    [graphqlClient, searchTerm, mapAdvancePaymentToReport, resolveEmployeeNamesByIds]
  )

  const fetchApprovalPayoutCycleForExport = useCallback(
    async (offset: number, limit: number) => {
      const where = buildExpenseRequestWhere(searchTerm)
      const result = await graphqlClient.request(GET_APPROVAL_PAYOUT_CYCLE_BACKOFFICE, {
        where,
        limit,
        offset,
        orderBy: [{ createdAt: 'DESC' }]
      })
      const employeeIds = (result?.ExpenseRequest || [])
        .flatMap((request: any) => [String(request?.employeeId || ''), String(request?.createdBy || '')])
        .filter(Boolean)
      const employeeNameById = await resolveEmployeeNamesByIds(employeeIds)
      return processApprovalPayoutCycleData(result, employeeNameById)
    },
    [graphqlClient, searchTerm, buildExpenseRequestWhere, resolveEmployeeNamesByIds]
  )

  const fetchAllForExport = useCallback(async (): Promise<ReportItem[]> => {
    if (!graphqlClient || !selectedReportType) return []
    try {
      switch (selectedReportType) {
        case ReportType.EXPENSE_ITEM:
          return await fetchBatchedData(fetchExpenseItemsForExport, 'items')
        case ReportType.EXPENSE_PLAN:
          return await fetchBatchedData(fetchExpensePlansForExport, 'plans')
        case ReportType.EXPENSE_REQUEST:
          return await fetchBatchedData(fetchExpenseRequestsForExport, 'requests')
        case ReportType.ADVANCE_PAYMENT:
          return await fetchBatchedData(fetchAdvancePaymentsForExport, 'advance payments')
        case ReportType.APPROVAL_PAYOUT_CYCLE:
          return await fetchBatchedData(fetchApprovalPayoutCycleForExport, 'approval and payout cycle')
        default:
          return []
      }
    } catch {
      setError('Failed to export report data')
      return []
    }
  }, [
    graphqlClient,
    selectedReportType,
    fetchBatchedData,
    fetchExpenseItemsForExport,
    fetchExpensePlansForExport,
    fetchExpenseRequestsForExport,
    fetchAdvancePaymentsForExport,
    fetchApprovalPayoutCycleForExport
  ])

  const fetchReportData = useCallback(async () => {
    if (!selectedReportType) return
    switch (selectedReportType) {
      case ReportType.EXPENSE_ITEM:
        await fetchExpenseItems()
        break
      case ReportType.APPROVAL_PAYOUT_CYCLE:
        await fetchApprovalPayoutCycle()
        break
      default:
        break
    }
  }, [selectedReportType, fetchExpenseItems, fetchApprovalPayoutCycle])

  const lastFetchSignatureRef = useRef<string | null>(null)
  useEffect(() => {
    const signature = JSON.stringify({
      selectedReportType,
      currentPage,
      pageSize,
      searchTerm
    })
    if (lastFetchSignatureRef.current === signature) return
    lastFetchSignatureRef.current = signature
    void fetchReportData()
  }, [selectedReportType, currentPage, pageSize, searchTerm, fetchReportData])

  const reportTypes: ReportMetadata[] = [
    {
      id: 'report-1',
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.expense_item_report',
        'Expense Item Report'
      ),
      type: ReportType.EXPENSE_ITEM,
      selected: selectedReportType === ReportType.EXPENSE_ITEM
    },
    {
      id: 'report-2',
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.expense_plan_report',
        'Expense Plan Report'
      ),
      type: ReportType.EXPENSE_PLAN,
      selected: selectedReportType === ReportType.EXPENSE_PLAN
    },
    {
      id: 'report-3',
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.expense_request_report',
        'Expense Request Report'
      ),
      type: ReportType.EXPENSE_REQUEST,
      selected: selectedReportType === ReportType.EXPENSE_REQUEST
    },
    {
      id: 'report-4',
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:advance_payment_report.search_module',
        'Advance Payment Report'
      ),
      type: ReportType.ADVANCE_PAYMENT,
      selected: selectedReportType === ReportType.ADVANCE_PAYMENT
    },
    {
      id: 'report-5',
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.approval_payout_cycle',
        'Approval & Payout Cycle'
      ),
      type: ReportType.APPROVAL_PAYOUT_CYCLE,
      selected: selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE
    }
  ]

  return {
    reportTypes,
    selectedReportType,
    setSelectedReportType,
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
    fetchReportData,
    fetchAllForExport
  }
}
