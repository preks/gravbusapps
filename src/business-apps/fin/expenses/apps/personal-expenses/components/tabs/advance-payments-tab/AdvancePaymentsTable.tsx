import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Card,
  CardContent,
  Sheet,
  SheetContent
} from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { message } from 'antd'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { startProcess } from '@/common/utils/start-process'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetAdvancePayments, AdvancePayment } from '../../../hooks/useGetAdvancePayments'
import { useAdvancePaymentCurrencies } from '../../../hooks/useAdvancePaymentCurrencies'
import { getAdvancePaymentStatusDisplay, formatCurrencyDisplay } from '../../../utils'
import AdvancePaymentDetails from './AdvancePaymentDetails'
import ExpensePlanDetails from '../expense-plans-tab/ExpensePlanDetails'
import ExpenseRequestDetails from '../expense-requests-tab/ExpenseRequestDetails'
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils'
import { ArrowUpIcon, ArrowDownIcon } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import ExpenseDetailsShell from '../../../../../common/components/details-panel/ExpenseDetailsShell'
import TablePagination, { PaginationChangeParams } from '../../../../../components/TablePagination'
import { GenerateDocumentDialog } from '@/business-apps/platform/apps/document-apps/components'
import { DocumentApiService } from '@/business-apps/platform/apps/document-apps/services/DocumentApiService'
import { exportToWord } from '@/business-apps/platform/apps/document-apps/utils/exportUtils'
import { toast } from 'sonner'

const DATA_TEST_ID_PREFIX = 'AdvancePaymentsTable'
const DEFAULT_STATUS_FILTER = ['PREPARED', 'PENDING']

export interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string
  onSearchChange?: (search: string) => void
  activeFilter?: string[]
  onFilterChange?: (filter: string[]) => void
  onClearFilters?: () => void
  filterGroups?: any[]
  handleFilterChange?: (filterId: string, selected: boolean) => void
  filterLabelMap?: Record<string, string>
  amountRange?: { min?: number; max?: number } | null
  advanceRange?: { min?: number; max?: number } | null
  selectedFilters?: string[]
  removeFilter?: (filterId: string) => void
  tableRefreshTrigger?: number
}

const AdvancePaymentsTable = React.forwardRef<HTMLDivElement, AdvancePaymentsTableProps>((props, ref) => {
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo
    }),
    [props.accessToken, props.userInfo]
  )

  const { items, isLoading, totalCount, fetchItems } = useGetAdvancePayments(contextProps)
  const {
    currencyStats,
    selectedCurrencyRef,
    isReady: isCurrencyReady
  } = useAdvancePaymentCurrencies(contextProps, props.selectedFilters || [], props.onFilterChange as any)
  const [searchText, setSearchText] = useState<string>(props.search ?? '')
  const [selectedItem, setSelectedItem] = useState<AdvancePayment | null>(null)
  const [selectedExpensePlan, setSelectedExpensePlan] = useState<any>(null)
  const [selectedExpenseRequest, setSelectedExpenseRequest] = useState<any>(null)
  const [generateDocOpen, setGenerateDocOpen] = useState(false)
  const [generateDocRecord, setGenerateDocRecord] = useState<AdvancePayment | null>(null)

  // State for approver and supervisor data
  const [approverData, setApproverData] = useState<{
    expensePlanApprover?: string
    advancePaymentApprover?: string
    expensePlanApprovalDate?: string
    advancePaymentApprovalDate?: string
  }>({})
  const [supervisorName, setSupervisorName] = useState<string | undefined>(undefined)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const savedPageBeforeSearchRef = useRef<number | null>(null)
  const currentPageRef = useRef<number>(1)
  // Deterministic scroll target for pagination (top of table)
  const tableTopRef = useRef<HTMLDivElement | null>(null)

  const [sortField, setSortField] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend')

  const currentStatusFilter = useMemo(() => props.activeFilter || [], [props.activeFilter])
  const currentAmountRange = useMemo(() => props.amountRange || null, [props.amountRange])
  const currentAdvanceRange = useMemo(() => props.advanceRange || null, [props.advanceRange])
  const filterGroups = useMemo(() => props.filterGroups || [], [props.filterGroups])
  const filterLabelMap = useMemo(() => props.filterLabelMap || {}, [props.filterLabelMap])

  // Add debounced versions for filter debouncing (200ms debounce for responsive feel)
  const debouncedStatusFilter = useDebounce(currentStatusFilter, 200)
  const debouncedAmountRange = useDebounce(currentAmountRange, 200)
  const debouncedAdvanceRange = useDebounce(currentAdvanceRange, 200)
  const debouncedSearchText = useDebounce(searchText, 200)

  // Set access token for DocumentApiService once when component mounts or token changes
  useEffect(() => {
    if (contextProps.accessToken) {
      DocumentApiService.setAccessToken(contextProps.accessToken)
    }
  }, [contextProps.accessToken])

  // Initialize GraphQL client
  const graphqlClient = useGraphQLClient(contextProps.accessToken)

  // Helper: Fetch approval comment from GraphQL
  const fetchApprovalComment = useCallback(
    async (
      entityId: string,
      entityType: 'ExpensePlan' | 'AdvancePayment'
    ): Promise<{
      approver?: string
      date?: string
    }> => {
      const commentEntity = `${entityType}Comment`
      const idField = entityType === 'ExpensePlan' ? 'expensePlanId' : 'advancePaymentId'

      try {
        // Try APPROVE_COMMENT first
        const approveQuery = `
          query Get${commentEntity}Approval($entityId: uuid!) {
            ${commentEntity}(
              where: { 
                ${idField}: { _eq: $entityId }
                commentType: { _eq: "APPROVE_COMMENT" }
              }
              orderBy: { commentDate: DESC }
              limit: 1
            ) {
              authorEmployee {
                fullName
                firstName
                lastName
              }
              commentDate
            }
          }
        `
        const approveResult = await graphqlClient.request<{
          [key: string]: Array<{
            authorEmployee: { fullName?: string; firstName?: string; lastName?: string }
            commentDate?: string
          }>
        }>(approveQuery, { entityId })

        let comment = approveResult?.[commentEntity]?.[0]

        // Fallback to SYSTEM_COMMENT only for ExpensePlan
        if (!comment && entityType === 'ExpensePlan') {
          const systemQuery = `
            query Get${commentEntity}System($entityId: uuid!) {
              ${commentEntity}(
                where: { 
                  ${idField}: { _eq: $entityId }
                  commentType: { _eq: "SYSTEM_COMMENT" }
                  comment: { _ilike: "%to: APPROVED%" }
                }
                orderBy: { commentDate: DESC }
                limit: 1
              ) {
                authorEmployee {
                  fullName
                  firstName
                  lastName
                }
                commentDate
              }
            }
          `
          const systemResult = await graphqlClient.request<{
            [key: string]: Array<{
              authorEmployee: { fullName?: string; firstName?: string; lastName?: string }
              commentDate?: string
            }>
          }>(systemQuery, { entityId })

          comment = systemResult?.[commentEntity]?.[0]
        }

        if (comment) {
          const author = comment.authorEmployee
          const approver = author
            ? author.fullName || `${author.firstName || ''} ${author.lastName || ''}`.trim()
            : undefined
          return { approver, date: comment.commentDate }
        }
      } catch (error) {
        console.error(`Error fetching ${entityType} approval:`, error)
      }

      return {}
    },
    [graphqlClient]
  )

  // Fetch approver and supervisor data when generate dialog opens
  useEffect(() => {
    if (!generateDocOpen || !generateDocRecord || !contextProps.accessToken) {
      setApproverData({})
      setSupervisorName(undefined)
      return
    }

    const fetchApprovalData = async () => {
      try {
        const plan = generateDocRecord.expensePlan
        const planId = plan?.id
        const advPaymentId = generateDocRecord.id
        const employeeId = plan?.employee?.id

        // Fetch expense plan approval
        const expensePlanApproval = planId ? await fetchApprovalComment(planId, 'ExpensePlan') : {}

        // Fetch advance payment approval (only APPROVE_COMMENT, no SYSTEM_COMMENT fallback)
        let advancePaymentApproval = advPaymentId ? await fetchApprovalComment(advPaymentId, 'AdvancePayment') : {}

        // If advance payment has no explicit approval, use expense plan approval
        if (!advancePaymentApproval.approver) {
          advancePaymentApproval = expensePlanApproval
        }

        setApproverData({
          expensePlanApprover: expensePlanApproval.approver,
          advancePaymentApprover: advancePaymentApproval.approver,
          expensePlanApprovalDate: expensePlanApproval.date,
          advancePaymentApprovalDate: advancePaymentApproval.date
        })

        // Fetch supervisor name
        if (employeeId) {
          const employeeQuery = `
            query GetEmployeeSupervisor($employeeId: uuid!) {
              Employee(where: { id: { _eq: $employeeId } }) {
                employeePosition {
                  supervisorEmployeeId
                }
              }
            }
          `
          const employeeResult = await graphqlClient.request<{
            Employee: Array<{ employeePosition?: { supervisorEmployeeId?: string } }>
          }>(employeeQuery, { employeeId })

          const supervisorId = employeeResult?.Employee?.[0]?.employeePosition?.supervisorEmployeeId
          if (supervisorId) {
            const supervisorQuery = `
              query GetSupervisor($supervisorId: uuid!) {
                Employee(where: { id: { _eq: $supervisorId } }) {
                  fullName
                  firstName
                  lastName
                }
              }
            `
            const supervisorResult = await graphqlClient.request<{
              Employee: Array<{ fullName?: string; firstName?: string; lastName?: string }>
            }>(supervisorQuery, { supervisorId })

            const supervisor = supervisorResult?.Employee?.[0]
            if (supervisor) {
              const name = supervisor.fullName || `${supervisor.firstName || ''} ${supervisor.lastName || ''}`.trim()
              setSupervisorName(name)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching approval data:', error)
        // Gracefully handle errors - leave fields empty
        setApproverData({})
        setSupervisorName(undefined)
      }
    }

    fetchApprovalData()
  }, [generateDocOpen, generateDocRecord, contextProps.accessToken, graphqlClient])

  const currencyLabelMap = useMemo(() => {
    const map: Record<string, string> = {}
    currencyStats.forEach(cs => {
      map[`currency:${cs.ref}`] = cs.code
    })
    return map
  }, [currencyStats])

  const entityDataMapForDoc = useMemo((): Record<string, Record<string, unknown>> => {
    if (!generateDocRecord) return {}
    const plan = generateDocRecord.expensePlan
    const currencyCode =
      generateDocRecord.currency?.code ??
      (typeof generateDocRecord.currencyRef === 'string' && generateDocRecord.currencyRef
        ? generateDocRecord.currencyRef.replace(/^.*:([A-Za-z]{2,4})$/, '$1').toUpperCase()
        : '')

    const map: Record<string, Record<string, unknown>> = {
      adv_payment: {
        ...(generateDocRecord as unknown as Record<string, unknown>),
        currencyCode,
        approvedBy: approverData.advancePaymentApprover || '',
        approvalDate: approverData.advancePaymentApprovalDate || ''
      }
    }

    if (plan) {
      map.expense_plan = {
        ...(plan as unknown as Record<string, unknown>),
        approvedBy: approverData.expensePlanApprover || '',
        approvalDate: approverData.expensePlanApprovalDate || ''
      }

      const emp = plan.employee
      if (emp) {
        const pos = emp.employeePosition
        map.employee_position = {
          firstName: emp.firstName ?? '',
          lastName: emp.lastName ?? '',
          fullName: emp.fullName ?? `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim(),
          jobPosition: pos?.jobPosition ? { name: pos.jobPosition.name ?? '' } : { name: '' },
          organizationalUnit: pos?.organizationalUnit ? { name: pos.organizationalUnit.name ?? '' } : { name: '' },
          supervisorName: supervisorName || ''
        }
      }
      const trips = plan.expenseRequestTrip ?? []
      const destinationTrip = trips.find((t: { pointType?: string | null }) => t?.pointType === 'DESTINATION_POINT')
      const tripForDoc = destinationTrip ?? trips[0]
      const travelRegionValue =
        tripForDoc?.travelRegion && typeof tripForDoc.travelRegion === 'object' && 'value' in tripForDoc.travelRegion
          ? (tripForDoc.travelRegion as { value?: string }).value
          : undefined
      const countryValue =
        tripForDoc?.country && typeof tripForDoc.country === 'object' && 'value' in tripForDoc.country
          ? (tripForDoc.country as { value?: string }).value
          : undefined
      const countryRef = tripForDoc?.countryRef ?? ''
      const countryCode =
        countryValue ??
        (typeof countryRef === 'string' && countryRef
          ? countryRef.replace(/^.*:([A-Za-z]{2,4})$/, '$1').toUpperCase()
          : '')
      map.expense_request_trip = {
        address: tripForDoc?.address ?? '',
        pointType: tripForDoc?.pointType ?? '',
        countryRef,
        countryCode,
        tripDateTime: tripForDoc?.tripDateTime ?? '',
        tripOrder: tripForDoc?.tripOrder ?? '',
        tripDirection: tripForDoc?.tripDirection ?? '',
        travelRegion: travelRegionValue != null ? { value: travelRegionValue } : { value: '' },
        country: countryValue != null ? { value: countryValue } : { value: '' },
        destinationCountry: destinationTrip ? (countryValue ?? '') : '',
        destinationAddress: destinationTrip ? (tripForDoc?.address ?? '') : ''
      }
    }
    return map
  }, [generateDocRecord, approverData, supervisorName])

  const prevFilterSignatureRef = useRef<string | null>(null)

  const hasActiveFilters = useMemo(() => {
    const hasSearch = (debouncedSearchText || '').trim() !== ''
    const hasAmountRange =
      debouncedAmountRange && (debouncedAmountRange.min !== undefined || debouncedAmountRange.max !== undefined)
    const hasAdvanceRange =
      debouncedAdvanceRange && (debouncedAdvanceRange.min !== undefined || debouncedAdvanceRange.max !== undefined)

    const hasNonDefaultStatusFilter = (() => {
      const statuses = debouncedStatusFilter || []
      if (statuses.length === 0) return false
      if (statuses.length !== DEFAULT_STATUS_FILTER.length) return true
      return !DEFAULT_STATUS_FILTER.every(status => statuses.includes(status))
    })()

    return hasSearch || hasNonDefaultStatusFilter || !!hasAmountRange || !!hasAdvanceRange
  }, [debouncedSearchText, debouncedStatusFilter, debouncedAmountRange, debouncedAdvanceRange])

  useEffect(() => {
    const signature = JSON.stringify({
      status: currentStatusFilter,
      amountRange: currentAmountRange,
      advanceRange: currentAdvanceRange,
      selectedFilters: props.selectedFilters || []
    })

    const previous = prevFilterSignatureRef.current
    if (previous !== null && previous !== signature) {
      setCurrentPage(1)
    }

    prevFilterSignatureRef.current = signature
  }, [currentStatusFilter, currentAmountRange, currentAdvanceRange, props.selectedFilters])

  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  const prevDebouncedSearchRef = useRef<string>('')

  useEffect(() => {
    const trimmedDebounced = (debouncedSearchText || '').trim()
    const trimmedPrev = (prevDebouncedSearchRef.current || '').trim()

    if (trimmedPrev === trimmedDebounced) {
      prevDebouncedSearchRef.current = debouncedSearchText
      return
    }

    if (trimmedPrev === '' && trimmedDebounced !== '') {
      savedPageBeforeSearchRef.current ??= currentPageRef.current
      setCurrentPage(1)
    } else if (trimmedPrev !== '' && trimmedDebounced === '') {
      setCurrentPage(savedPageBeforeSearchRef.current || 1)
      savedPageBeforeSearchRef.current = null
    } else if (trimmedDebounced !== '' && trimmedPrev !== trimmedDebounced) {
      setCurrentPage(1)
    }

    prevDebouncedSearchRef.current = debouncedSearchText
  }, [debouncedSearchText])

  const fetchParams = useMemo(
    () => ({
      searchText: debouncedSearchText,
      currentPage,
      pageSize,
      currentStatusFilter: debouncedStatusFilter,
      currentAmountRange: debouncedAmountRange,
      currentAdvanceRange: debouncedAdvanceRange,
      sortField,
      sortOrder,
      selectedCurrencyRef
    }),
    [
      debouncedSearchText,
      currentPage,
      pageSize,
      debouncedStatusFilter,
      debouncedAmountRange,
      debouncedAdvanceRange,
      sortField,
      sortOrder,
      selectedCurrencyRef
    ]
  )

  useEffect(() => {
    if (props.search !== undefined && props.search !== searchText) {
      setSearchText(props.search)
    }
  }, [props.search, searchText])

  useEffect(() => {
    const hasAccessToken = !!contextProps.accessToken
    const hasEmployeeId = !!contextProps.userInfo?.employeeDetails?.employeeId
    if (hasAccessToken && hasEmployeeId && isCurrencyReady) {
      fetchItems({
        searchTerm: fetchParams.searchText,
        page: fetchParams.currentPage,
        pageSize: fetchParams.pageSize,
        statusFilter: fetchParams.currentStatusFilter,
        amountRange: fetchParams.currentAmountRange,
        advanceRange: fetchParams.currentAdvanceRange,
        sortField: fetchParams.sortField,
        sortOrder: fetchParams.sortOrder,
        currencyRef: fetchParams.selectedCurrencyRef
      })
    } else if (!hasAccessToken || !hasEmployeeId) {
      console.warn('Cannot fetch advance payments: Missing accessToken or employeeId')
    }
  }, [
    contextProps.accessToken,
    contextProps.userInfo?.employeeDetails?.employeeId,
    fetchItems,
    fetchParams,
    isCurrencyReady
  ])

  useEffect(() => {
    if (props.tableRefreshTrigger && props.tableRefreshTrigger > 0) {
      if (contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
        fetchItems({
          searchTerm: fetchParams.searchText,
          page: fetchParams.currentPage,
          pageSize: fetchParams.pageSize,
          statusFilter: fetchParams.currentStatusFilter,
          amountRange: fetchParams.currentAmountRange,
          advanceRange: fetchParams.currentAdvanceRange,
          sortField: fetchParams.sortField,
          sortOrder: fetchParams.sortOrder,
          currencyRef: fetchParams.selectedCurrencyRef,
          force: true // Force refresh to bypass cache
        })
      }
    }
  }, [
    props.tableRefreshTrigger,
    contextProps.accessToken,
    contextProps.userInfo?.employeeDetails?.employeeId,
    fetchItems,
    fetchParams
  ])

  // Create a memoized setSearch function to prevent re-renders
  // Note: Pagination reset is handled by the debounced search effect to prevent race conditions
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchText(value)

      // Notify parent component of search change
      if (props.onSearchChange) {
        props.onSearchChange(value)
      }
    },
    [props.onSearchChange]
  )

  // Handle adding a new advance payment
  const handleAddAdvancePayment = useCallback(() => {
    const employeeId = contextProps.userInfo?.employeeDetails?.employeeId
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.')
      message.warning('User information not loaded yet. Please wait a moment and try again.')
      return
    }

    startProcess({
      domain: 'employee-expense',
      processName: 'changeAdvancePayment',
      payload: {
        employeeId: employeeId
      },
      builderType: 'NATIVE_SCREEN'
    })
  }, [contextProps.userInfo?.employeeDetails?.employeeId])

  // Handle clicking on a row to view details
  const handleSelectItem = useCallback((item: AdvancePayment) => {
    setSelectedItem(item)
  }, [])

  const handlePaginationChange = useCallback((pagination: PaginationChangeParams) => {
    setCurrentPage(pagination.current)
    setPageSize(pagination.pageSize)
  }, [])

  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null)
    setSelectedExpensePlan(null)
    setSelectedExpenseRequest(null)
  }, [])

  // Handle viewing expense plan details
  const handleViewExpensePlanDetails = useCallback((record: AdvancePayment) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
      expensePlanId: record.expensePlan && record.expensePlan.id ? record.expensePlan.id : '',
      referrer: '/platform/fin/expenses/personal-expenses?tab=advance-payments'
    })
    navigateTo(url)
  }, [])

  // Handle viewing expense request details
  const handleViewExpenseRequestDetails = useCallback((record: AdvancePayment) => {
    // For advance payments, we need to get the expense request from the expense plan
    const firstRequestId = record.expensePlan?.expenseRequest?.[0]?.id ?? ''
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
      expenseRequestId: firstRequestId,
      referrer: '/platform/fin/expenses/personal-expenses?tab=advance-payments'
    })
    navigateTo(url)
  }, [])

  // Enhanced server-side sorting handler
  const handleSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        // Cycle through: ascend -> descend -> clear
        if (sortOrder === 'ascend') {
          setSortOrder('descend')
        } else if (sortOrder === 'descend') {
          setSortField('')
          setSortOrder(undefined)
        } else {
          setSortOrder('ascend')
        }
      } else {
        setSortField(field)
        setSortOrder('ascend')
      }
      // Reset to first page when sorting changes
      setCurrentPage(1)
    },
    [sortField, sortOrder]
  )

  // Helper function to render sort icon
  const renderSortIcon = useCallback(
    (field: string) => {
      if (sortField !== field) return null
      if (sortOrder === 'ascend') return <ArrowUpIcon className="gba:ml-1 gba:h-3 gba:w-3" />
      if (sortOrder === 'descend') return <ArrowDownIcon className="gba:ml-1 gba:h-3 gba:w-3" />
      return null
    },
    [sortField, sortOrder]
  )

  // Render the data body with memoization
  const renderDataBody = useCallback(() => {
    return (
      <div ref={tableTopRef} data-testid={`${DATA_TEST_ID_PREFIX}-scroll-anchor`}>
        <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
          <CardContent className="gba:p-0">
            <div className="gba:overflow-x-auto">
              <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
                <TableHeader>
                  <TableRow className="gba:border-b gba:bg-gray-50">
                    <TableHead
                      className="gba:w-[50px] gba:min-w-[50px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-3"
                      data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                    />
                    <TableHead
                      className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-expense-plan-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:create_expense_request.initial_expense_plan_select_label',
                          'Expense Plan'
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-plan-number-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_request_list.expense_request_filter.plan_number_input',
                          'Plan Number'
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:expense_table.status', 'Status')}
                        {renderSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:text-right"
                      data-testid={`${DATA_TEST_ID_PREFIX}-amount-header`}
                    >
                      <div className="gba:flex gba:items-center gba:justify-end">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_plan_list.expense_plan_table.amount',
                          'Amount'
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100 gba:text-right"
                      onClick={() => handleSort('amount')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-advance-header`}
                    >
                      <div className="gba:flex gba:items-center gba:justify-end">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:manager_expense_request_list.expense_table.advance',
                          'Advance'
                        )}
                        {renderSortIcon('amount')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100"
                      onClick={() => handleSort('paymentMethod')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-payment-method-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:create_expense_request.add_request_trip_details.payment_method',
                          'Payment Method'
                        )}
                        {renderSortIcon('paymentMethod')}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isLoading && totalCount === 0 && (!items || items.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={7} className="gba:py-8 gba:text-center">
                        <div className="gba:text-gray-500">
                          {hasActiveFilters
                            ? getTranslationFromI18nKeyAndLabel(
                                'lowcoder:team_expenses_page.dashboard_tab.no_data_found',
                                'No data available'
                              )
                            : getTranslationFromI18nKeyAndLabel(
                                'lowcoder:personal_expenses.no_advance_payments_found',
                                'No advance payments found. Create your first advance payment to get started.'
                              )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items?.map(record => (
                      <TableRow
                        key={record.id}
                        className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors gba:cursor-pointer ${selectedItem?.id === record.id ? 'gba:bg-blue-50' : ''}`}
                        onClick={() => handleSelectItem(record)}
                        data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                      >
                        <TableCell
                          className="gba:py-4 gba:px-3"
                          data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${record.id}`}
                        >
                          <div className="gba:flex gba:justify-start gba:gap-2" onClick={e => e.stopPropagation()}>
                            <AppActionButton
                              data-testid={`${DATA_TEST_ID_PREFIX}-action-button-${record.id}`}
                              size="icon"
                              staticFlowData={[
                                {
                                  category: getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:employee_list.flows_button.navigations',
                                    'Navigations'
                                  ),
                                  key: 'view-advance-payment',
                                  label: getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:personal_expenses.view_advance_payment_details',
                                    'View Advance Payment Details'
                                  ),
                                  onClick: (e?: React.MouseEvent) => {
                                    e?.stopPropagation()
                                    handleSelectItem(record)
                                  }
                                },
                                ...(record.expensePlanId
                                  ? [
                                      {
                                        category: getTranslationFromI18nKeyAndLabel(
                                          'lowcoder:employee_list.flows_button.navigations',
                                          'Navigations'
                                        ),
                                        key: 'view-plan-details',
                                        label: getTranslationFromI18nKeyAndLabel(
                                          'lowcoder:expense_plan_list.expense_plan_flows.view_plan_details',
                                          'View Plan Details'
                                        ),
                                        onClick: (e?: React.MouseEvent) => {
                                          e?.stopPropagation()
                                          handleViewExpensePlanDetails(record)
                                        }
                                      }
                                    ]
                                  : []),
                                ...(record.expensePlan?.expenseRequest &&
                                (record.expensePlan?.expenseRequest as unknown as any[]).length > 0 &&
                                (record.expensePlan?.expenseRequest as unknown as any[])[0].id !== null
                                  ? [
                                      {
                                        category: getTranslationFromI18nKeyAndLabel(
                                          'lowcoder:employee_list.flows_button.navigations',
                                          'Navigations'
                                        ),
                                        key: 'view-request-details',
                                        label: getTranslationFromI18nKeyAndLabel(
                                          'lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details',
                                          'View Request Details'
                                        ),
                                        onClick: (e?: React.MouseEvent) => {
                                          e?.stopPropagation()
                                          handleViewExpenseRequestDetails(record)
                                        }
                                      }
                                    ]
                                  : []),
                                {
                                  category: getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:employee_list.flows_button.navigations',
                                    'Navigations'
                                  ),
                                  key: 'generate-document',
                                  label: getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:hr_insights.generate_document',
                                    'Generate document'
                                  ),
                                  onClick: (e?: React.MouseEvent) => {
                                    e?.stopPropagation()
                                    setGenerateDocRecord(record)
                                    setGenerateDocOpen(true)
                                  }
                                }
                              ]}
                              accessToken={contextProps.accessToken}
                              emptyStateBehavior="enable"
                              deferMainContextRequestsUntilClick={true}
                            />
                          </div>
                        </TableCell>
                        <TableCell
                          className="gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-expense-plan-cell-${record.id}`}
                        >
                          <div className="gba:font-medium gba:text-sm" data-testid="advance-payment-expense-plan-cell">
                            {record.expensePlan?.title ??
                              getTranslationFromI18nKeyAndLabel(
                                'lowcoder:personal_expenses.no_expense_plan',
                                'No expense plan'
                              )}
                          </div>
                        </TableCell>
                        <TableCell
                          className="gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-plan-number-cell-${record.id}`}
                        >
                          <div className="gba:font-medium gba:text-sm" data-testid="advance-payment-plan-number-cell">
                            {record.expensePlan?.code ?? 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell
                          className="gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-status-cell-${record.id}`}
                        >
                          {(() => {
                            const statusConfig = getAdvancePaymentStatusDisplay(record.status)
                            return (
                              <Badge
                                variant={(statusConfig as any).badgeVariant || 'outline'}
                                data-testid="advance-payment-status-cell"
                              >
                                {statusConfig.label}
                              </Badge>
                            )
                          })()}
                        </TableCell>
                        <TableCell
                          className="gba:py-4 gba:px-6 gba:text-right"
                          data-testid={`${DATA_TEST_ID_PREFIX}-amount-cell-${record.id}`}
                        >
                          <div className="gba:text-sm gba:font-medium" data-testid="advance-payment-amount-cell">
                            {record.expensePlan?.totalAmount
                              ? formatCurrencyDisplay(
                                  record.expensePlan.totalAmount,
                                  record.expensePlan?.currency?.code ?? 'EUR'
                                )
                              : formatCurrencyDisplay(0, 'EUR')}
                          </div>
                        </TableCell>
                        <TableCell
                          className="gba:py-4 gba:px-6 gba:text-right"
                          data-testid={`${DATA_TEST_ID_PREFIX}-advance-cell-${record.id}`}
                        >
                          <div className="gba:text-sm gba:font-medium" data-testid="advance-payment-advance-cell">
                            {formatCurrencyDisplay(record.amount, record.currency?.code ?? 'EUR')}
                          </div>
                        </TableCell>
                        <TableCell
                          className="gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-payment-method-cell-${record.id}`}
                        >
                          <div className="gba:text-sm" data-testid="advance-payment-method-cell">
                            {record.paymentMethod
                              ? typeof record.paymentMethod === 'object' &&
                                record.paymentMethod !== null &&
                                'value' in record.paymentMethod
                                ? getCatalogValue(record.paymentMethod)
                                : String(record.paymentMethod) === 'DIRECT_DEPOSIT'
                                  ? getTranslationFromI18nKeyAndLabel(
                                      'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_direct_deposit',
                                      'Direct Deposit'
                                    )
                                  : String(record.paymentMethod) === 'CASH_PAYMENT'
                                    ? getTranslationFromI18nKeyAndLabel(
                                        'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_cash_payment',
                                        'Cash Payment'
                                      )
                                    : 'N/A'
                              : 'N/A'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalCount}
              onPageChange={handlePaginationChange}
              entityNamePlural={getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_expenses.advance_payments',
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:backoffice_expense_landing_page.advance_title',
                  'Advance Payments'
                )
              )}
              dataTestIdPrefix={DATA_TEST_ID_PREFIX}
              scrollTargetRef={tableTopRef}
              showBorder={false}
            />
          </CardContent>
        </Card>
      </div>
    )
  }, [
    items,
    isLoading,
    selectedItem,
    handleSelectItem,
    contextProps.accessToken,
    totalCount,
    pageSize,
    currentPage,
    handlePaginationChange,
    sortField,
    sortOrder,
    handleSort,
    renderSortIcon
  ])

  // Memoize DataContainer props to prevent unnecessary re-renders
  const dataControllerProps = useMemo(
    () => ({
      search: searchText,
      filter: props.selectedFilters || currentStatusFilter,
      setSearch: handleSearchChange,
      setFilter: (newFilters: any) => {
        // Handle filter changes
        if (props.onFilterChange) {
          props.onFilterChange(newFilters as string[])
        }
      },
      addButton: {
        onClick: handleAddAdvancePayment,
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule_details.calculation_allowance_code_list.calculation_allowance_code_modal.btn_add',
          'Add'
        ),
        'data-testid': 'add-advance-payment-button'
      },
      listTitle: getTranslationFromI18nKeyAndLabel(
        'lowcoder:advance_lists.my_advance_payments.title',
        'My Advance Payments'
      ),
      listAmount: totalCount ? `${totalCount}` : undefined,
      filterLabelMap: { ...filterLabelMap, ...currencyLabelMap }
    }),
    [
      searchText,
      props.selectedFilters,
      currentStatusFilter,
      handleSearchChange,
      props.onFilterChange,
      handleAddAdvancePayment,
      totalCount,
      isLoading,
      filterLabelMap,
      currencyLabelMap
    ]
  )

  const currencyAugmentedFilterGroups = useMemo(() => {
    const currencyGroup =
      currencyStats.length > 0
        ? [
            {
              id: 'currency',
              title: getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_item.change_expense_item_container.current_currency_label',
                'Currency'
              ),
              filters: currencyStats.map(cs => ({
                id: `currency:${cs.ref}`,
                label: cs.code,
                selected: (props.selectedFilters || []).includes(`currency:${cs.ref}`)
              })),
              selectionMode: 'single'
            }
          ]
        : []
    return [...currencyGroup, ...filterGroups]
  }, [currencyStats, filterGroups, props.selectedFilters])

  const dataFilterProps = useMemo(
    () => ({
      filterGroups: currencyAugmentedFilterGroups,
      onFilterChange: (filterId: string, selected: boolean) => {
        if (props.handleFilterChange) {
          props.handleFilterChange(filterId, selected)
        }
      }
    }),
    [currencyAugmentedFilterGroups, props.handleFilterChange]
  )

  return (
    <div ref={ref}>
      <DataContainer
        dataControllerProps={dataControllerProps}
        dataFilterProps={dataFilterProps}
        hideFilter={false}
        dataBody={renderDataBody()}
        contentBackground="white"
        addLeftPaddingWhenNoFilter={true}
      />

      {/* Advance Payment Details Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={open => !open && handleCloseDetails()}>
        <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <ExpenseDetailsShell
            title={
              selectedItem?.expensePlan?.title ||
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_expenses.advance_payment_details',
                'Advance Payment Details'
              )
            }
            onClose={handleCloseDetails}
          >
            {selectedItem ? <AdvancePaymentDetails payment={selectedItem} {...contextProps} /> : null}
          </ExpenseDetailsShell>
        </SheetContent>
      </Sheet>

      {/* Expense Plan Details Sheet */}
      <Sheet open={!!selectedExpensePlan} onOpenChange={open => !open && handleCloseDetails()}>
        <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <ExpenseDetailsShell
            title={
              selectedExpensePlan?.title ||
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:approve_expense_plan.expense_subtitle_details',
                'Expense Plan Details'
              )
            }
            onClose={handleCloseDetails}
          >
            {selectedExpensePlan ? (
              <ExpensePlanDetails
                selectedItem={selectedExpensePlan}
                onClose={handleCloseDetails}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
                planTypeLabel={
                  (selectedExpensePlan.requestType && (selectedExpensePlan.requestType as any).value) ||
                  (selectedExpensePlan.type && (selectedExpensePlan.type as any).value) ||
                  (selectedExpensePlan.requestType
                    ? String(selectedExpensePlan.requestType)
                    : selectedExpensePlan.type
                      ? String(selectedExpensePlan.type)
                      : undefined)
                }
              />
            ) : null}
          </ExpenseDetailsShell>
        </SheetContent>
      </Sheet>

      {/* Expense Request Details Sheet */}
      <Sheet open={!!selectedExpenseRequest} onOpenChange={open => !open && handleCloseDetails()}>
        <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <ExpenseDetailsShell
            title={
              selectedExpenseRequest?.title ||
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details',
                'Expense Request Details'
              )
            }
            onClose={handleCloseDetails}
          >
            {selectedExpenseRequest ? (
              <ExpenseRequestDetails
                selectedItem={selectedExpenseRequest}
                onClose={handleCloseDetails}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
              />
            ) : null}
          </ExpenseDetailsShell>
        </SheetContent>
      </Sheet>

      <GenerateDocumentDialog
        open={generateDocOpen}
        accessToken={contextProps.accessToken}
        onOpenChange={open => {
          setGenerateDocOpen(open)
          if (!open) {
            setGenerateDocRecord(null)
            setApproverData({})
            setSupervisorName(undefined)
          }
        }}
        entityDataMap={entityDataMapForDoc}
        defaultTitle={
          generateDocRecord?.expensePlan?.title ||
          generateDocRecord?.expensePlan?.code ||
          generateDocRecord?.code ||
          'Advance payment'
        }
        onSuccess={async documentId => {
          if (!contextProps.accessToken) return
          DocumentApiService.setAccessToken(contextProps.accessToken)
          try {
            const doc = await DocumentApiService.getDocument(documentId, contextProps.accessToken)
            if (doc?.content != null) {
              await exportToWord(doc.title || 'Document', doc.content)
              toast.success('Document downloaded')
            }
          } catch (err) {
            console.error('Failed to download document:', err)
            toast.error('Failed to download document')
          }
        }}
        data-testid={`${DATA_TEST_ID_PREFIX}-generate-document-dialog`}
      />
    </div>
  )
})

export default React.memo(AdvancePaymentsTable)
