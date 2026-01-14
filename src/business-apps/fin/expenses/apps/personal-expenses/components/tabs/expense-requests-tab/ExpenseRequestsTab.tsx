import React, { useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'
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
  const [sortField, setSortField] = useState<string>('requestDate')
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend')
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

  const prevSelectedFiltersRef = useRef<string | null>(null)

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

  const debouncedFilters = useDebounce(memoizedFilters, 200)

  useEffect(() => {
    if (!currenciesInitialized) return

    if (contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
      fetchItems(debouncedFilters, currentPage, pageSize, sortField, sortOrder)
    }
  }, [
    fetchItems,
    currentPage,
    pageSize,
    debouncedFilters, // Use debounced filters instead of memoizedFilters
    sortField,
    sortOrder,
    contextProps.accessToken,
    contextProps.userInfo?.employeeDetails?.employeeId,
    currenciesInitialized
  ])

  useEffect(() => {
    const currentFiltersKey = JSON.stringify(selectedFilters)
    const previousFiltersKey = prevSelectedFiltersRef.current

    if (previousFiltersKey !== null && previousFiltersKey !== currentFiltersKey) {
      setCurrentPage(1)
    }

    prevSelectedFiltersRef.current = currentFiltersKey
  }, [selectedFilters])

  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          if (currenciesInitialized && contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
            fetchItems(debouncedFilters, currentPage, pageSize, sortField, sortOrder, { force: true })
          }

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
    debouncedFilters, // Use debounced filters instead of memoizedFilters
    sortField,
    sortOrder,
    contextProps.accessToken,
    contextProps.userInfo?.employeeDetails?.employeeId,
    currenciesInitialized
  ])

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

  const onContentHeaderChange = props.onContentHeaderChange
  useEffect(() => {
    if (onContentHeaderChange) {
      const timerId = setTimeout(() => {
        onContentHeaderChange(contentHeader)
      }, 0)
      return () => clearTimeout(timerId)
    }
  }, [onContentHeaderChange, contentHeader])

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

    if (sorter && sorter.field) {
      setSortField(sorter.field)
      setSortOrder(sorter.order)
    } else {
      setSortField('requestDate')
      setSortOrder('descend')
    }
  }, [])

  const handleSetFilter = useCallback(
    (filters: string[]) => {
      if (filters.length === 0) {
        clearFilters()
        setActiveWidget(null)
      } else {
        const removedFilters = selectedFilters.filter(f => !filters.includes(f))
        removedFilters.forEach(filterId => removeFilter(filterId))
      }
      setCurrentPage(1)
    },
    [clearFilters, selectedFilters, removeFilter]
  )

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
      {...({ currencyStats } as any)}
    />
  )
}

export default ExpenseRequestsTab
