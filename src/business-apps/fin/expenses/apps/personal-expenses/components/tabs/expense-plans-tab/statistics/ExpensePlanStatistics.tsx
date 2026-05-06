import { getCatalogValue } from '@/common/utils/windowUtils'
import React, { useMemo, useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { CompassIcon } from '@phosphor-icons/react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { formatCurrencyDisplay } from '../../../../utils'
import { kpiHeaderCurrencyLabel } from '../../../../utils/kpiHeaderCurrencyLabel'
import { getTranslatedMonthName } from '../../../../utils/monthTranslationUtils'
import personalTranslations from '../../../../_i18n'

interface ExpensePlanStatisticsProps {
  currentMonthTotal: number
  previousMonthTotal: number
  totalEstimated: number
  pendingApproval: number
  topDestination: string | Record<string, unknown>
  statsLoading?: boolean
  destinationLoading?: boolean
  statsError?: Error | null
  fetchPlanStatistics?: () => void
  onWidgetClick?: (widgetKey: string) => void
  activeWidgetKey?: string
  // Add closed plans data
  currentMonthClosedPlans?: number
  previousMonthClosedPlans?: number
  currencyCode?: string
}

const ExpensePlanStatistics: React.FC<ExpensePlanStatisticsProps> = ({
  currentMonthTotal,
  previousMonthTotal,
  totalEstimated,
  pendingApproval,
  topDestination,
  statsLoading = false,
  destinationLoading = false,
  statsError = null,
  fetchPlanStatistics = () => {},
  onWidgetClick,
  activeWidgetKey,
  currentMonthClosedPlans = 0,
  previousMonthClosedPlans = 0,
  currencyCode = 'EUR'
}) => {
  const { t } = useTranslation(personalTranslations)
  const currentMonthName = getTranslatedMonthName(new Date(), t)

  const totalPlans = useMemo(() => currentMonthClosedPlans, [currentMonthClosedPlans])

  const percentageChange = useMemo(() => {
    if (previousMonthClosedPlans === 0) {
      return currentMonthClosedPlans > 0 ? 100 : 0
    }
    return ((currentMonthClosedPlans - previousMonthClosedPlans) / previousMonthClosedPlans) * 100
  }, [currentMonthClosedPlans, previousMonthClosedPlans])

  const plansTrend = useMemo(() => {
    if (previousMonthClosedPlans === 0 && currentMonthClosedPlans > 0) {
      return {
        value: '+100%',
        positive: true,
        description: t('expense-items-stat-from-last-month')
      }
    }
    if (percentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: t('expense-items-stat-from-last-month')
      }
    }
    const sign = percentageChange > 0 ? '+' : ''
    return {
      value: `${sign}${percentageChange.toFixed(0)}%`,
      positive: percentageChange >= 0,
      description: t('expense-items-stat-from-last-month')
    }
  }, [t, percentageChange, currentMonthClosedPlans, previousMonthClosedPlans])

  const estimatedAmountPercentageChange = useMemo(() => {
    if (previousMonthTotal === 0) {
      return currentMonthTotal > 0 ? 100 : 0
    }
    return ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
  }, [currentMonthTotal, previousMonthTotal])

  const estimatedAmountTrend = useMemo(() => {
    if (previousMonthTotal === 0 && currentMonthTotal > 0) {
      return {
        value: '+100%',
        positive: true,
        description: t('expense-items-stat-from-last-month')
      }
    }
    if (estimatedAmountPercentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: t('expense-items-stat-from-last-month')
      }
    }
    const sign = estimatedAmountPercentageChange > 0 ? '+' : ''
    return {
      value: `${sign}${estimatedAmountPercentageChange.toFixed(0)}%`,
      positive: estimatedAmountPercentageChange >= 0,
      description: t('expense-items-stat-from-last-month')
    }
  }, [t, estimatedAmountPercentageChange, currentMonthTotal, previousMonthTotal])

  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      if (statsLoading) {
        return
      }

      if (widgetKey === 'top-destinations' && destinationLoading) {
        return
      }

      if (onWidgetClick) {
        onWidgetClick(widgetKey)
      }
    },
    [onWidgetClick, statsLoading, destinationLoading]
  )

  const destinationValue = useMemo(() => {
    if (destinationLoading) {
      return t('expense-plans-stat-loading')
    }
    if (topDestination && topDestination !== 'N/A') {
      return getCatalogValue(topDestination)
    }
    return topDestination
  }, [destinationLoading, topDestination, t])

  const destinationDescription = useMemo(() => {
    if (destinationLoading) {
      return ''
    }
    if (topDestination && topDestination !== 'N/A') {
      return t('expense-plans-stat-most-frequent')
    }
    return t('expense-plans-stat-no-data-available')
  }, [destinationLoading, topDestination, t])

  const widgets: WidgetItem[] = useMemo(
    () => [
      {
        key: 'total-plans',
        title: `${t('expense-plans-stat-total-plans-for-month-prefix')} ${currentMonthName}`,
        value: totalPlans,
        prefix: kpiHeaderCurrencyLabel(currencyCode),
        color: '#1677ff',
        span: { xs: 24, sm: 12, md: 6 },
        description: t('expense-plans-stat-closed-expense-plans'),
        trend: plansTrend,
        active: activeWidgetKey === 'total-plans',
        onClick: () => handleWidgetClick('total-plans')
      },
      {
        key: 'total-estimated',
        title: `${t('expense-plans-stat-total-estimated-for-month-prefix')} ${currentMonthName}`,
        value: `${formatCurrencyDisplay(String(totalEstimated ?? '0'), currencyCode)}`,
        color: '#3f8600',
        span: { xs: 24, sm: 12, md: 6 },
        description: t('expense-plans-stat-estimated-expenses'),
        trend: estimatedAmountTrend,
        valueIsString: true,
        active: activeWidgetKey === 'total-estimated',
        onClick: () => handleWidgetClick('total-estimated')
      },
      {
        key: 'pending-approval',
        title: t('expense-plans-stat-pending-approval'),
        value: pendingApproval,
        prefix: kpiHeaderCurrencyLabel(currencyCode),
        color: '#faad14',
        span: { xs: 24, sm: 12, md: 6 },
        footer: t('expense-plans-stat-requires-action'),
        trend: { hideBadge: true, value: '', description: '\u200B' },
        active: activeWidgetKey === 'pending-approval',
        onClick: () => handleWidgetClick('pending-approval')
      },
      {
        key: 'top-destinations',
        title: t('expense-plans-stat-top-destination'),
        value: destinationValue,
        prefix: <CompassIcon size={16} />,
        color: '#722ed1',
        span: { xs: 24, sm: 12, md: 6 },
        valueIsString: true,
        footer: destinationDescription,
        trend: { hideBadge: true, value: '', description: '\u200B' },
        active: activeWidgetKey === 'top-destinations',
        onClick: () => {
          if (destinationLoading || !topDestination || topDestination === 'N/A') {
            return
          }
          handleWidgetClick('top-destinations')
        }
      }
    ],
    [
      t,
      currentMonthName,
      totalPlans,
      totalEstimated,
      pendingApproval,
      destinationValue,
      destinationDescription,
      plansTrend,
      estimatedAmountTrend,
      activeWidgetKey,
      handleWidgetClick,
      destinationLoading,
      topDestination,
      currencyCode
    ]
  )

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={statsLoading}
      error={statsError}
      onRetry={fetchPlanStatistics}
      onWidgetClick={onWidgetClick}
      skeletonCount={4}
      useWidgetStructureForLoading={true}
      emptyText={t('expense-plans-stat-empty')}
      data-testid="expense-plan-statistics"
    />
  )
}

export default ExpensePlanStatistics
