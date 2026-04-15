import React, { useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react'
// import dayjs from 'dayjs'
import { getItemsCardStrategies, preserveCurrencyAndReset } from './utils/cardStrategies'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_PENDING_ITEMS } from '../../../queries/expenseItems'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
// import { ExpenseStatus } from '../../../utils'
import ExpenseItemStatistics from './statistics/ExpenseItemStatistics'
import ExpenseItemsTable from './table/ExpenseItemsTable'
import { useExpenseItemsFilters } from '../../../hooks/useExpenseItemsFilters'
import { startProcess } from '@/common/utils/start-process'
// import { env } from '@/common/env/EnvUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { PROCESS_COMPLETION_EVENT_NAMES } from '@/business-apps/fin/expenses/common/constants/processCompletionEventNames'
// import { useExpenseItemStatistics } from '../../../hooks/useExpenseItemStatistics';
import { getSelectedCurrencyRef, pickMostUsedCurrencyRef } from '../../../utils/currencyUtils'
import { useExpenseItemStatsOverview } from '../../../hooks/useExpenseItemStatsOverview'
import { useExpenseCurrencies } from '../../../hooks/useExpenseCurrencies'

export interface ExpenseItemsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void
  filter?: string
}

const ExpenseItemsTab: React.FC<ExpenseItemsTabProps> = props => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo,
      additionalData: props.additionalData
    }),
    [props.accessToken, props.userInfo, props.additionalData]
  )

  // Get all available statuses from the enum
  const availableStatuses = useMemo(
    () => ['CREATED', 'ASSIGNED', 'PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'BOOKED', 'PAID', 'TRANSFERRED'],
    []
  )

  // Use our expense items filters hook
  const {
    addFilter,
    removeFilter,
    clearFilters,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    getFilters,
    setFilters,
    setExpenseDateRange,
    expenseDateRange,
    amountRange,
    setAmountRange,
    onStatusFilterChange
  } = useExpenseItemsFilters(availableStatuses)

  // Currency stats: preselect most-used on first load; when user selects "All", cards still use most-used
  const { currencyStats, initialized } = useExpenseCurrencies(contextProps, selectedFilters, setFilters)
  const mostUsedCurrencyRef = useMemo(() => pickMostUsedCurrencyRef(currencyStats), [currencyStats])

  const [activeCard, setActiveCard] = useState<string | null>(null)

  useEffect(() => {
    if (!activeCard) return
    const statusFilters = new Set(selectedFilters.filter(f => !f.includes(':')))
    if (activeCard === 'total-expenses') {
      if (!statusFilters.has('paid')) setActiveCard(null)
    } else if (activeCard === 'pending-reimbursement') {
      if (!statusFilters.has('pending')) setActiveCard(null)
    }
  }, [selectedFilters, activeCard])

  useEffect(() => {
    if (!activeCard) return
    const hasDateRange = Boolean(expenseDateRange?.[0] || expenseDateRange?.[1])
    if (!hasDateRange) {
      setActiveCard(null)
    }
  }, [activeCard, expenseDateRange])

  // Stats come from aggregated overview hook
  const [pendingItemCountFromApi, setPendingItemCountFromApi] = useState<number>(0)
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState<number>(0)
  const graphqlClient = useGraphQLClient(contextProps.accessToken)

  // Read URL flag to hide statistics/cards
  const hideStats = useMemo(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get('hideStats') === '1'
    } catch {
      return false
    }
  }, [])

  // Ref to track if component is mounted
  const isMounted = useRef<boolean>(true)

  // Set isMounted to false when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Check sessionStorage for filter only once when the component mounts
  useEffect(() => {
    // First check sessionStorage for filter
    const storedFilter = sessionStorage.getItem('expenseItemsFilter')
    const urlParams = new URLSearchParams(window.location.search)
    const statusParam = (urlParams.get('status') || '').toLowerCase()

    if (storedFilter || statusParam) {
      // Clear existing filters first
      clearFilters()

      // Add the filter from sessionStorage
      if (statusParam) {
        addFilter(statusParam)
      } else if (storedFilter) {
        addFilter(storedFilter)
      }

      // Clear the sessionStorage after using it
      sessionStorage.removeItem('expenseItemsFilter')
    }
    // Only run this effect once when the component mounts
  }, [addFilter, clearFilters])

  // Listen for the global API filter changes
  useEffect(() => {
    // Check the global API for filter changes
    const checkGlobalFilter = () => {
      const apiFilter = window.tabNavigationAPI?.filter
      if (apiFilter && !selectedFilters.includes(apiFilter)) {
        // Clear existing filters first
        clearFilters()

        // Add the filter from global API
        addFilter(apiFilter)

        // Clear the filter from the global API after using it
        if (window.tabNavigationAPI) {
          window.tabNavigationAPI.filter = undefined
        }
      }
    }

    // Check immediately
    checkGlobalFilter()

    // Set up a MutationObserver to detect when this tab becomes active
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        // When DOM changes (e.g., tab becomes visible), check for filter
        if (mutation.type === 'attributes') {
          checkGlobalFilter()
        }
      })
    })

    // Start observing the document
    observer.observe(document.body, { attributes: true, childList: true, subtree: true })

    // Clean up
    return () => {
      observer.disconnect()
    }
  }, [addFilter, clearFilters, selectedFilters])

  // Resolve selected currency from filters; when "All" use most-used so cards show that currency
  const selectedCurrencyRef = useMemo(() => {
    return getSelectedCurrencyRef(selectedFilters, mostUsedCurrencyRef)
  }, [selectedFilters, mostUsedCurrencyRef])

  const currencyCodeForCards = useMemo(() => {
    if (!selectedCurrencyRef) return 'EUR'
    const code = currencyStats.find(s => s.ref === selectedCurrencyRef)?.code
    return code ?? selectedCurrencyRef.split(':').pop() ?? 'EUR'
  }, [selectedCurrencyRef, currencyStats])

  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      const strategies = getItemsCardStrategies({ setExpenseDateRange, onStatusFilterChange })

      const isDeactivating = activeCard === widgetKey
      if (isDeactivating) {
        strategies[widgetKey]?.remove()
        setActiveCard(null)
        return
      }

      preserveCurrencyAndReset(selectedFilters, clearFilters, addFilter, mostUsedCurrencyRef)
      strategies[widgetKey]?.apply()
      setActiveCard(widgetKey)
    },
    [
      activeCard,
      clearFilters,
      setExpenseDateRange,
      onStatusFilterChange,
      selectedFilters,
      addFilter,
      mostUsedCurrencyRef
    ]
  )

  // Handle status filter changes - use the hook's function (direct usage in handlers)

  // Function to fetch statistics data specifically (kept for compatibility; will be replaced by hook usage)
  const {
    data: statsOverview,
    isLoading: statsLoading,
    error: statsError,
    fetchOverview
  } = useExpenseItemStatsOverview(contextProps)

  const fetchItemStatistics = useCallback(async () => {
    if (!selectedCurrencyRef) return
    await fetchOverview(selectedCurrencyRef)
  }, [fetchOverview, selectedCurrencyRef])

  // Fetch statistics on component mount
  useEffect(() => {
    if (!hideStats && selectedCurrencyRef) {
      fetchItemStatistics()
    }
  }, [fetchItemStatistics, hideStats, selectedCurrencyRef])

  // Combine UI and card filters no longer needed locally (table consumes selectedFilters directly)

  // Create a custom getFilters function that includes date range parameters
  const getFiltersWithDateRange = useCallback(
    (filtersToApply?: string[]) => {
      return getFilters(filtersToApply, null, null, expenseDateRange)
    },
    [getFilters, expenseDateRange]
  )

  // Process completion event listener to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          // Refresh statistics data after successful process completion
          fetchItemStatistics()

          // Refresh pending item count (for display purposes, not for filtering)
          const fetchPendingItemCount = async () => {
            if (!contextProps.userInfo?.employeeDetails?.employeeId) return
            try {
              const data = await graphqlClient.request(GET_PENDING_ITEMS, {
                employeeId: contextProps.userInfo.employeeDetails.employeeId,
                currencyRef: selectedCurrencyRef
              })
              setPendingItemCountFromApi(data?.pendingExcludingAllowance?.aggregate?.count ?? 0)
            } catch {
              setPendingItemCountFromApi(0)
            }
          }
          fetchPendingItemCount()

          // Trigger table refresh by updating a state that forces re-render
          setTableRefreshTrigger(prev => prev + 1)

          return
        }
      } catch (err) {
        console.error('Error handling process completion:', err)
      }
    }

    const handleAllEvents = (event: any) => {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        handleProcessCompletion(event)
      }
    }

    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ]

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener)
    })

    const originalDispatchEvent = window.dispatchEvent
    window.dispatchEvent = function (event: Event) {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        handleAllEvents(event)
      }
      return originalDispatchEvent.call(this, event)
    }

    return () => {
      PROCESS_COMPLETION_EVENT_NAMES.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener)
      })

      window.dispatchEvent = originalDispatchEvent
    }
  }, [fetchItemStatistics, contextProps.userInfo?.employeeDetails?.employeeId, graphqlClient])

  // Resolve stats values from overview
  const totalExpenses = statsOverview?.totalExpensesCurrent ?? null
  const previousMonthTotalExpenses = statsOverview?.totalExpensesPrevious ?? null
  const pendingReimbursementTotal = statsOverview?.pendingReimbursementCurrent ?? 0
  const previousMonthPendingReimbursementTotal = statsOverview?.pendingReimbursementPrevious ?? 0

  // Memoize the content header to prevent unnecessary re-renders
  const contentHeader = useMemo(() => {
    return (
      <div>
        <ExpenseItemStatistics
          items={[]}
          totalExpenses={totalExpenses}
          previousMonthTotalExpenses={previousMonthTotalExpenses}
          pendingReimbursementTotal={pendingReimbursementTotal}
          previousMonthPendingReimbursementTotal={previousMonthPendingReimbursementTotal}
          pendingItemCountFromApi={pendingItemCountFromApi}
          statsLoading={statsLoading}
          statsError={statsError}
          fetchItemStatistics={fetchItemStatistics}
          onWidgetClick={handleWidgetClick}
          activeWidgetKey={activeCard ?? undefined}
          currencyCode={currencyCodeForCards}
        />
      </div>
    )
  }, [
    totalExpenses,
    previousMonthTotalExpenses,
    currencyCodeForCards,
    statsLoading,
    statsError,
    fetchItemStatistics,
    handleWidgetClick,
    activeCard,
    pendingReimbursementTotal,
    previousMonthPendingReimbursementTotal
  ])

  // Update the content header when it changes
  const onContentHeaderChange = props.onContentHeaderChange
  useEffect(() => {
    if (hideStats) {
      // Explicitly clear any header when hideStats is requested
      if (onContentHeaderChange) {
        const timerId = setTimeout(() => {
          onContentHeaderChange(null)
        }, 0)
        return () => clearTimeout(timerId)
      }
      return
    }
    // Update content header when callback exists
    if (onContentHeaderChange) {
      const timerId = setTimeout(() => {
        onContentHeaderChange(contentHeader)
      }, 0)
      return () => clearTimeout(timerId)
    }
  }, [onContentHeaderChange, contentHeader, hideStats])

  // Handle adding a new expense item
  const handleAddExpenseItem = useCallback(() => {
    const employeeId = contextProps.userInfo?.employeeDetails?.employeeId
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.')
      console.warn(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.user_information_not_loaded',
          'User information not loaded yet. Please wait a moment and try again.'
        )
      )
      return
    }

    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseItem',
      payload: {
        employeeId: employeeId
      },
      builderType: 'NATIVE_SCREEN'
    })
  }, [contextProps.userInfo?.employeeDetails?.employeeId])

  const handleClearAllFilters = useCallback(() => {
    preserveCurrencyAndReset(selectedFilters, clearFilters, addFilter, mostUsedCurrencyRef)
    setActiveCard(null)
  }, [selectedFilters, clearFilters, addFilter, mostUsedCurrencyRef])

  return (
    <ExpenseItemsTable
      {...contextProps}
      onAddExpenseItem={handleAddExpenseItem}
      selectedFilters={selectedFilters}
      addFilter={addFilter}
      removeFilter={removeFilter}
      clearFilters={handleClearAllFilters}
      filterGroups={filterGroups}
      filterLabelMap={filterLabelMap}
      getFilters={getFiltersWithDateRange}
      setFilters={setFilters}
      availableStatuses={availableStatuses}
      amountRange={amountRange}
      setAmountRange={setAmountRange}
      expenseDateRange={expenseDateRange}
      setExpenseDateRange={setExpenseDateRange}
      tableRefreshTrigger={tableRefreshTrigger}
      activeWidgetKey={activeCard ?? undefined}
      currencyStats={currencyStats}
      currenciesInitialized={initialized}
    />
  )
}

export default ExpenseItemsTab
