/**
 * Advance Payment Tab Component
 * Delegates table functionality to AdvancePaymentsTable and manages statistics
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Alert } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import AdvancePaymentsTable from './AdvancePaymentsTable'
import { useAdvancePayments } from '../../../hooks/useAdvancePayment'

interface AdvancePaymentTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: React.ReactNode) => void
  isActive?: boolean // ⚡ PERFORMANCE: Only fetch data when tab is active
}

const AdvancePaymentTab: React.FC<AdvancePaymentTabProps> = props => {
  const { onContentHeaderChange, isActive = true } = props

  // Search term state for synchronization with table
  const [searchTerm, setSearchTerm] = useState<string>('')

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

  // Create statistics header and pass to parent via onContentHeaderChange
  useEffect(() => {
    if (onContentHeaderChange) {
      const header = (
        <div className="gba:mb-4" data-testid="advance-payment-stats-header">
          <Alert variant="default" data-testid="advance-payment-stats-alert">
            <div>
              <h4 className="gba:font-semibold">{totalCount || 0} Advance Payments</h4>
              <p className="gba:text-sm gba:mt-1">{getTotalAmountText()}</p>
            </div>
          </Alert>
        </div>
      )
      onContentHeaderChange(header)
    }
  }, [onContentHeaderChange, totalCount, getTotalAmountText])

  // Handle search changes from the table
  const handleSearchChange = useCallback((search: string) => {
    setSearchTerm(search)
  }, [])

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
