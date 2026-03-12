/**
 * Expense Request Management Tab Component
 * Delegates table functionality to ExpenseRequestsTable and manages statistics
 */

import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../../_i18n'
import ExpenseRequestsTable from './ExpenseRequestsTable'
import BackofficeTabHeaderAlert from '../common/BackofficeTabHeaderAlert'
import useBackofficeTabSearch from '../common/useBackofficeTabSearch'
import useBackofficeContentHeader from '../common/useBackofficeContentHeader'
import type { BackofficeTabProps } from '../common/backofficeTabProps'

type ExpenseRequestTabProps = BackofficeTabProps

function ExpenseRequestTab(props: Readonly<ExpenseRequestTabProps>) {
  const { onContentHeaderChange, isActive = true } = props
  const { t } = useTranslation(translations)

  const { searchTerm, handleSearchChange } = useBackofficeTabSearch()

  const overviewHeader = useMemo(
    () => (
      <BackofficeTabHeaderAlert
        wrapperTestId="expense-request-stats-header"
        alertTestId="expense-request-stats-alert"
        title={t('expense-requests-overview-title')}
        description={t('expense-requests-overview-description')}
      />
    ),
    [t]
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
