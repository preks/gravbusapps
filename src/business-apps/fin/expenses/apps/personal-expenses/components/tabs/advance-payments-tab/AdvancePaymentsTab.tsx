import React, { useState, useMemo, useCallback, useEffect, ReactNode } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import AdvancePaymentStatistics from './statistics/AdvancePaymentStatistics'
import AdvancePaymentsTable from './table/AdvancePaymentsTable'
import { useAdvancePaymentFilters } from '../../../hooks/useAdvancePaymentFilters'
import { useAdvancePaymentCurrencies } from '../../../hooks/useAdvancePaymentCurrencies'
import { getSelectedCurrencyRef, pickMostUsedCurrencyRef, type CurrencyStat } from '../../../utils/currencyUtils'
import { useProcessRefresh } from '@/business-apps/fin/expenses/common/hooks/useProcessRefresh'
import { useSyncContentHeader } from '@/business-apps/fin/expenses/common/hooks/useSharedTabState'
import { preserveCurrencyAndResetAdvancePayments } from './utils/cardStrategies'
import { TOTAL_PAYMENTS_CARD_STATUSES } from '../../../utils/totalPaymentsCardStatuses'

const APPROVED_LIKE_STATUSES: string[] = ['APPROVED', 'PAID', 'BOOKED']
const PENDING_STATUSES: string[] = ['PENDING', 'PREPARED']

function sortStringsForCompare(values: string[]): string[] {
  return [...values].sort((x, y) => x.localeCompare(y))
}

function statusSetsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = sortStringsForCompare(a)
  const sb = sortStringsForCompare(b)
  return sa.every((v, i) => v === sb[i])
}

function shouldClearActiveWidget(
  activeWidget: string | null,
  statusFilter: string[],
  cardCreatedAtRange: unknown
): boolean {
  if (!activeWidget) return false

  if (activeWidget === 'total-payments') {
    if (!cardCreatedAtRange) return true
    return !statusSetsEqual(statusFilter, TOTAL_PAYMENTS_CARD_STATUSES)
  }

  if (activeWidget === 'total-amount') {
    if (!cardCreatedAtRange) return true
    return !statusSetsEqual(statusFilter, APPROVED_LIKE_STATUSES)
  }

  if (activeWidget === 'pending-payments') {
    return !statusSetsEqual(statusFilter, PENDING_STATUSES)
  }

  if (activeWidget === 'approved-payments') {
    if (cardCreatedAtRange) return true
    return !statusSetsEqual(statusFilter, APPROVED_LIKE_STATUSES)
  }

  return false
}

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
  const [activeWidget, setActiveWidget] = useState<string | null>(null)
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
    cardCreatedAtRange,
    setCardCreatedAtRange,
    setAmountRange,
    setAdvanceRange,
    applyStatisticsCardFilter,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
    selectedFilters,
    setFilters,
    removeFilter
  } = useAdvancePaymentFilters()

  const { currencyStats } = useAdvancePaymentCurrencies(contextProps, selectedFilters, setFilters)
  const mostUsedCurrencyRef = useMemo(() => pickMostUsedCurrencyRef(currencyStats as CurrencyStat[]), [currencyStats])

  useEffect(() => {
    if (shouldClearActiveWidget(activeWidget, statusFilter, cardCreatedAtRange)) {
      setActiveWidget(null)
    }
  }, [activeWidget, statusFilter, cardCreatedAtRange])

  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      const isDeactivating = activeWidget === widgetKey
      const nextActive = isDeactivating ? null : widgetKey
      setActiveWidget(nextActive)

      if (isDeactivating) {
        preserveCurrencyAndResetAdvancePayments(selectedFilters, setFilters, mostUsedCurrencyRef)
        applyStatisticsCardFilter(null)
        return
      }

      preserveCurrencyAndResetAdvancePayments(selectedFilters, setFilters, mostUsedCurrencyRef)
      applyStatisticsCardFilter(widgetKey)
    },
    [activeWidget, selectedFilters, setFilters, mostUsedCurrencyRef, applyStatisticsCardFilter]
  )

  const contentHeader = useMemo(() => {
    const selectedCurrencyRef = getSelectedCurrencyRef(selectedFilters || [], 'Currency:v1:EUR')
    const refreshKey = JSON.stringify({
      searchTerm,
      statusFilter,
      amountRange,
      advanceRange,
      cardCreatedAtRange,
      selectedCurrencyRef
    })
    return (
      <AdvancePaymentStatistics
        key={refreshKey}
        accessToken={contextProps.accessToken}
        userInfo={contextProps.userInfo}
        selectedCurrencyRef={selectedCurrencyRef}
        onWidgetClick={handleWidgetClick}
        activeWidgetKey={activeWidget ?? undefined}
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
    cardCreatedAtRange,
    handleWidgetClick,
    activeWidget
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
    setActiveWidget(null)
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
      cardCreatedAtRange={cardCreatedAtRange}
      setCardCreatedAtRange={setCardCreatedAtRange}
      selectedFilters={selectedFilters}
      removeFilter={removeFilter}
      tableRefreshTrigger={tableRefreshTrigger}
    />
  )
}

export default AdvancePaymentsTab
