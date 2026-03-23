import React, { useState, useEffect, ReactNode, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import AdvancePaymentStatistics from './AdvancePaymentStatistics'
import AdvancePaymentsTable from './AdvancePaymentsTable'
import { useAdvancePaymentFilters } from '../../../hooks/useAdvancePaymentFilters'
// import { useExpenseCurrencies } from '../../../hooks/useExpenseCurrencies';
import { getSelectedCurrencyRef } from '../../../utils/currencyUtils'

export interface AdvancePaymentsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void
}

const AdvancePaymentsTab: React.FC<AdvancePaymentsTabProps> = props => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo
    }),
    [props.accessToken, props.userInfo]
  )

  // Table refresh trigger state
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState<number>(0)

  // Use the enhanced advance payment filters hook
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    amountRange,
    advanceRange,
    setAmountRange,
    setAdvanceRange,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
    selectedFilters,
    setFilters,
    removeFilter,
    filtersVersion
  } = useAdvancePaymentFilters()

  // Create memoized content header with statistics component
  const contentHeader = useMemo(() => {
    const selectedCurrencyRef = getSelectedCurrencyRef(selectedFilters || [], 'Currency:v1:EUR')
    const refreshKey = JSON.stringify({
      searchTerm,
      statusFilter,
      amountRange,
      advanceRange,
      selectedCurrencyRef
    })
    return (
      <AdvancePaymentStatistics
        accessToken={contextProps.accessToken}
        userInfo={contextProps.userInfo}
        selectedCurrencyRef={selectedCurrencyRef}
        refreshKey={refreshKey}
      />
    )
  }, [
    contextProps.accessToken,
    contextProps.userInfo,
    selectedFilters,
    searchTerm,
    statusFilter,
    amountRange,
    advanceRange,
    filtersVersion
  ])

  // Update the content header when it changes
  useEffect(() => {
    if (props.onContentHeaderChange) {
      props.onContentHeaderChange(contentHeader)
    }
  }, [props.onContentHeaderChange, contentHeader])

  // Handle search term changes from table
  const handleSearchChange = useCallback(
    (term: string) => {
      setSearchTerm(term)
    },
    [setSearchTerm]
  )

  // Handle filter changes (enforce single selection for currency)
  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      if (filterId.startsWith('currency:')) {
        const nonCurrency = (selectedFilters || []).filter(f => !f.startsWith('currency:'))
        setFilters(selected ? [...nonCurrency, filterId] : nonCurrency)
        return
      }
      handleDataFilterChange(filterId, selected)
    },
    [handleDataFilterChange, selectedFilters, setFilters]
  )

  // Note: clearing handled via handleClearAllFiltersNoParams and setFilters([])
  // Wrapper for clear all filters without parameters (for table clearFilters prop)
  const handleClearAllFiltersNoParams = useCallback(() => {
    // Use the enhanced setFilters which handles clearing all filters properly
    setFilters([])
  }, [setFilters])

  // Process completion event listener to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
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
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener)
      })

      window.dispatchEvent = originalDispatchEvent
    }
  }, [])

  return (
    <AdvancePaymentsTable
      {...contextProps}
      search={searchTerm}
      onSearchChange={handleSearchChange}
      activeFilter={statusFilter}
      onFilterChange={setFilters}
      onClearFilters={handleClearAllFiltersNoParams}
      filterGroups={filterGroups}
      handleFilterChange={handleFilterChange}
      filterLabelMap={filterLabelMap}
      amountRange={amountRange}
      advanceRange={advanceRange}
      setAmountRange={setAmountRange}
      setAdvanceRange={setAdvanceRange}
      selectedFilters={selectedFilters}
      removeFilter={removeFilter}
      tableRefreshTrigger={tableRefreshTrigger}
    />
  )
}

export default AdvancePaymentsTab
