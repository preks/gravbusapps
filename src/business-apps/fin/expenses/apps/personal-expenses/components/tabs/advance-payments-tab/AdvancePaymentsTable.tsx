import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { DataTable, DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Sheet,
  SheetContent,
  Badge,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { message } from 'antd'
import { AppAction } from '@/components/app-action'
import { startProcess } from '@/common/utils/start-process'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetAdvancePayments, AdvancePayment } from '../../../hooks/useGetAdvancePayments'
import { useAdvancePaymentCurrencies } from '../../../hooks/useAdvancePaymentCurrencies'
import { getAdvancePaymentStatusDisplay, formatCurrencyDisplay } from '../../../utils'
import AdvancePaymentDetails from './AdvancePaymentDetails'
import ExpensePlanDetails from '../expense-plans-tab/ExpensePlanDetails'
import ExpenseRequestDetails from '../expense-requests-tab/ExpenseRequestDetails'
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import ExpenseDetailsShell from '../../../../../common/components/details-panel/ExpenseDetailsShell'
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
  setAmountRange?: (range: { min?: number; max?: number } | null) => void
  setAdvanceRange?: (range: { min?: number; max?: number } | null) => void
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

  const { items, isLoading, error, totalCount, fetchItems } = useGetAdvancePayments(contextProps)
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

  const [sortField, setSortField] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend')

  const currentStatusFilter = useMemo(() => props.activeFilter || [], [props.activeFilter])
  const currentAmountRange = useMemo(() => props.amountRange || null, [props.amountRange])
  const currentAdvanceRange = useMemo(() => props.advanceRange || null, [props.advanceRange])
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

  // FilterConfiguration for DataDisplay filter sheet (same pattern as items/plans)
  const advancePaymentsFilterConfig: FilterConfiguration = useMemo(() => {
    const statusOptions = Object.keys(filterLabelMap)
      .filter(k => !k.startsWith('currency:') && k !== 'amountRange' && k !== 'advanceRange')
      .map(s => ({ id: s, label: filterLabelMap[s] || s }))
    const groups: FilterConfiguration['groups'] = [
      {
        id: 'status-group',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_table.status', 'Status'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'statusIds',
            field: 'statusIds',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_table.status', 'Status'),
            type: 'multi-select',
            config: { options: statusOptions }
          }
        ]
      },
      {
        id: 'amount-group',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.amount_range', 'Amount Range'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'amount',
            field: 'amount',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.amount_range', 'Amount Range'),
            type: 'number',
            config: {
              mode: 'range',
              min: 0,
              max: 1000000,
              step: 100,
              placeholderMin: 'Min Amount',
              placeholderMax: 'Max Amount'
            }
          }
        ]
      },
      {
        id: 'advance-group',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.advance_range_filter', 'Advance Range'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'advance',
            field: 'advance',
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:personal_expenses.advance_range_filter',
              'Advance Range'
            ),
            type: 'number',
            config: {
              mode: 'range',
              min: 0,
              max: 1000000,
              step: 100,
              placeholderMin: 'Min Advance',
              placeholderMax: 'Max Advance'
            }
          }
        ]
      }
    ]
    return { id: 'advance-payments-filters', name: 'Advance Payments Filters', groups }
  }, [filterLabelMap])

  // filters object for DataDisplay chips (from current state)
  const filtersObject = useMemo((): Record<string, unknown> => {
    const statusIds = currentStatusFilter.filter(
      s => !s.startsWith('currency:') && s !== 'amountRange' && s !== 'advanceRange'
    )
    const obj: Record<string, unknown> = {}
    if (statusIds.length > 0) obj.statusIds = statusIds
    if (currentAmountRange && (currentAmountRange.min !== undefined || currentAmountRange.max !== undefined)) {
      obj.amount = { ...currentAmountRange }
    }
    if (currentAdvanceRange && (currentAdvanceRange.min !== undefined || currentAdvanceRange.max !== undefined)) {
      obj.advance = { ...currentAdvanceRange }
    }
    return obj
  }, [currentStatusFilter, currentAmountRange, currentAdvanceRange])

  // When DataDisplay filter sheet applies changes, sync back to parent/hook state
  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, unknown>) => {
      const statusIds = (filters.statusIds as string[] | undefined) || []
      const amt = filters.amount as { min?: number; max?: number } | undefined
      const adv = filters.advance as { min?: number; max?: number } | undefined
      const hasAmount = amt && (amt.min !== undefined || amt.max !== undefined)
      const hasAdvance = adv && (adv.min !== undefined || adv.max !== undefined)
      const currencyTokens = (props.selectedFilters || []).filter(f => f.startsWith('currency:'))
      const rangeMarkers: string[] = []
      if (hasAmount) rangeMarkers.push('amountRange')
      if (hasAdvance) rangeMarkers.push('advanceRange')
      if (props.onFilterChange) {
        props.onFilterChange([...statusIds, ...currencyTokens, ...rangeMarkers])
      }
      props.setAmountRange?.(hasAmount ? amt! : null)
      props.setAdvanceRange?.(hasAdvance ? adv! : null)
      setCurrentPage(1)
    },
    [props.selectedFilters, props.onFilterChange, props.setAmountRange, props.setAdvanceRange]
  )

  // Sortable columns for DataDisplay (match API fieldMap: code, status, amount, paymentMethod, createdAt)
  const sortableColumns = useMemo(
    () => [
      {
        id: 'createdAt',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.created_at', 'Created')
      },
      {
        id: 'code',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.expense_request_filter.plan_number_input',
          'Plan Number'
        )
      },
      {
        id: 'status',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_table.status', 'Status')
      },
      {
        id: 'amount',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:manager_expense_request_list.expense_table.advance',
          'Advance'
        )
      },
      {
        id: 'paymentMethod',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_request.add_request_trip_details.payment_method',
          'Payment Method'
        )
      }
    ],
    []
  )

  const baseVisibleColumnIds = useMemo(
    () => ['expensePlan', 'planNumber', 'status', 'amount', 'advance', 'paymentMethod'],
    []
  )
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...baseVisibleColumnIds])

  const availableColumnsForDisplay = useMemo(
    () => [
      {
        id: 'expensePlan',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_request.initial_expense_plan_select_label',
          'Expense Plan'
        )
      },
      {
        id: 'planNumber',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.expense_request_filter.plan_number_input',
          'Plan Number'
        )
      },
      { id: 'status', label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_table.status', 'Status') },
      {
        id: 'amount',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.amount', 'Amount')
      },
      {
        id: 'advance',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:manager_expense_request_list.expense_table.advance',
          'Advance'
        )
      },
      {
        id: 'paymentMethod',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_request.add_request_trip_details.payment_method',
          'Payment Method'
        )
      }
    ],
    []
  )

  const selectedCurrencyCode = useMemo(() => {
    const token = (props.selectedFilters || []).find(f => f.startsWith('currency:'))
    if (!token) return 'ALL'
    const ref = token.substring('currency:'.length)
    return currencyStats.find(cs => cs.ref === ref)?.code ?? 'ALL'
  }, [props.selectedFilters, currencyStats])

  const handleCurrencyChange = useCallback(
    (code: string) => {
      const current = props.selectedFilters || []
      if (code === 'ALL') {
        props.onFilterChange?.(current.filter(f => !f.startsWith('currency:')))
      } else {
        const cs = currencyStats.find(c => c.code === code)
        if (cs) {
          props.onFilterChange?.([...current.filter(f => !f.startsWith('currency:')), `currency:${cs.ref}`])
        }
      }
      setCurrentPage(1)
    },
    [props.selectedFilters, currencyStats, props.onFilterChange]
  )

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

  const sorting = useMemo(
    () => (sortOrder ? [{ id: sortField || 'createdAt', desc: sortOrder === 'descend' }] : []),
    [sortField, sortOrder]
  )
  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      const entry = newSorting[0]
      const field = entry?.id || 'createdAt'
      const order = entry ? (entry.desc ? 'descend' : 'ascend') : 'descend'
      if (field === sortField && order === sortOrder) return
      setSortField(field)
      setSortOrder(order)
      setCurrentPage(1)
    },
    [sortField, sortOrder]
  )
  const pagination = useMemo(() => ({ pageIndex: currentPage - 1, pageSize }), [currentPage, pageSize])
  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setCurrentPage(newPagination.pageIndex + 1)
    setPageSize(newPagination.pageSize)
  }, [])
  const emptyMessage = hasActiveFilters
    ? getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.no_data_found', 'No data available')
    : getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.no_advance_payments_found',
        'No advance payments found. Create your first advance payment to get started.'
      )

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

  const columns = useMemo<ColumnDef<AdvancePayment>[]>(
    () => [
      {
        id: 'expensePlan',
        accessorFn: (row: AdvancePayment) => row.expensePlan?.title,
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_request.initial_expense_plan_select_label',
          'Expense Plan'
        ),
        size: 200,
        cell: ({ row }) => (
          <div className="gba:font-medium gba:text-sm gba:truncate" data-testid="advance-payment-expense-plan-cell">
            {row.original.expensePlan?.title ??
              getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_expense_plan', 'No expense plan')}
          </div>
        )
      },
      {
        id: 'planNumber',
        accessorFn: (row: AdvancePayment) => row.expensePlan?.code,
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.expense_request_filter.plan_number_input',
          'Plan Number'
        ),
        size: 120,
        cell: ({ row }) => (
          <div className="gba:text-sm gba:truncate" data-testid="advance-payment-plan-number-cell">
            {row.original.expensePlan?.code ?? 'N/A'}
          </div>
        )
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_table.status', 'Status'),
        size: 100,
        cell: ({ row }) => {
          const statusConfig = getAdvancePaymentStatusDisplay(row.original.status)
          return (
            <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="advance-payment-status-cell">
              {statusConfig.label}
            </Badge>
          )
        }
      },
      {
        id: 'amount',
        accessorFn: (row: AdvancePayment) => row.expensePlan?.totalAmount,
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.amount', 'Amount'),
        size: 120,
        meta: { align: 'right' as const },
        cell: ({ row }) => (
          <div
            className="gba:text-right gba:text-sm gba:font-mono gba:truncate"
            data-testid="advance-payment-amount-cell"
          >
            {row.original.expensePlan?.totalAmount
              ? formatCurrencyDisplay(
                  row.original.expensePlan.totalAmount,
                  row.original.expensePlan?.currency?.code ?? 'EUR'
                )
              : formatCurrencyDisplay(0, 'EUR')}
          </div>
        )
      },
      {
        id: 'advance',
        accessorKey: 'amount',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:manager_expense_request_list.expense_table.advance',
          'Advance'
        ),
        size: 120,
        meta: { align: 'right' as const },
        cell: ({ row }) => (
          <div
            className="gba:text-right gba:text-sm gba:font-mono gba:truncate"
            data-testid="advance-payment-advance-cell"
          >
            {formatCurrencyDisplay(row.original.amount, row.original.currency?.code ?? 'EUR')}
          </div>
        )
      },
      {
        id: 'paymentMethod',
        accessorKey: 'paymentMethod',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_request.add_request_trip_details.payment_method',
          'Payment Method'
        ),
        size: 140,
        cell: ({ row }) => (
          <div className="gba:text-sm gba:truncate" data-testid="advance-payment-method-cell">
            {row.original.paymentMethod
              ? typeof row.original.paymentMethod === 'object' &&
                row.original.paymentMethod !== null &&
                'value' in row.original.paymentMethod
                ? getCatalogValue(row.original.paymentMethod)
                : String(row.original.paymentMethod) === 'DIRECT_DEPOSIT'
                  ? getTranslationFromI18nKeyAndLabel(
                      'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_direct_deposit',
                      'Direct Deposit'
                    )
                  : String(row.original.paymentMethod) === 'CASH_PAYMENT'
                    ? getTranslationFromI18nKeyAndLabel(
                        'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_cash_payment',
                        'Cash Payment'
                      )
                    : 'N/A'
              : 'N/A'}
          </div>
        )
      }
    ],
    []
  )

  const rowActions = useCallback(
    (row: { original: AdvancePayment }) => {
      const record = row.original
      return (
        <div className="gba:flex gba:justify-end gba:gap-2" onClick={e => e.stopPropagation()}>
          <AppAction
            variant="table-row"
            customActions={[
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
                label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.generate_document', 'Generate document'),
                onClick: (e?: React.MouseEvent) => {
                  e?.stopPropagation()
                  setGenerateDocRecord(record)
                  setGenerateDocOpen(true)
                }
              }
            ]}
            prefixDataTestId={`${DATA_TEST_ID_PREFIX}-action`}
            accessToken={contextProps.accessToken}
            data-testid={`${DATA_TEST_ID_PREFIX}-action-button-${record.id}`}
          >
            <svg className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </AppAction>
        </div>
      )
    },
    [contextProps.accessToken, handleSelectItem, handleViewExpensePlanDetails, handleViewExpenseRequestDetails]
  )

  const primaryAction = useMemo(
    () => (
      <Button
        onClick={handleAddAdvancePayment}
        size="sm"
        variant="default"
        data-testid="add-advance-payment-button"
        type="button"
      >
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule_details.calculation_allowance_code_list.calculation_allowance_code_modal.btn_add',
          'Add'
        )}
      </Button>
    ),
    [handleAddAdvancePayment]
  )

  const secondaryActions = useMemo(
    () =>
      currencyStats.length > 0 ? (
        <div className="gba:flex gba:items-center gba:gap-2" key="currency-dropdown">
          <Label className="gba:font-medium gba:shrink-0">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_item.change_expense_item_container.current_currency_label',
              'Currency'
            )}
            :
          </Label>
          <Select value={selectedCurrencyCode} onValueChange={handleCurrencyChange}>
            <SelectTrigger className="gba:w-[140px]" data-testid="advance-payments-currency-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">
                {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.all_currencies', 'All')}
              </SelectItem>
              {currencyStats.map(cs => (
                <SelectItem key={cs.ref} value={cs.code}>
                  {cs.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : undefined,
    [currencyStats, selectedCurrencyCode, handleCurrencyChange]
  )

  return (
    <div ref={ref}>
      <DataDisplay
        titleSections={[
          {
            id: 'list',
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:advance_lists.my_advance_payments.title',
              'My Advance Payments'
            ),
            metadata: { count: totalCount, isLoading }
          }
        ]}
        currentSection="list"
        searchValue={searchText}
        searchPlaceholder={
          getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.job_search', 'Search') +
          '...'
        }
        onSearchChange={handleSearchChange}
        filters={filtersObject}
        filterConfiguration={advancePaymentsFilterConfig}
        onFilterChange={handleFilterChangeFromDisplay}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={handleSortingChange}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        availableColumns={availableColumnsForDisplay}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        toolbarDensity="default"
        filterSheetTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:advance_lists.my_advance_payments.title',
          'Filter Advance Payments'
        )}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.filter_advance_payments_description',
          'Apply filters to narrow down the advance payments list.'
        )}
      >
        <DataTable<AdvancePayment>
          data={items || []}
          columns={columns.filter(col =>
            visibleColumns.includes((col as ColumnDef<AdvancePayment> & { id?: string }).id ?? '')
          )}
          loading={isLoading}
          error={error || undefined}
          totalCount={totalCount}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          enablePagination
          enableSorting
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          tableLayout="fixed"
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage={emptyMessage}
          actions={rowActions}
          onRowClick={handleSelectItem}
          data-testid={DATA_TEST_ID_PREFIX}
        />
      </DataDisplay>

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
