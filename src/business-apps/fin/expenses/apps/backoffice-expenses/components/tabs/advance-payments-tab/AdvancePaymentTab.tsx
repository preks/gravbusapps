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
}

const AdvancePaymentTab: React.FC<AdvancePaymentTabProps> = props => {
  const { onContentHeaderChange } = props

  // Search term state for synchronization with table
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Extract only the necessary props for fetching statistics
  const contextProps = {
    accessToken: props.accessToken
  }

  const { totalCount, advancePaymentStats, fetchAdvancePaymentStatistics, statsLoading } =
    useAdvancePayments(contextProps)

  // Fetch statistics on component mount
  useEffect(() => {
    fetchAdvancePaymentStatistics()
  }, [fetchAdvancePaymentStatistics])

  // Create statistics header and pass to parent via onContentHeaderChange
  useEffect(() => {
    if (onContentHeaderChange) {
      const header = (
        <div className="gba:mb-4" data-testid="advance-payment-stats-header">
          <Alert variant="default" data-testid="advance-payment-stats-alert">
            <div>
              <h4 className="gba:font-semibold">{totalCount || 0} Advance Payments</h4>
              <p className="gba:text-sm gba:mt-1">
                {advancePaymentStats?.totalAmount
                  ? `Total Amount: ${advancePaymentStats.totalAmount}`
                  : 'Loading statistics...'}
              </p>
            </div>
          </Alert>
        </div>
      )
      onContentHeaderChange(header)
    }
  }, [onContentHeaderChange, totalCount, advancePaymentStats, statsLoading])

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
      data-testid="advance-payments-table-component"
    />
  )
}

export default AdvancePaymentTab
