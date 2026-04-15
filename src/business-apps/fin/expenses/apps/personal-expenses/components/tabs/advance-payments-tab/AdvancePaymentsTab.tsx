import React, { useState, useMemo, useCallback, ReactNode } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import AdvancePaymentStatistics from './AdvancePaymentStatistics'
import AdvancePaymentsTable from './AdvancePaymentsTable'
import { useAdvancePaymentFilters } from '../../../hooks/useAdvancePaymentFilters'
import { getSelectedCurrencyRef } from '../../../utils/currencyUtils'
import { useProcessRefresh } from '@/business-apps/fin/expenses/common/hooks/useProcessRefresh'
import { useSyncContentHeader } from '@/business-apps/fin/expenses/common/hooks/useSharedTabState'

export interface AdvancePaymentsTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: ReactNode) => void
}

const AdvancePaymentsTab: React.FC<AdvancePaymentsTabProps> = props => {
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo
    }),
    [props.accessToken, props.userInfo]
  )

  const [tableRefreshTrigger, setTableRefreshTrigger] = useState(0)
  const bumpTableRefresh = useCallback(() => {
    setTableRefreshTrigger(prev => prev + 1)
  }, [])
  useProcessRefresh(bumpTableRefresh)

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
        key={refreshKey}
        accessToken={contextProps.accessToken}
        userInfo={contextProps.userInfo}
        selectedCurrencyRef={selectedCurrencyRef}
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

  useSyncContentHeader(contentHeader, props.onContentHeaderChange)

  const handleSearchChange = useCallback(
    (term: string) => {
      setSearchTerm(term)
    },
    [setSearchTerm]
  )

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

  const handleClearAllFiltersNoParams = useCallback(() => {
    setFilters([])
  }, [setFilters])

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
