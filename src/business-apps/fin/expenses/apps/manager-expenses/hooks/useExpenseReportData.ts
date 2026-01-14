import { useState, useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EXPENSE_PLANS_BY_MANAGER } from '../queries/expensePlans'
import { GET_EXPENSE_REQUESTS_BY_MANAGER } from '../queries/expenseRequests'
import { GET_EXPENSE_ITEMS_BY_MANAGER } from '../queries/expenseItems'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { GET_ADVANCE_PAYMENTS_REPORT_BY_MANAGER } from '../queries/advancePayments'
import { getExpenseRequestStatusDisplay, getExpensePlanStatusDisplay, getAdvancePaymentStatusDisplay } from '../utils'
import { useManagerExpensesOverview } from './useManagerExpensesOverview'

// Define report types
export enum ReportType {
  EXPENSE_ITEM = 'expense_item',
  EXPENSE_PLAN = 'expense_plan',
  EXPENSE_REQUEST = 'expense_request',
  ADVANCE_PAYMENT = 'advance_payment'
}

// Define report metadata
export interface ReportMetadata {
  id: string
  name: string
  type: ReportType
  description?: string
  selected?: boolean
}

// Define base report item interface
export interface ReportItem {
  id: string
  [key: string]: any
}

// Define expense item interface
/**
 * Flattened row used by the Expense Item report export/table.
 * Values are already formatted to simple scalars suited for CSV/UI.
 */
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

// Define expense plan interface
/** Row model for the Expense Plan report */
export interface ExpensePlanReport extends ReportItem {
  code: string
  title: string
  startDate: string
  endDate: string
  status: string
  totalAmount: number
  employeeName: string
  expenseRequestCode?: string
  currency: string
  createdAt?: string
}

// Define expense request interface
/** Row model for the Expense Request report */
export interface ExpenseRequestReport extends ReportItem {
  code: string
  planCode?: string
  title: string
  requestDate: string
  createdAt: string
  status: string
  totalAmount: number
  employeeName: string
  currency: string
}

// Define advance payment interface
/** Row model for the Advance Payment report */
export interface AdvancePaymentReport extends ReportItem {
  code: string // plan code
  title: string // plan title
  requestDate: string // createdAt of the payment
  status: string
  amount: number // advance amount
  employeeName: string
  paymentMethod?: string
  costCenter?: string
  currency?: string
}

// Define hook return interface
export interface UseExpenseReportDataReturn {
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

/**
 * Hook for fetching and managing expense report data
 */
export const useExpenseReportData = ({
  accessToken,
  userInfo
}: BusinessAppContextProps): UseExpenseReportDataReturn => {
  // Initialize GraphQL client
  const graphqlClient = useGraphQLClient(accessToken)

  // Get managerId from userInfo or use a fallback UUID for development
  const managerId = userInfo?.employeeDetails?.employeeId || userInfo?.id || '00000000-0000-0000-0000-000000000000'

  // State for report data, loading state, and errors
  const [reportData, setReportData] = useState<ReportItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)

  // State for pagination and filtering
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [searchTerm, setSearchTerm] = useState<string>('')

  // State for selected report type
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(ReportType.EXPENSE_ITEM)

  // Shared helper to build a human-readable employee name
  const buildEmployeeDisplayName = (e: any): string => {
    if (!e) return ''
    const full = (e.fullName || '').trim()
    if (full) return full
    const first = e.firstName || ''
    const last = e.lastName || ''
    return `${first} ${last}`.trim()
  }

  // Define report types
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
    }
  ]

  // Consolidated overview for requests, plans, and advance payments
  // We request all three lists with current paging; selection decides which to map
  const overview = useManagerExpensesOverview(
    { accessToken, userInfo },
    {
      managerId,
      currencyRef: undefined,
      searchTerm,
      requests: { limit: pageSize, offset: (currentPage - 1) * pageSize },
      plans: { limit: pageSize, offset: (currentPage - 1) * pageSize },
      payments: { limit: pageSize, offset: (currentPage - 1) * pageSize }
    }
  )

  // Map overview lists to report row shapes
  const mapRequestsFromOverview = useCallback((rows: any[]): ExpenseRequestReport[] => {
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
        createdAt: request.createdAt || '',
        status: statusDisplay.label,
        totalAmount: Number(request.totalAmount || 0),
        currency: request.currencyRef ? String(request.currencyRef).split(':').pop() || 'EUR' : 'EUR',
        employeeName: buildEmployeeDisplayName(request.employee)
      } as ExpenseRequestReport
    })
  }, [])

  const mapPlansFromOverview = useCallback((rows: any[]): ExpensePlanReport[] => {
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
        currency: plan.currencyRef ? String(plan.currencyRef).split(':').pop() || 'EUR' : 'EUR',
        employeeName: buildEmployeeDisplayName(plan.employee),
        expenseRequestCode:
          Array.isArray(plan.expenseRequest) && plan.expenseRequest.length > 0 ? plan.expenseRequest[0].code || '' : '',
        createdAt: plan.createdAt || ''
      } as ExpensePlanReport
    })
  }, [])

  const mapPaymentsFromOverview = useCallback((rows: any[]): AdvancePaymentReport[] => {
    return (rows || []).map((p: any) => {
      const statusDisplay = p.status ? getAdvancePaymentStatusDisplay(p.status) : { label: '', type: 'draft' }
      return {
        id: p.id,
        code: p.expensePlan?.code || p.code || '',
        title: p.expensePlan?.title || '',
        requestDate: p.createdAt || '',
        status: statusDisplay.label,
        amount: Number(p.amount || 0),
        employeeName: buildEmployeeDisplayName(p.expensePlan?.employee) || buildEmployeeDisplayName(p.employee),
        paymentMethod: p.paymentMethod || undefined,
        costCenter: p.costCenter?.name || p.costCenter?.code || undefined,
        currency: p.currencyRef ? String(p.currencyRef).split(':').pop() || 'EUR' : 'EUR'
      } as AdvancePaymentReport
    })
  }, [])

  // Sync state with overview when not using the EXPENSE_ITEM report type
  useEffect(() => {
    if (!selectedReportType || selectedReportType === ReportType.EXPENSE_ITEM) return
    setIsLoading(overview.isLoading)
    if (overview.error) {
      setError(overview.error)
      return
    }
    if (!overview.isLoading) {
      switch (selectedReportType) {
        case ReportType.EXPENSE_REQUEST: {
          const rows = mapRequestsFromOverview(overview.data?.expenseRequests || [])
          setReportData(rows)
          setTotalCount(overview.data?.expenseRequestsTotal || 0)
          setError(null)
          break
        }
        case ReportType.EXPENSE_PLAN: {
          const rows = mapPlansFromOverview(overview.data?.expensePlans || [])
          setReportData(rows)
          setTotalCount(overview.data?.expensePlansTotal || 0)
          setError(null)
          break
        }
        case ReportType.ADVANCE_PAYMENT: {
          const rows = mapPaymentsFromOverview(overview.data?.advancePayments || [])
          setReportData(rows)
          setTotalCount(overview.data?.advancePaymentsTotal || 0)
          setError(null)
          break
        }
      }
    }
  }, [
    selectedReportType,
    overview.data,
    overview.isLoading,
    overview.error,
    mapRequestsFromOverview,
    mapPlansFromOverview,
    mapPaymentsFromOverview
  ])

  /**
   * Build the Hasura where clause for ExpenseRequest queries.
   * Duplicated in multiple places previously; centralised here to keep
   * filtering in perfect sync between the table view and CSV export.
   */
  const buildExpenseRequestWhere = useCallback((managerIdInput: string, search: string) => {
    const where: any = {
      employee: { employeePosition: { supervisorEmployeeId: { _eq: managerIdInput } } },
      isDeleted: { _eq: false }
    }

    if (search?.trim()) {
      const searchPattern = `%${search.trim()}%`
      where._or = [
        { code: { _ilike: searchPattern } },
        { title: { _ilike: searchPattern } },
        { status: { _ilike: searchPattern } },
        { employee: { fullName: { _ilike: searchPattern } } },
        { employee: { firstName: { _ilike: searchPattern } } },
        { employee: { lastName: { _ilike: searchPattern } } },
        { expensePlan: { code: { _ilike: searchPattern } } },
        { expensePlan: { title: { _ilike: searchPattern } } }
      ]
    }
    return where
  }, [])

  // Process expense items data
  const processExpenseItemsData = (data: any): ExpenseItemReport[] => {
    if (!data?.ExpenseItem?.length) return []

    return data.ExpenseItem.map((item: any) => {
      // Get the first expense group from positions or use 'Uncategorized'
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
        // Keep raw date; UI/export formats via ensureShortDateFormat
        // Correct date: EXPENSES → item.expenseDate; TRIP → expenseRequest.startDate
        date:
          item.expenseRequest?.requestTypeRef === 'ExpenseRequestType:v1:TRIP'
            ? item.expenseRequest?.startDate || ''
            : item.expenseDate || '',
        title: item.title || '',
        description: item.description || '',
        category: expenseGroup,
        amount: item.totalAmount || 0,
        employeeName: buildEmployeeDisplayName(item.employee),
        status: statusDisplay.label
      }
    })
  }

  // Process expense plans data
  const processExpensePlansData = (data: any): ExpensePlanReport[] => {
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
        employeeName: buildEmployeeDisplayName(plan.employee),
        expenseRequestCode:
          Array.isArray(plan.expenseRequest) && plan.expenseRequest.length > 0 ? plan.expenseRequest[0].code || '' : '',
        createdAt: plan.createdAt || ''
      }
    })
  }

  // Process expense requests data
  const processExpenseRequestsData = (data: any): ExpenseRequestReport[] => {
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
        createdAt: request.createdAt || '',
        status: statusDisplay.label,
        totalAmount: request.totalAmount || 0,
        currency: request.currencyRef ? String(request.currencyRef).split(':').pop() || 'EUR' : 'EUR',
        employeeName: buildEmployeeDisplayName(request.employee)
      }
    })
  }

  // Fetch expense items report
  const fetchExpenseItems = useCallback(async () => {
    if (!graphqlClient) return

    try {
      setIsLoading(true)
      setError(null)

      // Use the real manager ID from userInfo
      const result = await graphqlClient.request(GET_EXPENSE_ITEMS_BY_MANAGER, {
        managerId: managerId, // Use real manager ID from userInfo
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        searchTerm: searchTerm ? `%${searchTerm}%` : '%%'
      })

      const processedData = processExpenseItemsData(result)
      setReportData(processedData)
      setTotalCount(result?.ExpenseItemAggregate?.aggregate?.count || 0)
    } catch {
      setError('Failed to load expense items data')
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, pageSize, currentPage, searchTerm, managerId])

  // (legacy list fetchers for plans/requests/payments removed; overview handles lists)

  const mapAdvancePaymentToReport = useCallback((p: any): AdvancePaymentReport => {
    const statusDisplay = p.status ? getAdvancePaymentStatusDisplay(p.status) : { label: '', type: 'draft' }
    const currencyCode = p?.currencyRef ? String(p.currencyRef).split(':').pop() || 'EUR' : 'EUR'

    return {
      id: p.id,
      code: p.expensePlan?.code || p.code || '',
      title: p.expensePlan?.title || '',
      requestDate: p.createdAt || '',
      status: statusDisplay.label,
      amount: p.amount || 0,
      employeeName: buildEmployeeDisplayName(p.expensePlan?.employee) || buildEmployeeDisplayName(p.employee),
      paymentMethod: p.paymentMethod || undefined,
      costCenter: p.costCenter?.name || p.costCenter?.code || undefined,
      currency: currencyCode
    }
  }, [])

  // Helper function to fetch data in batches with pagination
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

  // Fetch expense items for export
  const fetchExpenseItemsForExport = useCallback(
    async (offset: number, limit: number) => {
      const result = await graphqlClient.request(GET_EXPENSE_ITEMS_BY_MANAGER, {
        managerId,
        limit,
        offset,
        searchTerm: searchTerm ? `%${searchTerm}%` : '%%'
      })
      return processExpenseItemsData(result)
    },
    [graphqlClient, managerId, searchTerm]
  )

  // Fetch expense plans for export
  const fetchExpensePlansForExport = useCallback(
    async (offset: number, limit: number) => {
      const result = await graphqlClient.request(GET_EXPENSE_PLANS_BY_MANAGER, {
        managerId,
        limit,
        offset,
        searchTerm: searchTerm ? `%${searchTerm}%` : '%%'
      })
      return processExpensePlansData(result)
    },
    [graphqlClient, managerId, searchTerm]
  )

  // Fetch expense requests for export
  const fetchExpenseRequestsForExport = useCallback(
    async (offset: number, limit: number) => {
      const where = buildExpenseRequestWhere(managerId, searchTerm)
      const result = await graphqlClient.request(GET_EXPENSE_REQUESTS_BY_MANAGER, {
        where,
        limit,
        offset,
        orderBy: [{ requestDate: 'DESC' }]
      })
      return processExpenseRequestsData(result)
    },
    [graphqlClient, managerId, searchTerm, buildExpenseRequestWhere]
  )

  // Fetch advance payments for export
  const fetchAdvancePaymentsForExport = useCallback(
    async (offset: number, limit: number) => {
      const result = await graphqlClient.request(GET_ADVANCE_PAYMENTS_REPORT_BY_MANAGER, {
        managerId,
        limit,
        offset,
        searchTerm: searchTerm ? `%${searchTerm}%` : '%%'
      })
      return (result?.AdvancePayment || []).map(mapAdvancePaymentToReport)
    },
    [graphqlClient, managerId, searchTerm, mapAdvancePaymentToReport]
  )

  // Fetch all rows for export (bypassing pagination) for the currently selected report and filters
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
    fetchAdvancePaymentsForExport
  ])

  // Main function to fetch report data based on selected type
  const fetchReportData = useCallback(async () => {
    if (!selectedReportType) return
    // For items, use legacy fetchers; for others, overview effect will sync state
    if (selectedReportType === ReportType.EXPENSE_ITEM) {
      await fetchExpenseItems()
    }
  }, [selectedReportType, fetchExpenseItems])

  // StrictMode-safe: run once per parameter signature
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
