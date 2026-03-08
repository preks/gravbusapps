/**
 * Expense Request Management Tab Component
 * Delegates table functionality to ExpenseRequestsTable and manages statistics
 */

import React, { useMemo } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import ExpenseRequestsTable from './ExpenseRequestsTable'
import BackofficeTabHeaderAlert from '../common/BackofficeTabHeaderAlert'
import useBackofficeTabSearch from '../common/useBackofficeTabSearch'
import useBackofficeContentHeader from '../common/useBackofficeContentHeader'
import type { BackofficeTabProps } from '../common/backofficeTabProps'

type ExpenseRequestTabProps = BackofficeTabProps

function ExpenseRequestTab(props: ExpenseRequestTabProps) {
  const { onContentHeaderChange, isActive = true } = props

  const { searchTerm, handleSearchChange } = useBackofficeTabSearch()

  const overviewHeader = useMemo(
    () => (
      <BackofficeTabHeaderAlert
        wrapperTestId="expense-request-stats-header"
        alertTestId="expense-request-stats-alert"
        title={getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.overview_title',
          'Expense Requests Overview'
        )}
        description={getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.overview_description',
          'View and manage all expense requests across the organization'
        )}
      />
    ),
    []
  )

  useBackofficeContentHeader(onContentHeaderChange, overviewHeader)

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
