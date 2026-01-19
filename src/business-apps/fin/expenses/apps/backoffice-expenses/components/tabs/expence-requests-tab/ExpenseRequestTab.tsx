/**
 * Expense Request Management Tab Component
 * Delegates table functionality to ExpenseRequestsTable and manages statistics
 */

import React, { useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import ExpenseRequestsTable from './ExpenseRequestsTable'

interface ExpenseRequestTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: React.ReactNode) => void
  isActive?: boolean // ⚡ PERFORMANCE: Only fetch data when tab is active
}

const ExpenseRequestTab: React.FC<ExpenseRequestTabProps> = props => {
  const { onContentHeaderChange, isActive = true } = props

  // Search term state for synchronization with table
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Create statistics header and pass to parent via onContentHeaderChange
  useEffect(() => {
    if (onContentHeaderChange) {
      const header = (
        <div className="gba:mb-4" data-testid="expense-request-stats-header">
          <Alert variant="default" data-testid="expense-request-stats-alert">
            <div>
              <h4 className="gba:font-semibold">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_request_list.overview_title',
                  'Expense Requests Overview'
                )}
              </h4>
              <p className="gba:text-sm gba:mt-1">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_request_list.overview_description',
                  'View and manage all expense requests across the organization'
                )}
              </p>
            </div>
          </Alert>
        </div>
      )
      onContentHeaderChange(header)
    }
  }, [onContentHeaderChange])

  // Handle search changes from the table
  const handleSearchChange = (search: string) => {
    setSearchTerm(search)
  }

  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo
    }),
    [props.accessToken, props.userInfo]
  )

  return (
    <ExpenseRequestsTable
      {...contextProps}
      search={searchTerm}
      onSearchChange={handleSearchChange}
      isActive={isActive}
    />
  )
}

export default ExpenseRequestTab
