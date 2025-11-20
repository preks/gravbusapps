import React, { useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { startProcess } from '@/common/utils/start-process'
import ExpenseRequestStatistics from './ExpenseRequestStatistics'
import ExpenseRequestsTable from './ExpenseRequestsTable'
import { useGetExpenseRequests } from '../../../hooks/useGetExpenseRequests'
import { useExpenseRequestFilters } from '../../../hooks/useExpenseRequestFilters'
import { useExpenseRequestCurrencies } from '../../../hooks/useExpenseRequestCurrencies'
import { getSelectedCurrencyRef } from '../../../utils/currencyUtils'
import { message } from 'antd'
import { getRequestCardStrategies, preserveCurrencyAndReset } from './cardStrategies'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface ExpenseRequestsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void
}

const ExpenseRequestsTab: React.FC<ExpenseRequestsTabProps> = props => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo
    }),
    [props.accessToken, props.userInfo]
  )

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [activeWidget, setActiveWidget] = useState<string | null>(null)

  // Server-side sorting state
  const [sortField, setSortField] = useState<string>('requestDate')
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend')

  // Table refresh trigger state
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState<number>(0)

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
    setRequestDateRange,
    setEffectiveDateRange,
    filterLabelMap,
    addFilter,
    removeFilter
  } = useExpenseRequestFilters()

  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseRequests(contextProps)
  const selectedCurrencyRef = useMemo(
    () => getSelectedCurrencyRef(selectedFilters, 'Currency:v1:EUR'),
    [selectedFilters]
  )
  const explicitSelectedCurrencyRef = useMemo(() => {
    const token = selectedFilters.find(f => f.startsWith('currency:'))
    return token ? token.substring('currency:'.length) : undefined
  }, [selectedFilters])
  const { currencyStats, initialized: currenciesInitialized } = useExpenseRequestCurrencies(
    contextProps,
    selectedFilters,
    setFilters
  )

  // Track previous filters to reset pagination when filters change.
  const prevSelectedFiltersRef = useRef<string | null>(null)

  // Helper function to get current month date range
  // Removed local getCurrentMonthRange; card strategy handles current month range

  // Handle widget clicks with immediate visual feedback
  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      const strategies = getRequestCardStrategies({
        setRequestDateRange,
        setStartDateRange,
        setEndDateRange,
        setEffectiveDateRange,
        handleFilterChange
      })

      const isDeactivating = activeWidget === widgetKey
      if (isDeactivating) {
        strategies[widgetKey]?.remove()
        setActiveWidget(null)
        return
      }

      preserveCurrencyAndReset(selectedFilters, clearFilters, addFilter)
      strategies[widgetKey]?.apply()
      setActiveWidget(widgetKey)
    },
    [
      activeWidget,
      clearFilters,
      handleFilterChange,
      setRequestDateRange,
      setStartDateRange,
      setEndDateRange,
      selectedFilters,
      addFilter
    ]
  )

  // Memoize the filters to prevent unnecessary API calls.
  // When a currency is selected, we match either by exact currencyRef OR by currency.code
  // so that different ref versions (v1/v2) still produce correct results.
  const memoizedFilters = useMemo(() => {
    const base = getFilters()
    if (explicitSelectedCurrencyRef) {
      const selectedCode = (explicitSelectedCurrencyRef.split(':').pop() || '').toUpperCase()
      base._and = base._and || []
      base._and.push({
        _or: [
          { currencyRef: { _eq: explicitSelectedCurrencyRef } },
          ...(selectedCode ? [{ currency: { code: { _eq: selectedCode } } }] : [])
        ]
      } as any)
    }
    return base
  }, [getFilters, explicitSelectedCurrencyRef])

  // Only fetch when filters, page, pageSize, or sorting changes
  useEffect(() => {
    // Avoid duplicate initial queries: wait until currency preselection flow completes
    if (!currenciesInitialized) return

    if (contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
      fetchItems(memoizedFilters, currentPage, pageSize, sortField, sortOrder)
    }
  }, [
    fetchItems,
    currentPage,
    pageSize,
    memoizedFilters,
    sortField,
    sortOrder,
    contextProps.accessToken,
    contextProps.userInfo?.employeeDetails?.employeeId,
    currenciesInitialized
  ])

  // Reset pagination when filters change (e.g., applying a status filter while on a later page).
  useEffect(() => {
    const currentFiltersKey = JSON.stringify(selectedFilters)
    const previousFiltersKey = prevSelectedFiltersRef.current

    if (previousFiltersKey !== null && previousFiltersKey !== currentFiltersKey) {
      setCurrentPage(1)
    }

    prevSelectedFiltersRef.current = currentFiltersKey
  }, [selectedFilters])

  // Process completion event listener to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          // Refresh expense requests data after successful process completion
          if (currenciesInitialized && contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
            fetchItems(memoizedFilters, currentPage, pageSize, sortField, sortOrder)
          }

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
    fetchItems,
    currentPage,
    pageSize,
    memoizedFilters,
    sortField,
    sortOrder,
    contextProps.accessToken,
    contextProps.userInfo?.employeeDetails?.employeeId
  ])

  // Memoize content header to prevent unnecessary re-renders
  const contentHeader = useMemo(() => {
    return (
      <ExpenseRequestStatistics
        {...contextProps}
        currencyCode={selectedCurrencyRef?.split(':').pop() || 'EUR'}
        {...({ selectedCurrencyRef } as any)}
        {...({ currencyInitialized: currenciesInitialized } as any)}
        onWidgetClick={handleWidgetClick}
        activeWidgetKey={activeWidget || undefined}
      />
    )
  }, [contextProps, handleWidgetClick, activeWidget, selectedCurrencyRef])

  // Memoize the label map to prevent unnecessary re-rendering

  // Update the content header only when it changes
  const onContentHeaderChange = props.onContentHeaderChange
  useEffect(() => {
    // Only update content header when the callback exists
    if (onContentHeaderChange) {
      // Use a small timeout to ensure proper React rendering cycle
      const timerId = setTimeout(() => {
        onContentHeaderChange(contentHeader)
      }, 0)
      return () => clearTimeout(timerId)
    }
  }, [onContentHeaderChange, contentHeader])

  // Handle adding a new expense request
  const handleAddExpenseRequest = useCallback(() => {
    const employeeId = contextProps.userInfo?.employeeDetails?.employeeId
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.')
      message.warning(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.user_information_not_loaded',
          'User information not loaded yet. Please wait a moment and try again.'
        )
      )
      return
    }

    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseRequest',
      payload: {
        employeeId: employeeId
      },
      builderType: 'NATIVE_SCREEN'
    })
  }, [contextProps.userInfo?.employeeDetails?.employeeId])

  const handleTableChange = useCallback((pagination: any, _filters: any, sorter: any) => {
    setCurrentPage(pagination.current)
    setPageSize(pagination.pageSize)

    // Handle sorting changes
    if (sorter && sorter.field) {
      setSortField(sorter.field)
      setSortOrder(sorter.order)
    } else {
      // Reset to default sorting
      setSortField('requestDate')
      setSortOrder('descend')
    }
  }, [])

  // Function for DataController setFilter requirement
  const handleSetFilter = useCallback(
    (filters: string[]) => {
      // This is called by DataController's "Clear all filters" button or individual filter removal
      if (filters.length === 0) {
        // Clear all filters
        clearFilters()
        setActiveWidget(null)
      } else {
        // Handle individual filter removal - find which filters were removed and remove them
        const removedFilters = selectedFilters.filter(f => !filters.includes(f))
        removedFilters.forEach(filterId => removeFilter(filterId))
      }
      setCurrentPage(1)
    },
    [clearFilters, selectedFilters, removeFilter]
  )

  // Adapter function for DataFilter component
  const handleFilterChangeCallback = useCallback(
    (filterId: string, selected: boolean) => {
      if (selected) {
        addFilter(filterId)
      } else {
        removeFilter(filterId)
      }
    },
    [addFilter, removeFilter]
  )

  return (
    <ExpenseRequestsTable
      {...props}
      items={items}
      isLoading={isLoading}
      error={error}
      totalCount={totalCount}
      currentPage={currentPage}
      pageSize={pageSize}
      onTableChange={handleTableChange}
      search={search}
      onSearchChange={setSearch}
      selectedFilters={selectedFilters}
      setFilters={handleSetFilter}
      filterGroups={filterGroups}
      handleFilterChange={(filterId: string, selected: boolean) => {
        if (filterId.startsWith('currency:')) {
          const nonCurrency = selectedFilters.filter(f => !f.startsWith('currency:'))
          setFilters(selected ? [...nonCurrency, filterId] : nonCurrency)
        } else {
          handleFilterChangeCallback(filterId, selected)
        }
      }}
      clearFilters={clearFilters}
      filterLabelMap={{ ...filterLabelMap }}
      onAddExpenseRequest={handleAddExpenseRequest}
      tableRefreshTrigger={tableRefreshTrigger}
      addFilter={addFilter}
      removeFilter={removeFilter}
      // pass currencyStats to render group in table
      {...({ currencyStats } as any)}
    />
  )
}

export default ExpenseRequestsTab
