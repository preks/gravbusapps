import React, { useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import ExpensePlansTable from './table/ExpensePlansTable'
import { useExpensePlansOverview } from '../../../hooks/useExpensePlansOverview'
import { useExpensePlanFilters } from '../../../hooks/useExpensePlanFilters'
import { getActiveWidgetFromFilters } from '../../../hooks/useExpensePlanWidgetFilters'
import ExpensePlanStatistics from './statistics/ExpensePlanStatistics'
import dayjs from 'dayjs'
import { getPlanCardStrategies, preserveCurrencyAndResetPlans } from './utils/cardStrategies'
// ExpenseStatus usage moved into strategies
import { useExpensePlanCurrencies } from '../../../hooks/useExpensePlanCurrencies'
import { getSelectedCurrencyRef, pickMostUsedCurrencyRef } from '../../../utils/currencyUtils'
import { getCatalogValue, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpenseStatus } from '../../../utils'

interface ExpensePlansTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void
}

const TOP_DESTINATION_FILTER_TOKEN_PREFIX = 'topDestination:'

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = props => {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [activeWidget, setActiveWidget] = useState<string | null>(null)
  const [destinationFilter, setDestinationFilter] = useState<string | null>(null)
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState<number>(0)
  const [suppressCurrencyAutoSelect, setSuppressCurrencyAutoSelect] = useState<boolean>(false)
  // Add sorting state for server-side sorting (default: plan date descending)
  const [sortField, setSortField] = useState<string>('planDate')
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | null>('descend')

  const {
    filterGroups,
    selectedFilters,
    setFilters,
    handleFilterChange,
    clearFilters,
    search,
    setSearch,
    debouncedSearch,
    getFilters,
    startDateRange,
    setStartDateRange,
    endDateRange,
    setEndDateRange,
    planDateRange,
    setPlanDateRange,
    effectiveDateRange,
    setEffectiveDateRange,
    filterLabelMap,
    addFilter,
    removeFilter
  } = useExpensePlanFilters()

  const availableStatuses = useMemo(() => Object.values(ExpenseStatus).filter(s => s !== ExpenseStatus.DISCARDED), [])

  const {
    data: overview,
    isLoading: overviewLoading,
    isStatisticsLoading,
    isDestinationLoading,
    error: overviewError,
    fetchOverview,
    invalidateCache
  } = useExpensePlansOverview(props)
  const { currencyStats } = useExpensePlanCurrencies(props, selectedFilters, setFilters)
  const mostUsedCurrencyRef = useMemo(
    () => pickMostUsedCurrencyRef(currencyStats as { ref: string; code: string; count: number }[]),
    [currencyStats]
  )
  const selectedCurrencyRef = useMemo(
    () => getSelectedCurrencyRef(selectedFilters, mostUsedCurrencyRef),
    [selectedFilters, mostUsedCurrencyRef]
  )
  const currencyCodeForCards = useMemo(() => {
    if (!selectedCurrencyRef) return 'EUR'
    const code = currencyStats.find((s: { ref: string; code: string }) => s.ref === selectedCurrencyRef)?.code
    return code ?? selectedCurrencyRef.split(':').pop() ?? 'EUR'
  }, [selectedCurrencyRef, currencyStats])
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

  // Add a filter "pill" for the Top Destination widget so users can see/remove it.
  const topDestinationPill = useMemo(() => {
    if (!destinationFilter || destinationFilter === 'N/A') return null
    const labelValue =
      overview?.topDestination && overview.topDestination !== 'N/A'
        ? getCatalogValue(overview.topDestination)
        : destinationFilter
    const token = `${TOP_DESTINATION_FILTER_TOKEN_PREFIX}${destinationFilter}`
    const label = `${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.top_destination', 'Top Destination')}: ${labelValue}`
    return { token, label }
  }, [destinationFilter, overview?.topDestination])

  const uiSelectedFilters = useMemo(() => {
    if (!topDestinationPill) return selectedFilters
    if (selectedFilters.includes(topDestinationPill.token)) return selectedFilters
    return [...selectedFilters, topDestinationPill.token]
  }, [selectedFilters, topDestinationPill])

  const uiFilterLabelMap = useMemo(() => {
    if (!topDestinationPill) return filterLabelMap
    return { ...filterLabelMap, [topDestinationPill.token]: topDestinationPill.label }
  }, [filterLabelMap, topDestinationPill])

  // Track previous selectedFilters to reset pagination when filters change.
  const prevSelectedFiltersRef = useRef<string | null>(null)
  // When filters change we must fetch page 1; track filters key so the fetch effect can force page 1.
  const lastFiltersKeyRef = useRef<string>('')
  // Track previous search to detect when search is cleared
  const prevSearchRef = useRef<string>('')

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
        topDestination: overview?.topDestination || 'N/A'
      })

      if (isDeactivating) {
        strategies[widgetKey]?.remove()
        // Restore to base state while preserving currency selection
        preserveCurrencyAndResetPlans(selectedFilters, clearFilters, setFilters, mostUsedCurrencyRef)
        if (widgetKey === 'top-destinations') setDestinationFilter(null)
        return
      }

      preserveCurrencyAndResetPlans(selectedFilters, clearFilters, setFilters, mostUsedCurrencyRef)
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
      overview?.topDestination,
      selectedFilters,
      clearFilters,
      setFilters,
      mostUsedCurrencyRef
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
        // Build the travelRegion matching conditions - try id, value, code, and translations
        const travelRegionConditions: any[] = [
          { value: { _eq: destinationFilter } },
          { code: { _eq: destinationFilter } }
        ]

        // Try to match by id if destinationFilter looks like a UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(destinationFilter)) {
          travelRegionConditions.push({ id: { _eq: destinationFilter } })
        }

        // Also match by translations value
        travelRegionConditions.push({ translations: { value: { _eq: destinationFilter } } })

        const destinationCondition = {
          expenseRequestTrip: {
            _and: [
              { pointType: { _eq: 'DESTINATION_POINT' } },
              { isDeleted: { _eq: false } },
              {
                travelRegion: {
                  _or: travelRegionConditions
                }
              }
            ]
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

  // Memoize the filters for API calls. Depend on selectedFilters (not debounced) so that when the
  // user applies a status/filter, we refetch immediately with the new filters and correct page.
  const memoizedFilters = useMemo(() => {
    const baseFilters = getFilters()
    // Filter by currency only when explicitly selected
    if (explicitSelectedCurrencyRef) {
      baseFilters._and = baseFilters._and || []
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
  }, [getFilters, buildWidgetFilters, explicitSelectedCurrencyRef, selectedFilters])

  // Only fetch when filters, page, pageSize, or sorting changes and context is ready
  useEffect(() => {
    const hasExplicitCurrency = !!explicitSelectedCurrencyRef
    const canFetch =
      !!props.accessToken &&
      !!props.userInfo?.employeeDetails?.employeeId &&
      (suppressCurrencyAutoSelect || hasExplicitCurrency)

    if (canFetch) {
      const statsCurrency = explicitSelectedCurrencyRef || 'Currency:v1:EUR'
      const filtersKey = JSON.stringify(memoizedFilters)
      const filtersChanged = filtersKey !== lastFiltersKeyRef.current
      if (filtersChanged) {
        lastFiltersKeyRef.current = filtersKey
        setCurrentPage(1)
      }
      const pageToFetch = filtersChanged ? 1 : currentPage
      fetchOverview(memoizedFilters, pageToFetch, pageSize, sortField, sortOrder, statsCurrency)
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
    suppressCurrencyAutoSelect
  ])

  // When filters change (e.g. apply status filter while on page 2), reset to page 1 so the next
  // fetch (triggered by memoizedFilters + currentPage in the main effect) uses page 1.
  useEffect(() => {
    const currentFiltersKey = JSON.stringify(selectedFilters)
    const previousFiltersKey = prevSelectedFiltersRef.current

    if (previousFiltersKey !== null && previousFiltersKey !== currentFiltersKey) {
      setCurrentPage(1)
    }

    prevSelectedFiltersRef.current = currentFiltersKey
  }, [selectedFilters])

  // Force refetch when search is cleared to ensure table repopulates with correct filters
  useEffect(() => {
    const prevSearch = (prevSearchRef.current || '').trim()
    const currentSearch = (debouncedSearch || '').trim()

    // Detect when debounced search transitions from non-empty to empty
    // This ensures we wait for debounce to update before invalidating cache
    if (prevSearch !== '' && currentSearch === '') {
      // Search was cleared - invalidate cache to force fresh fetch with updated (empty) filters
      invalidateCache()
    }

    prevSearchRef.current = debouncedSearch || ''
  }, [debouncedSearch, invalidateCache])

  // Validate current page after data loads to prevent invalid pagination (e.g., "Page 4 of 3")
  // Only validate when totalCount actually changes, not on every render
  const prevTotalCountRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    const totalCount = overview?.totalCount
    // Only validate if totalCount changed and we're on an invalid page
    if (totalCount !== undefined && totalCount !== prevTotalCountRef.current && currentPage > 1) {
      const maxPages = Math.max(1, Math.ceil(totalCount / pageSize))
      if (currentPage > maxPages) {
        // Current page is invalid - reset to page 1
        setCurrentPage(1)
      }
      prevTotalCountRef.current = totalCount
    } else if (totalCount !== undefined) {
      prevTotalCountRef.current = totalCount
    }
  }, [overview?.totalCount, currentPage, pageSize])

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
        topDestination={overview?.topDestination ?? 'N/A'}
        statsLoading={statisticsShouldShowLoading}
        destinationLoading={isDestinationLoading}
        statsError={overviewError ? new Error(overviewError) : null}
        onWidgetClick={handleWidgetClick}
        activeWidgetKey={activeWidget ?? undefined}
        currentMonthClosedPlans={hasStatistics ? statistics.currentMonthClosedPlans : 0}
        previousMonthClosedPlans={hasStatistics ? statistics.previousMonthClosedPlans : 0}
        currencyCode={currencyCodeForCards}
      />
    )
  }, [
    overview,
    statistics,
    statisticsShouldShowLoading,
    overviewError,
    handleWidgetClick,
    activeWidget,
    currencyCodeForCards
  ])

  useEffect(() => {
    if (props.onContentHeaderChange) {
      props.onContentHeaderChange(contentHeader)
    }
  }, [props.onContentHeaderChange, contentHeader])

  const getNextSortState = useCallback(
    (sorter: any): { nextField: string; nextOrder: 'ascend' | 'descend' } => {
      if (!sorter?.field) {
        return { nextField: 'planDate', nextOrder: 'descend' }
      }
      const isSameColumn = sortField === sorter.field
      const orderFromTable = sorter.order ?? null
      if (isSameColumn && orderFromTable !== null) {
        return { nextField: sorter.field, nextOrder: orderFromTable }
      }
      if (isSameColumn) {
        if (sortOrder === 'ascend') return { nextField: sorter.field, nextOrder: 'descend' }
        if (sortOrder === 'descend') return { nextField: 'planDate', nextOrder: 'descend' }
        return { nextField: sorter.field, nextOrder: 'ascend' }
      }
      return { nextField: sorter.field, nextOrder: 'ascend' }
    },
    [sortField, sortOrder]
  )

  const handleTableChange = useCallback(
    (pagination: any, _filters: any, sorter: any) => {
      const totalCount = overview?.totalCount || 0
      const maxPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize))
      const validPage = pagination.current > maxPages ? 1 : pagination.current

      setCurrentPage(validPage)
      setPageSize(pagination.pageSize)

      const sortPayload = sorter && typeof sorter === 'object' && 'field' in sorter
      if (sortPayload) {
        const { nextField, nextOrder } = getNextSortState(sorter)
        setSortField(nextField)
        setSortOrder(nextOrder)
      }
    },
    [getNextSortState, overview?.totalCount]
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
      selectedFilters={uiSelectedFilters}
      setFilters={(filters: string[]) => {
        const hasTopDestination = filters.some(f => f.startsWith(TOP_DESTINATION_FILTER_TOKEN_PREFIX))
        if (!hasTopDestination) {
          // If user removed the destination pill (or cleared all), also clear destination filtering + widget highlight.
          if (destinationFilter) setDestinationFilter(null)
          if (activeWidget === 'top-destinations') setActiveWidget(null)
        }

        // Strip synthetic token before storing in the real filters state.
        const strippedFilters = filters.filter(f => !f.startsWith(TOP_DESTINATION_FILTER_TOKEN_PREFIX))

        // manage auto-select suppression (must allow fetch when toolbar Currency = All: no currency token)
        if (strippedFilters.length === 0) {
          setSuppressCurrencyAutoSelect(true)
        } else if (strippedFilters.some(f => f.startsWith('currency:'))) {
          setSuppressCurrencyAutoSelect(false)
        } else {
          setSuppressCurrencyAutoSelect(true)
        }
        setFilters(strippedFilters)
      }}
      filterGroups={filterGroups}
      handleFilterChange={(filterId: string, selected: boolean) => {
        if (filterId.startsWith('currency:')) {
          const nonCurrency = selectedFilters.filter(f => !f.startsWith('currency:'))
          const newFilters = selected ? [...nonCurrency, filterId] : nonCurrency
          // If user deselects the currency, suppress auto-selection on next mount
          setSuppressCurrencyAutoSelect(!selected)
          setFilters(newFilters)
        } else {
          handleFilterChange(filterId, selected)
        }
      }}
      clearFilters={handleClearAllFiltersNoParams}
      filterLabelMap={uiFilterLabelMap}
      addFilter={addFilter}
      removeFilter={removeFilter}
      tableRefreshTrigger={tableRefreshTrigger}
      sortField={sortField}
      sortOrder={sortOrder}
      planDateRange={planDateRange}
      setPlanDateRange={setPlanDateRange}
      startDateRange={startDateRange}
      setStartDateRange={setStartDateRange}
      endDateRange={endDateRange}
      setEndDateRange={setEndDateRange}
      effectiveDateRange={effectiveDateRange}
      setEffectiveDateRange={setEffectiveDateRange}
      onFiltersChange={() => setCurrentPage(1)}
      availableStatuses={availableStatuses}
      {...({ currencyStats } as any)}
    />
  )
}

export default ExpensePlansTab
