import React, { useMemo, useCallback } from 'react'
import { FileTextIcon, CurrencyDollarIcon, CalendarIcon, BankIcon } from '@phosphor-icons/react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { useGetAdvancePaymentStatistics } from '../../../../hooks/useGetAdvancePaymentStatistics'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../../utils'
import { getTranslatedMonthName } from '../../../../utils/monthTranslationUtils'

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
  const currentMonthName = getTranslatedMonthName(new Date())

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
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
      }
    }
    if (paymentsPercentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
      }
    }
    const sign = paymentsPercentageChange > 0 ? '+' : ''
    return {
      value: `${sign}${paymentsPercentageChange.toFixed(0)}%`,
      positive: paymentsPercentageChange >= 0,
      description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
    }
  }, [paymentsPercentageChange, statistics.currentMonthPayments, statistics.previousMonthPayments])

  const amountTrend = useMemo(() => {
    if (statistics.previousMonthAmount === 0 && statistics.currentMonthAmount > 0) {
      return {
        value: '+100%',
        positive: true,
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
      }
    }
    if (amountPercentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
      }
    }
    const sign = amountPercentageChange > 0 ? '+' : ''
    return {
      value: `${sign}${amountPercentageChange.toFixed(0)}%`,
      positive: amountPercentageChange >= 0,
      description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
    }
  }, [amountPercentageChange, statistics.currentMonthAmount, statistics.previousMonthAmount])

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
        title:
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:personal_expenses.total_payments_for_month',
            'Total Payments for'
          ) +
          ' ' +
          currentMonthName,
        value: statistics.currentMonthPayments || 0,
        prefix: <FileTextIcon size={16} />,
        color: '#1677ff',
        span: { xs: 24, sm: 12, md: 6 },
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.submitted_advance_payments',
          'Submitted advance payments'
        ),
        trend: paymentsTrend,
        active: activeWidgetKey === 'total-payments',
        onClick: widgetClickNoop
      },
      {
        key: 'total-amount',
        title:
          getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.total_amount_for_month', 'Total Amount for') +
          ' ' +
          currentMonthName,
        value: `${formatCurrencyDisplay(String(statistics.currentMonthAmount || '0'), selectedCurrencyRef?.split(':').pop() || 'EUR')}`,
        prefix: <CurrencyDollarIcon size={16} />,
        color: '#3f8600',
        span: { xs: 24, sm: 12, md: 6 },
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.across_all_payments',
          'Across all payments'
        ),
        trend: amountTrend,
        valueIsString: true,
        active: activeWidgetKey === 'total-amount',
        onClick: widgetClickNoop
      },
      {
        key: 'pending-payments',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.pending_payments', 'Pending Payments'),
        value: statistics.pendingPayments || 0,
        prefix: <CalendarIcon size={16} />,
        color: '#faad14',
        span: { xs: 24, sm: 12, md: 6 },
        footer: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.awaiting_approval', 'Awaiting approval'),
        trend: { hideBadge: true, value: '', description: '\u200B' },
        active: activeWidgetKey === 'pending-payments',
        onClick: widgetClickNoop
      },
      {
        key: 'approved-payments',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.approved_payments', 'Approved Payments'),
        value: statistics.approvedPayments || 0,
        prefix: <BankIcon size={16} />,
        color: '#52c41a',
        span: { xs: 24, sm: 12, md: 6 },
        footer: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.ready_for_processing',
          'Ready for processing'
        ),
        trend: { hideBadge: true, value: '', description: '\u200B' },
        active: activeWidgetKey === 'approved-payments',
        onClick: widgetClickNoop
      }
    ],
    [currentMonthName, statistics, paymentsTrend, amountTrend, activeWidgetKey, widgetClickNoop]
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
      emptyText={getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.no_advance_payment_statistics_available',
        'No advance payment statistics available.'
      )}
      data-testid="advance-payment-statistics"
    />
  )
}

export default AdvancePaymentStatistics
