import React, { useMemo, useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { useGetAdvancePaymentStatistics } from '../../../../hooks/useGetAdvancePaymentStatistics'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatCurrencyDisplay } from '../../../../utils'
import { kpiHeaderCurrencyLabel } from '../../../../utils/kpiHeaderCurrencyLabel'
import { getTranslatedMonthName } from '../../../../utils/monthTranslationUtils'
import personalTranslations from '../../../../_i18n'

interface AdvancePaymentStatisticsProps extends BusinessAppContextProps {
  statsLoading?: boolean
  statsError?: string | null
  fetchAdvancePaymentStatistics?: () => Promise<void>
  onWidgetClick?: (widgetKey: string) => void
  activeWidgetKey?: string
  selectedCurrencyRef?: string
}

const AdvancePaymentStatistics: React.FC<AdvancePaymentStatisticsProps> = ({
  statsLoading = false,
  statsError = null,
  onWidgetClick,
  activeWidgetKey,
  selectedCurrencyRef = 'Currency:v1:EUR',
  ...contextProps
}) => {
  const { t } = useTranslation(personalTranslations)
  // Memoize context props to ensure stable reference
  const stableContextProps = useMemo(
    () => ({
      accessToken: contextProps.accessToken,
      userInfo: contextProps.userInfo
    }),
    [contextProps.accessToken, contextProps.userInfo]
  )

  // Use the statistics hook
  const {
    statistics,
    isLoading: hookLoading,
    error: hookError,
    fetchStatistics
  } = useGetAdvancePaymentStatistics(stableContextProps, selectedCurrencyRef)

  // Combine loading states
  const isLoading = statsLoading || hookLoading
  const error = statsError || hookError

  // Fetching is handled inside the hook; avoid duplicate calls from here

  // Calculate current month name
  const currentMonthName = getTranslatedMonthName(new Date(), t)

  const currencyCode = useMemo(() => selectedCurrencyRef?.split(':').pop()?.trim() || 'EUR', [selectedCurrencyRef])

  // Calculate percentage changes
  const paymentsPercentageChange = useMemo(() => {
    if (statistics.previousMonthPayments === 0) {
      return statistics.currentMonthPayments > 0 ? 100 : 0
    }
    return (
      ((statistics.currentMonthPayments - statistics.previousMonthPayments) / statistics.previousMonthPayments) * 100
    )
  }, [statistics.currentMonthPayments, statistics.previousMonthPayments])

  const amountPercentageChange = useMemo(() => {
    if (statistics.previousMonthAmount === 0) {
      return statistics.currentMonthAmount > 0 ? 100 : 0
    }
    return ((statistics.currentMonthAmount - statistics.previousMonthAmount) / statistics.previousMonthAmount) * 100
  }, [statistics.currentMonthAmount, statistics.previousMonthAmount])

  // Generate trend data
  const paymentsTrend = useMemo(() => {
    if (statistics.previousMonthPayments === 0 && statistics.currentMonthPayments > 0) {
      return {
        value: '+100%',
        positive: true,
        description: t('personal-expenses-from-last-month')
      }
    }
    if (paymentsPercentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: t('personal-expenses-from-last-month')
      }
    }
    const sign = paymentsPercentageChange > 0 ? '+' : ''
    return {
      value: `${sign}${paymentsPercentageChange.toFixed(0)}%`,
      positive: paymentsPercentageChange >= 0,
      description: t('personal-expenses-from-last-month')
    }
  }, [t, paymentsPercentageChange, statistics.currentMonthPayments, statistics.previousMonthPayments])

  const amountTrend = useMemo(() => {
    if (statistics.previousMonthAmount === 0 && statistics.currentMonthAmount > 0) {
      return {
        value: '+100%',
        positive: true,
        description: t('personal-expenses-from-last-month')
      }
    }
    if (amountPercentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: t('personal-expenses-from-last-month')
      }
    }
    const sign = amountPercentageChange > 0 ? '+' : ''
    return {
      value: `${sign}${amountPercentageChange.toFixed(0)}%`,
      positive: amountPercentageChange >= 0,
      description: t('personal-expenses-from-last-month')
    }
  }, [t, amountPercentageChange, statistics.currentMonthAmount, statistics.previousMonthAmount])

  // Handle widget clicks (WidgetGroup also calls widget.onClick for card styling; keep no-op there to avoid double-invoke)
  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      if (isLoading) {
        return
      }

      if (onWidgetClick) {
        onWidgetClick(widgetKey)
      }
    },
    [onWidgetClick, isLoading]
  )

  const widgetClickNoop = useCallback(() => {}, [])

  // No-trend widgets: value, empty row, footer (same layout as expense dashboard)
  const widgets: WidgetItem[] = useMemo(
    () => [
      {
        key: 'total-payments',
        title: `${t('personal-expenses-total-payments-for-month')} ${currentMonthName}`,
        value: statistics.currentMonthPayments || 0,
        prefix: kpiHeaderCurrencyLabel(currencyCode),
        color: '#1677ff',
        span: { xs: 24, sm: 12, md: 6 },
        description: t('personal-expenses-submitted-advance-payments'),
        trend: paymentsTrend,
        active: activeWidgetKey === 'total-payments',
        onClick: widgetClickNoop
      },
      {
        key: 'total-amount',
        title: `${t('personal-expenses-total-amount-for-month')} ${currentMonthName}`,
        value: `${formatCurrencyDisplay(String(statistics.currentMonthAmount || '0'), currencyCode)}`,
        color: '#3f8600',
        span: { xs: 24, sm: 12, md: 6 },
        description: t('personal-expenses-across-all-payments'),
        trend: amountTrend,
        valueIsString: true,
        active: activeWidgetKey === 'total-amount',
        onClick: widgetClickNoop
      },
      {
        key: 'pending-payments',
        title: t('personal-expenses-pending-payments-title'),
        value: statistics.pendingPayments || 0,
        prefix: kpiHeaderCurrencyLabel(currencyCode),
        color: '#faad14',
        span: { xs: 24, sm: 12, md: 6 },
        footer: t('personal-expenses-awaiting-approval'),
        trend: { hideBadge: true, value: '', description: '\u200B' },
        active: activeWidgetKey === 'pending-payments',
        onClick: widgetClickNoop
      },
      {
        key: 'approved-payments',
        title: t('personal-expenses-approved-payments-title'),
        value: statistics.approvedPayments || 0,
        prefix: kpiHeaderCurrencyLabel(currencyCode),
        color: '#52c41a',
        span: { xs: 24, sm: 12, md: 6 },
        footer: t('personal-expenses-ready-for-processing'),
        trend: { hideBadge: true, value: '', description: '\u200B' },
        active: activeWidgetKey === 'approved-payments',
        onClick: widgetClickNoop
      }
    ],
    [t, currentMonthName, currencyCode, statistics, paymentsTrend, amountTrend, activeWidgetKey, widgetClickNoop]
  )

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={isLoading}
      error={error}
      onRetry={fetchStatistics}
      onWidgetClick={handleWidgetClick}
      skeletonCount={4}
      useWidgetStructureForLoading={true}
      emptyText={t('personal-expenses-no-advance-payment-statistics')}
      data-testid="advance-payment-statistics"
    />
  )
}

export default AdvancePaymentStatistics
