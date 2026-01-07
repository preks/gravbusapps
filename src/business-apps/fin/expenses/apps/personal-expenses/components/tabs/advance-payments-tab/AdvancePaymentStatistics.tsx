import React, { useMemo, useCallback } from 'react'
import { FileTextOutlined, DollarOutlined, CalendarOutlined, BankOutlined } from '@ant-design/icons'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { useGetAdvancePaymentStatistics } from '../../../hooks/useGetAdvancePaymentStatistics'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../utils'
import { getTranslatedMonthName } from '../../../utils/monthTranslationUtils'

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

  // Handle widget clicks
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

  // Transform the stats data into widgets format
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
        prefix: <FileTextOutlined />,
        color: '#1677ff',
        span: { xs: 24, sm: 12, md: 6 },
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.submitted_advance_payments',
          'Submitted advance payments'
        ),
        trend: paymentsTrend,
        active: activeWidgetKey === 'total-payments',
        onClick: () => handleWidgetClick('total-payments')
      },
      {
        key: 'total-amount',
        title:
          getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.total_amount_for_month', 'Total Amount for') +
          ' ' +
          currentMonthName,
        value: `${formatCurrencyDisplay(String(statistics.currentMonthAmount || '0'), selectedCurrencyRef?.split(':').pop() || 'EUR')}`,
        prefix: <DollarOutlined />,
        color: '#3f8600',
        span: { xs: 24, sm: 12, md: 6 },
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.across_all_payments',
          'Across all payments'
        ),
        trend: amountTrend,
        valueIsString: true,
        active: activeWidgetKey === 'total-amount',
        onClick: () => handleWidgetClick('total-amount')
      },
      {
        key: 'pending-payments',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.pending_payments', 'Pending Payments'),
        value: statistics.pendingPayments || 0,
        prefix: <CalendarOutlined />,
        color: '#faad14',
        span: { xs: 24, sm: 12, md: 6 },
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.awaiting_approval',
          'Awaiting approval'
        ),
        active: activeWidgetKey === 'pending-payments',
        hideBadge: true,
        onClick: () => handleWidgetClick('pending-payments')
      },
      {
        key: 'approved-payments',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.approved_payments', 'Approved Payments'),
        value: statistics.approvedPayments || 0,
        prefix: <BankOutlined />,
        color: '#52c41a',
        span: { xs: 24, sm: 12, md: 6 },
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.ready_for_processing',
          'Ready for processing'
        ),
        active: activeWidgetKey === 'approved-payments',
        onClick: () => handleWidgetClick('approved-payments')
      }
    ],
    [currentMonthName, statistics, paymentsTrend, amountTrend, activeWidgetKey, handleWidgetClick]
  )

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={isLoading}
      error={error}
      onRetry={fetchStatistics}
      skeletonCount={4}
      emptyText={getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.no_advance_payment_statistics_available',
        'No advance payment statistics available.'
      )}
      data-testid="advance-payment-statistics"
    />
  )
}

export default AdvancePaymentStatistics
