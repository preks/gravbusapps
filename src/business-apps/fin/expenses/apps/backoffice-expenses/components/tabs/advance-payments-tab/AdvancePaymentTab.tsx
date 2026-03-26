/**
 * Advance Payment Tab Component
 * Delegates table functionality to AdvancePaymentsTable and manages statistics
 */

import { useMemo, useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../../_i18n'
import AdvancePaymentsTable from './AdvancePaymentsTable'
import type { BackofficeTabProps } from '../common/backofficeTabProps'
import BackofficeTabHeaderAlert from '../common/BackofficeTabHeaderAlert'
import useBackofficeTabSearch from '../common/useBackofficeTabSearch'
import useBackofficeContentHeader from '../common/useBackofficeContentHeader'
import { useAdvancePaymentsTabState } from './hooks/useAdvancePaymentsTabState'
import type { AdvancePaymentOrderByClause } from '../../../hooks/useAdvancePayment'

type AdvancePaymentTabProps = BackofficeTabProps

function AdvancePaymentTab(props: Readonly<AdvancePaymentTabProps>) {
  const { isActive = true, onContentHeaderChange } = props
  const { t } = useTranslation(translations)

  const { searchTerm, handleSearchChange } = useBackofficeTabSearch()

  const {
    payments,
    totalCount,
    advancePaymentStats,
    isLoading,
    error,
    fetchPayments,
    setOrderBy,
    searchReporters,
    searchStatuses
  } = useAdvancePaymentsTabState({
    accessToken: props.accessToken,
    isActive
  })

  const getTotalAmountText = useCallback((): string => {
    if (isLoading) {
      return t('advance-payment-loading-stats')
    }
    if (advancePaymentStats?.totalAmount) {
      return t('advance-payment-total-amount', { amount: advancePaymentStats.totalAmount })
    }
    return t('advance-payment-total-amount-zero')
  }, [isLoading, advancePaymentStats?.totalAmount, t])

  const handleOrderByChange = useCallback(
    (orderBy: Array<Record<string, unknown>>) => {
      setOrderBy(orderBy as AdvancePaymentOrderByClause)
    },
    [setOrderBy]
  )

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
      payments={payments}
      totalCount={totalCount}
      isLoading={isLoading}
      error={error}
      fetchPayments={fetchPayments}
      setOrderBy={handleOrderByChange}
      searchReporters={searchReporters}
      searchStatuses={searchStatuses}
      data-testid="advance-payments-table-component"
    />
  )
}

export default AdvancePaymentTab
