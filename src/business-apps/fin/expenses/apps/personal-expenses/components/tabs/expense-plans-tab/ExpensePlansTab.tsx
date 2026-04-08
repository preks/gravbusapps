import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import ExpensePlansTable from './table/ExpensePlansTable'
import { useExpensePlansOverview } from '../../../hooks/useExpensePlansOverview'
import { useExpensePlanFilters } from '../../../hooks/useExpensePlanFilters'
import { getActiveWidgetFromFilters } from '../../../hooks/useExpensePlanWidgetFilters'
import ExpensePlanStatistics from './statistics/ExpensePlanStatistics'
import { getPlanCardStrategies, preserveCurrencyAndResetPlans } from './utils/cardStrategies'
import { useExpensePlanCurrencies } from '../../../hooks/useExpensePlanCurrencies'
import { extractCurrencyCode } from '../../../../../common/utils/currencyUtils'
import {
  DEFAULT_CURRENCY_REF,
  type CurrencyStat,
  getSelectedCurrencyRef,
  pickMostUsedCurrencyRef
} from '../../../utils/currencyUtils'
import { useExpensePlansTabTopDestinationUi } from '../../../hooks/useExpensePlansTabTopDestinationUi'
import { useExpensePlansOverviewSync } from '../../../hooks/useExpensePlansOverviewSync'
import { useExpensePlansTabPaginationEffects } from '../../../hooks/useExpensePlansTabPaginationEffects'
import { useExpensePlansProcessCompletionRefresh } from '../../../hooks/useExpensePlansProcessCompletionRefresh'
import { useExpensePlansTableSort } from '../../../hooks/useExpensePlansTableSort'
import { composeExpensePlansOverviewFilters } from './utils/buildExpensePlansOverviewFilters'
import { expensePlanAvailableStatuses } from './config/expensePlanAvailableStatuses'

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
  const mostUsedCurrencyRef = useMemo(() => pickMostUsedCurrencyRef(currencyStats as CurrencyStat[]), [currencyStats])
  const selectedCurrencyRef = useMemo(
    () => getSelectedCurrencyRef(selectedFilters, mostUsedCurrencyRef),
    [selectedFilters, mostUsedCurrencyRef]
  )
  const currencyCodeForCards = useMemo(() => {
    if (!selectedCurrencyRef) return extractCurrencyCode(DEFAULT_CURRENCY_REF) ?? 'EUR'
    const code = currencyStats.find((s: CurrencyStat) => s.ref === selectedCurrencyRef)?.code
    return code ?? extractCurrencyCode(selectedCurrencyRef) ?? 'EUR'
  }, [selectedCurrencyRef, currencyStats])

  const statistics = overview?.statistics
  const statisticsShouldShowLoading = !statistics || isStatisticsLoading || (overviewLoading && !statistics)

  const explicitSelectedCurrencyRef = useMemo(() => {
    const token = selectedFilters.find(f => f.startsWith('currency:'))
    return token ? token.substring('currency:'.length) : undefined
  }, [selectedFilters])

  const { uiSelectedFilters, uiFilterLabelMap, setFiltersForTable } = useExpensePlansTabTopDestinationUi({
    destinationFilter,
    topDestination: overview?.topDestination,
    selectedFilters,
    filterLabelMap,
    setBaseFilters: setFilters,
    setDestinationFilter,
    activeWidget,
    setActiveWidget,
    setSuppressCurrencyAutoSelect
  })

  const { sortField, sortOrder, handleTableChange } = useExpensePlansTableSort({
    overviewTotalCount: overview?.totalCount,
    setCurrentPage,
    setPageSize
  })

  const employeeId = props.userInfo?.employeeDetails?.employeeId

  const memoizedFilters = useMemo(
    () =>
      composeExpensePlansOverviewFilters(
        getFilters,
        explicitSelectedCurrencyRef,
        activeWidget,
        destinationFilter
      ) as Record<string, unknown>,
    [getFilters, explicitSelectedCurrencyRef, activeWidget, destinationFilter, selectedFilters]
  )

  useExpensePlansOverviewSync({
    memoizedFilters,
    currentPage,
    setCurrentPage,
    pageSize,
    sortField,
    sortOrder,
    fetchOverview,
    accessToken: props.accessToken,
    employeeId,
    explicitSelectedCurrencyRef,
    suppressCurrencyAutoSelect
  })

  useExpensePlansTabPaginationEffects({
    selectedFilters,
    debouncedSearch,
    invalidateCache,
    overviewTotalCount: overview?.totalCount,
    currentPage,
    pageSize,
    setCurrentPage
  })

  useExpensePlansProcessCompletionRefresh({
    fetchOverview,
    memoizedFilters,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    accessToken: props.accessToken,
    employeeId,
    explicitSelectedCurrencyRef,
    suppressCurrencyAutoSelect,
    setActiveWidget,
    setTableRefreshTrigger
  })

  useEffect(() => {
    const expectedActiveWidget = getActiveWidgetFromFilters(selectedFilters)
    if (expectedActiveWidget !== activeWidget && activeWidget !== 'top-destinations') {
      setActiveWidget(expectedActiveWidget)
    }
  }, [selectedFilters, activeWidget])

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
      setEffectiveDateRange,
      handleFilterChange,
      setDestinationFilter,
      overview?.topDestination,
      selectedFilters,
      clearFilters,
      setFilters,
      mostUsedCurrencyRef
    ]
  )

  const handleClearAllFiltersNoParams = useCallback(() => {
    setSuppressCurrencyAutoSelect(true)
    setFilters([])
    setActiveWidget(null)
    setDestinationFilter(null)
  }, [setFilters])

  const contentHeader = useMemo(() => {
    const hasStatistics = !!statistics

    return (
      <ExpensePlanStatistics
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
      setFilters={setFiltersForTable}
      filterGroups={filterGroups}
      handleFilterChange={(filterId: string, selected: boolean) => {
        if (filterId.startsWith('currency:')) {
          const nonCurrency = selectedFilters.filter(f => !f.startsWith('currency:'))
          const newFilters = selected ? [...nonCurrency, filterId] : nonCurrency
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
      availableStatuses={expensePlanAvailableStatuses}
      {...({ currencyStats } as any)}
    />
  )
}

export default ExpensePlansTab
