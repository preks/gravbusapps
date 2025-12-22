import React, { useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import ExpensePlansTable from './ExpensePlansTable'
import { useExpensePlansOverview } from '../../../hooks/useExpensePlansOverview'
import { useExpensePlanFilters } from '../../../hooks/useExpensePlanFilters'
import { getActiveWidgetFromFilters } from '../../../hooks/useExpensePlanWidgetFilters'
import ExpensePlanStatistics from './ExpensePlanStatistics'
import dayjs from 'dayjs'
import { getPlanCardStrategies, preserveCurrencyAndResetPlans } from './cardStrategies'
// ExpenseStatus usage moved into strategies
import { useExpensePlanCurrencies } from '../../../hooks/useExpensePlanCurrencies'
import { getSelectedCurrencyRef } from '../../../utils/currencyUtils'
import { useDebounce } from '@/common/hooks/useDebounce'

interface ExpensePlansTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void
}

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = props => {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [activeWidget, setActiveWidget] = useState<string | null>(null)
  const [destinationFilter, setDestinationFilter] = useState<string | null>(null)
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState<number>(0)
  const [suppressCurrencyAutoSelect, setSuppressCurrencyAutoSelect] = useState<boolean>(false)
  // Add sorting state for server-side sorting
  const [sortField, setSortField] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | null>('descend')

  const {
    filterGroups,
    selectedFilters,
    setFilters,
    handleFilterChange,
    clearFilters,
    search,
    setSearch,
    getFilters,
    setStartDateRange,
    setEndDateRange,
    setPlanDateRange,
    // expose effective date setter from filters hook
    setEffectiveDateRange,
    filterLabelMap,
    addFilter,
    removeFilter
  } = useExpensePlanFilters()

  const debouncedSelectedFilters = useDebounce(selectedFilters, 200) // Reduced from 300ms for faster filter response

  const {
    data: overview,
    isLoading: overviewLoading,
    isStatisticsLoading,
    error: overviewError,
    fetchOverview
  } = useExpensePlansOverview(props)
  const selectedCurrencyRef = useMemo(
    () => getSelectedCurrencyRef(selectedFilters, 'Currency:v1:EUR'),
    [selectedFilters]
  )
  // Statistics should be undefined until loaded - don't default to 0 values
  // This prevents showing "0" values before real data loads
  const statistics = overview?.statistics

  // Determine if statistics should show loading skeleton
  // Show loading skeleton if statistics haven't loaded yet (prevents showing 0 values)
  // Always show loading when statistics are undefined, regardless of other loading states
  // This ensures we never show 0 values before real data loads
  const statisticsShouldShowLoading = !statistics || isStatisticsLoading || (overviewLoading && !statistics)
  // Only apply currency filter to table data when a currency is explicitly selected (like requests tab)
  const explicitSelectedCurrencyRef = useMemo(() => {
    const token = selectedFilters.find(f => f.startsWith('currency:'))
    return token ? token.substring('currency:'.length) : undefined
  }, [selectedFilters])
  const { currencyStats, initialized: currencyInit } = useExpensePlanCurrencies(props, selectedFilters, setFilters)

  // Track previous selectedFilters to reset pagination when filters change.
  const prevSelectedFiltersRef = useRef<string | null>(null)

  // Persist and restore currency filter per user to avoid losing it on tab switches
  useEffect(() => {
    const employeeId = props.userInfo?.employeeDetails?.employeeId
    if (!employeeId) return
    try {
      const storageKey = `personal-expenses:plans:currencyRef:${employeeId}`
      const persisted = sessionStorage.getItem(storageKey)
      if (!suppressCurrencyAutoSelect && persisted && !selectedFilters.some(f => f.startsWith('currency:'))) {
        const nonCurrency = selectedFilters.filter(f => !f.startsWith('currency:'))
        setFilters([...nonCurrency, `currency:${persisted}`])
        return
      }
      // If currencies are initialized and still no selection, default to EUR
      if (!suppressCurrencyAutoSelect && currencyInit && !selectedFilters.some(f => f.startsWith('currency:'))) {
        const nonCurrency = selectedFilters.filter(f => !f.startsWith('currency:'))
        setFilters([...nonCurrency, 'currency:Currency:v1:EUR'])
        sessionStorage.setItem(storageKey, 'Currency:v1:EUR')
      }
    } catch {
      // ignore storage errors
    }
  }, [
    props.userInfo?.employeeDetails?.employeeId,
    selectedFilters,
    setFilters,
    currencyInit,
    suppressCurrencyAutoSelect
  ])

  // Synchronize activeWidget with selectedFilters when filters change externally
  useEffect(() => {
    const expectedActiveWidget = getActiveWidgetFromFilters(selectedFilters)
    // Don't deactivate top-destinations widget based on status filters alone
    // since destination filtering is handled separately
    if (expectedActiveWidget !== activeWidget && activeWidget !== 'top-destinations') {
      setActiveWidget(expectedActiveWidget)
    }
  }, [selectedFilters, activeWidget])

  // Helper function to get current month date range
  // current month range handled in strategies

  // Handle widget clicks with immediate visual feedback
  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      const isDeactivating = activeWidget === widgetKey
      const newActiveWidget = isDeactivating ? null : widgetKey
      setActiveWidget(newActiveWidget)

      const strategies = getPlanCardStrategies({
        setPlanDateRange,
        setStartDateRange,
        setEndDateRange,
        setEffectiveDateRange,
        handleFilterChange,
        setDestinationFilter,
        topDestination: statistics?.topDestination || 'N/A'
      })

      if (isDeactivating) {
        strategies[widgetKey]?.remove()
        // Restore to base state while preserving currency selection
        preserveCurrencyAndResetPlans(selectedFilters, clearFilters, setFilters)
        if (widgetKey === 'top-destinations') setDestinationFilter(null)
        return
      }

      preserveCurrencyAndResetPlans(selectedFilters, clearFilters, setFilters)
      if (widgetKey !== 'top-destinations') setDestinationFilter(null)
      strategies[widgetKey]?.apply()
    },
    [
      activeWidget,
      setPlanDateRange,
      setStartDateRange,
      setEndDateRange,
      handleFilterChange,
      setDestinationFilter,
      statistics?.topDestination,
      selectedFilters,
      clearFilters,
      setFilters
    ]
  )

  // Wrapper for clear all filters without parameters (for ExpensePlansTable clearFilters prop)
  const handleClearAllFiltersNoParams = useCallback(() => {
    // Use the enhanced setFilters which handles clearing all filters properly
    setSuppressCurrencyAutoSelect(true)
    setFilters([])
    setActiveWidget(null)
    setDestinationFilter(null)
  }, [setFilters])

  // Helper to persist currency selection in session storage
  const persistCurrencySelection = (employeeId: string | undefined, filters: string[]) => {
    if (!employeeId) return
    try {
      const storageKey = `personal-expenses:plans:currencyRef:${employeeId}`
      const newCurrency = (filters.find(f => f.startsWith('currency:')) || '').replace('currency:', '')
      if (newCurrency) {
        sessionStorage.setItem(storageKey, newCurrency)
      } else {
        sessionStorage.removeItem(storageKey)
      }
    } catch {
      // ignore storage errors
    }
  }

  // Helper function to build widget-specific filters
  const buildWidgetFilters = useCallback(
    (baseFilters: any) => {
      const filtersObj = { ...baseFilters }

      // Add total-estimated widget filters
      if (activeWidget === 'total-estimated') {
        const today = dayjs()
        const currentMonthStart = today.startOf('month').format('YYYY-MM-DD HH:mm:ss')
        const currentMonthEnd = today.endOf('month').format('YYYY-MM-DD HH:mm:ss')

        const planDateCondition = {
          _and: [{ planDate: { _gte: currentMonthStart } }, { planDate: { _lte: currentMonthEnd } }]
        }

        if (filtersObj._and) {
          filtersObj._and.push(planDateCondition)
        } else {
          filtersObj._and = [planDateCondition]
        }
      }

      // Add top-destinations widget filters
      if (activeWidget === 'top-destinations' && destinationFilter && destinationFilter !== 'N/A') {
        const destinationCondition = {
          expenseRequestTrip: {
            pointType: { _eq: 'DESTINATION_POINT' },
            travelRegion: {
              _or: [
                { value: { _eq: destinationFilter } },
                { translations: { value: { _eq: destinationFilter } } },
                { code: { _eq: destinationFilter } }
              ]
            }
          }
        }

        if (filtersObj._and) {
          filtersObj._and.push(destinationCondition)
        } else {
          filtersObj._and = [destinationCondition]
        }
      }

      return filtersObj
    },
    [activeWidget, destinationFilter]
  )

  // Memoize the filters to prevent unnecessary API calls
  const memoizedFilters = useMemo(() => {
    const baseFilters = getFilters() // This now uses debouncedSearch internally
    // Filter by currency only when explicitly selected
    if (explicitSelectedCurrencyRef) {
      baseFilters._and = baseFilters._and || []
      // Match by ref OR by code (to handle v1/v2 ref differences), for both plan and related request
      const selectedCode = (explicitSelectedCurrencyRef.split(':').pop() || '').toUpperCase()
      baseFilters._and.push({
        _or: [
          { currencyRef: { _eq: explicitSelectedCurrencyRef } },
          { expenseRequest: { currencyRef: { _eq: explicitSelectedCurrencyRef } } },
          ...(selectedCode
            ? [
                { currency: { code: { _eq: selectedCode } } },
                { expenseRequest: { currency: { code: { _eq: selectedCode } } } }
              ]
            : [])
        ]
      })
    }
    const finalFilters = buildWidgetFilters(baseFilters)
    return finalFilters
  }, [getFilters, buildWidgetFilters, explicitSelectedCurrencyRef, debouncedSelectedFilters])

  // Only fetch when filters, page, pageSize, or sorting changes and context is ready
  useEffect(() => {
    // Check sessionStorage first for persisted currency (synchronous, no waiting)
    const employeeId = props.userInfo?.employeeDetails?.employeeId
    let persistedCurrency: string | null = null
    if (employeeId) {
      try {
        const storageKey = `personal-expenses:plans:currencyRef:${employeeId}`
        persistedCurrency = sessionStorage.getItem(storageKey)
      } catch {
        // ignore storage errors
      }
    }

    const hasCurrency = explicitSelectedCurrencyRef || persistedCurrency
    const shouldWaitForCurrency = !hasCurrency && !suppressCurrencyAutoSelect && !currencyInit

    const canFetch = props.accessToken && props.userInfo?.employeeDetails?.employeeId && !shouldWaitForCurrency // Wait if we need currencyInit to determine the correct currency

    if (canFetch) {
      const statsCurrency = explicitSelectedCurrencyRef || persistedCurrency || 'Currency:v1:EUR'
      fetchOverview(memoizedFilters, currentPage, pageSize, sortField, sortOrder, statsCurrency)
    }
  }, [
    fetchOverview,
    currentPage,
    pageSize,
    memoizedFilters,
    sortField,
    sortOrder,
    props.accessToken,
    props.userInfo?.employeeDetails?.employeeId,
    explicitSelectedCurrencyRef,
    suppressCurrencyAutoSelect,
    currencyInit
  ])

  // Reset pagination when filters change (e.g., applying a status filter while on a later page).
  useEffect(() => {
    const currentFiltersKey = JSON.stringify(selectedFilters)
    const previousFiltersKey = prevSelectedFiltersRef.current

    // Skip on initial render; only react to actual changes.
    if (previousFiltersKey !== null && previousFiltersKey !== currentFiltersKey) {
      setCurrentPage(1)
    }

    prevSelectedFiltersRef.current = currentFiltersKey
  }, [selectedFilters])

  // Process completion event listener for refreshing data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          const canFetch =
            props.accessToken &&
            props.userInfo?.employeeDetails?.employeeId &&
            (explicitSelectedCurrencyRef || suppressCurrencyAutoSelect)

          // Refresh overview (items + statistics) using the same guards as the main fetch effect
          if (canFetch) {
            const statsCurrency = explicitSelectedCurrencyRef || 'Currency:v1:EUR'
            // Force a fresh fetch even if parameters haven't changed, so newly
            // created/updated plans are visible immediately after process completion.
            fetchOverview(memoizedFilters, currentPage, pageSize, sortField, sortOrder, statsCurrency, {
              force: true
            })
          }

          // Reset active widget to force refresh of statistics
          setActiveWidget(null)

          // Trigger table refresh by updating a state that forces re-render
          setTableRefreshTrigger(prev => prev + 1)

          return
        }
      } catch (err) {
        console.error('Error handling process completion:', err)
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

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener)
      })
    }
  }, [
    fetchOverview,
    memoizedFilters,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    props.accessToken,
    props.userInfo?.employeeDetails?.employeeId,
    explicitSelectedCurrencyRef,
    suppressCurrencyAutoSelect
  ])

  // Memoize content header to prevent unnecessary re-renders
  const contentHeader = useMemo(() => {
    // Only pass statistics if they're actually loaded (not undefined)
    const hasStatistics = !!statistics

    return (
      <ExpensePlanStatistics
        plans={overview?.items || []}
        currentMonthTotal={hasStatistics ? statistics.currentMonthTotal : 0}
        previousMonthTotal={hasStatistics ? statistics.previousMonthTotal : 0}
        totalEstimated={hasStatistics ? statistics.totalEstimated : 0}
        pendingApproval={hasStatistics ? statistics.pendingApproval : 0}
        topDestination={hasStatistics ? statistics.topDestination : 'N/A'}
        statsLoading={statisticsShouldShowLoading}
        statsError={overviewError ? new Error(overviewError) : null}
        onWidgetClick={handleWidgetClick}
        activeWidgetKey={activeWidget ?? undefined}
        currentMonthClosedPlans={hasStatistics ? statistics.currentMonthClosedPlans : 0}
        previousMonthClosedPlans={hasStatistics ? statistics.previousMonthClosedPlans : 0}
        currencyCode={selectedCurrencyRef?.split(':').pop() || 'EUR'}
      />
    )
  }, [
    overview,
    statistics,
    statisticsShouldShowLoading,
    overviewError,
    handleWidgetClick,
    activeWidget,
    selectedCurrencyRef
  ])

  useEffect(() => {
    if (props.onContentHeaderChange) {
      props.onContentHeaderChange(contentHeader)
    }
  }, [props.onContentHeaderChange, contentHeader])

  // Enhanced table change handler for server-side sorting
  const handleTableChange = useCallback(
    (pagination: any, _filters: any, sorter: any) => {
      setCurrentPage(pagination.current)
      setPageSize(pagination.pageSize)

      // Handle sorting for server-side sorting
      if (sorter && sorter.field) {
        // If clicking the same field, cycle through: ascend -> descend -> clear
        if (sortField === sorter.field) {
          if (sortOrder === 'ascend') {
            setSortOrder('descend')
          } else if (sortOrder === 'descend') {
            setSortField('createdAt')
            setSortOrder('descend')
          } else {
            setSortOrder('ascend')
          }
        } else {
          // New field - start with ascend
          setSortField(sorter.field)
          setSortOrder('ascend')
        }
      } else {
        // Reset to default sorting (creation date descending)
        setSortField('createdAt')
        setSortOrder('descend')
      }
    },
    [sortField, sortOrder]
  )

  return (
    <ExpensePlansTable
      {...props}
      items={(overview?.items || []).filter(plan => plan.status !== 'DISCARDED')}
      isLoading={overviewLoading}
      error={overviewError}
      totalCount={overview?.totalCount || 0}
      currentPage={currentPage}
      pageSize={pageSize}
      onTableChange={handleTableChange}
      search={search}
      onSearchChange={setSearch}
      selectedFilters={selectedFilters}
      setFilters={(filters: string[]) => {
        // keep currency filter persisted
        persistCurrencySelection(props.userInfo?.employeeDetails?.employeeId, filters)
        // manage auto-select suppression
        if (filters.length === 0) {
          setSuppressCurrencyAutoSelect(true)
        } else if (filters.some(f => f.startsWith('currency:'))) {
          setSuppressCurrencyAutoSelect(false)
        }
        setFilters(filters)
      }}
      filterGroups={filterGroups}
      handleFilterChange={(filterId: string, selected: boolean) => {
        if (filterId.startsWith('currency:')) {
          const nonCurrency = selectedFilters.filter(f => !f.startsWith('currency:'))
          const newFilters = selected ? [...nonCurrency, filterId] : nonCurrency
          // persist currency change
          persistCurrencySelection(props.userInfo?.employeeDetails?.employeeId, newFilters)
          // If user deselects the currency, suppress auto-selection (persisted or default)
          setSuppressCurrencyAutoSelect(!selected)
          setFilters(newFilters)
        } else {
          handleFilterChange(filterId, selected)
        }
      }}
      clearFilters={handleClearAllFiltersNoParams}
      filterLabelMap={filterLabelMap}
      addFilter={addFilter}
      removeFilter={removeFilter}
      tableRefreshTrigger={tableRefreshTrigger}
      sortField={sortField}
      sortOrder={sortOrder}
      {...({ currencyStats } as any)}
    />
  )
}

export default ExpensePlansTab
