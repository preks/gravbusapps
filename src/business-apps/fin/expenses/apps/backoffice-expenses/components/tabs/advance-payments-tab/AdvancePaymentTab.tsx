/**
 * Advance Payment Tab Component
 * Delegates table functionality to AdvancePaymentsTable and manages statistics
 */

import React, { useMemo, useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../../_i18n'
import AdvancePaymentsTable from './AdvancePaymentsTable'
import { useAdvancePayments } from '../../../hooks/useAdvancePayment'
import type { BackofficeTabProps } from '../common/backofficeTabProps'
import BackofficeTabHeaderAlert from '../common/BackofficeTabHeaderAlert'
import useBackofficeTabSearch from '../common/useBackofficeTabSearch'
import useBackofficeContentHeader from '../common/useBackofficeContentHeader'

type AdvancePaymentTabProps = BackofficeTabProps

function AdvancePaymentTab(props: Readonly<AdvancePaymentTabProps>) {
  const { isActive = true, onContentHeaderChange } = props
  const { t } = useTranslation(translations)

  const { searchTerm, handleSearchChange } = useBackofficeTabSearch()

  const contextProps = {
    accessToken: props.accessToken,
    isActive
  }

  const { totalCount, advancePaymentStats, isLoading } = useAdvancePayments(contextProps)

  const getTotalAmountText = useCallback((): string => {
    if (isLoading) {
      return t('advance-payment-loading-stats')
    }
    if (advancePaymentStats?.totalAmount) {
      return t('advance-payment-total-amount', { amount: advancePaymentStats.totalAmount })
    }
    return t('advance-payment-total-amount-zero')
  }, [isLoading, advancePaymentStats?.totalAmount, t])

  const statsHeader = useMemo(
    () => (
      <BackofficeTabHeaderAlert
        wrapperTestId="advance-payment-stats-header"
        alertTestId="advance-payment-stats-alert"
        title={t('advance-payment-count', { count: totalCount || 0 })}
        description={getTotalAmountText()}
      />
    ),
    [totalCount, getTotalAmountText, t]
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
