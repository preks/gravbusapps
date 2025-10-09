import React, { useMemo, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetExpenseRequests } from '../../../hooks/useGetExpenseRequests'
import { useExpenseRequestFilters } from '../../../hooks/useExpenseRequestFilters'
import ExpenseRequestStatistics from './ExpenseRequestStatistics'
import ExpenseRequestsTable from './ExpenseRequestsTable'

export interface ExpenseRequestsTabProps extends BusinessAppContextProps {
  moduleColor?: string
}

const ExpenseRequestsTab: React.FC<ExpenseRequestsTabProps> = props => {
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo
    }),
    [props.accessToken, props.userInfo]
  )

  const managerId = props.userInfo?.employeeDetails?.employeeId || ''

  const {
    search: searchTerm,
    setSearch: setSearchTerm,
    selectedFilters,
    primaryCurrency,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
    addFilter,
    removeFilter
  } = useExpenseRequestFilters({
    accessToken: props.accessToken,
    managerId,
    userInfo: props.userInfo
  })

  const { requestStats, requestStatsLoading, requestStatsError, fetchRequestStatistics } = useGetExpenseRequests({
    ...contextProps,
    currentCurrencyFilter: primaryCurrency,
    statisticsOnly: true
  })

  const {
    requests: expenseRequests,
    isLoading: requestsLoading,
    error: requestsError,
    totalCount,
    fetchRequests
  } = useGetExpenseRequests({
    ...contextProps,
    pageSize: 10,
    searchTerm,
    currentStatusFilter: selectedFilters,
    currentCurrencyFilter: primaryCurrency,
    statisticsOnly: false
  })

  useEffect(() => {
    if (props.accessToken) {
      fetchRequests('', 1, 10, 'requestDate:desc', selectedFilters, undefined, primaryCurrency)
    }
  }, [props.accessToken, fetchRequests, selectedFilters, primaryCurrency])

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="expense-requests-tab-container">
      <div className="gba:mb-6">
        <ExpenseRequestStatistics
          requestStats={requestStats}
          requestStatsLoading={requestStatsLoading}
          requestStatsError={requestStatsError}
          fetchRequestStatistics={fetchRequestStatistics}
          currencyFilter={primaryCurrency}
          addFilter={addFilter}
          removeFilter={removeFilter}
          selectedFilters={selectedFilters}
        />
      </div>

      <div className="gba:flex-1">
        <div data-testid="expense-requests-table-container">
          <ExpenseRequestsTable
            {...contextProps}
            expenseRequests={expenseRequests}
            loading={requestsLoading}
            error={requestsError}
            totalCount={totalCount}
            fetchRequests={fetchRequests}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedFilters={selectedFilters}
            filterGroups={filterGroups}
            filterLabelMap={filterLabelMap}
            addFilter={addFilter}
            removeFilter={removeFilter}
            handleDataFilterChange={handleDataFilterChange}
            primaryCurrency={primaryCurrency}
          />
        </div>
      </div>
    </div>
  )
}

export default ExpenseRequestsTab
