/**
 * Advance Payment Tab Component
 * Delegates table functionality to AdvancePaymentsTable and manages statistics
 */

import React, { useMemo, useCallback } from 'react'
import AdvancePaymentsTable from './AdvancePaymentsTable'
import { useAdvancePayments } from '../../../hooks/useAdvancePayment'
import type { BackofficeTabProps } from '../common/backofficeTabProps'
import BackofficeTabHeaderAlert from '../common/BackofficeTabHeaderAlert'
import useBackofficeTabSearch from '../common/useBackofficeTabSearch'
import useBackofficeContentHeader from '../common/useBackofficeContentHeader'

type AdvancePaymentTabProps = BackofficeTabProps

function AdvancePaymentTab(props: AdvancePaymentTabProps) {
  const { isActive = true, onContentHeaderChange } = props

  const { searchTerm, handleSearchChange } = useBackofficeTabSearch()

  // Extract only the necessary props for statistics display
  const contextProps = {
    accessToken: props.accessToken,
    isActive // ⚡ PERFORMANCE: Only initialize loading state when tab is active
  }

  const { totalCount, advancePaymentStats, isLoading } = useAdvancePayments(contextProps)

  // Note: Statistics are now automatically fetched with the main payments query
  // No separate fetch call needed

  // Helper to get total amount display text (avoids nested ternary)
  const getTotalAmountText = useCallback((): string => {
    if (isLoading) {
      return 'Loading statistics...'
    }
    if (advancePaymentStats?.totalAmount) {
      return `Total Amount: ${advancePaymentStats.totalAmount}`
    }
    return 'Total Amount: $0'
  }, [isLoading, advancePaymentStats?.totalAmount])

  const statsHeader = useMemo(
    () => (
      <BackofficeTabHeaderAlert
        wrapperTestId="advance-payment-stats-header"
        alertTestId="advance-payment-stats-alert"
        title={`${totalCount || 0} Advance Payments`}
        description={getTotalAmountText()}
      />
    ),
    [totalCount, getTotalAmountText]
  )

  useBackofficeContentHeader(onContentHeaderChange, statsHeader)

  return (
    <AdvancePaymentsTable
      accessToken={props.accessToken}
      userInfo={props.userInfo}
      search={searchTerm}
      onSearchChange={handleSearchChange}
      isActive={isActive}
      data-testid="advance-payments-table-component"
    />
  )
}

export default AdvancePaymentTab
