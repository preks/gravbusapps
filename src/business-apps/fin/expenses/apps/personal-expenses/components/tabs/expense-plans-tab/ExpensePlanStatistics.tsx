import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils'
import React, { useMemo, useCallback } from 'react'
import { FileTextOutlined, DollarOutlined, CalendarOutlined, CompassOutlined } from '@ant-design/icons'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { formatCurrencyDisplay } from '../../../utils'
import { getTranslatedMonthName } from '../../../utils/monthTranslationUtils'

interface ExpensePlanStatisticsProps {
  plans: any[]
  currentMonthTotal: number
  previousMonthTotal: number
  totalEstimated: number
  pendingApproval: number
  topDestination: string | any // Can be string or catalog entry object
  statsLoading?: boolean
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
  statsError = null,
  fetchPlanStatistics = () => {},
  onWidgetClick,
  activeWidgetKey,
  currentMonthClosedPlans = 0,
  previousMonthClosedPlans = 0,
  currencyCode = 'EUR'
}) => {
  // Calculate summary statistics with memoization
  const currentMonthName = getTranslatedMonthName(new Date())

  // Use closed plans data for total plans widget
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
        description: 'from last month'
      }
    }
    if (percentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
      }
    }
    const sign = percentageChange > 0 ? '+' : ''
    return {
      value: `${sign}${percentageChange.toFixed(0)}%`,
      positive: percentageChange >= 0,
      description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
    }
  }, [percentageChange, currentMonthClosedPlans, previousMonthClosedPlans])

  // Calculate estimated amount trend
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
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
      }
    }
    if (estimatedAmountPercentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
      }
    }
    const sign = estimatedAmountPercentageChange > 0 ? '+' : ''
    return {
      value: `${sign}${estimatedAmountPercentageChange.toFixed(0)}%`,
      positive: estimatedAmountPercentageChange >= 0,
      description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
    }
  }, [estimatedAmountPercentageChange, currentMonthTotal, previousMonthTotal])

  // Handle widget clicks with immediate visual feedback
  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      // Prevent clicking when statistics are still loading
      if (statsLoading) {
        return
      }

      // Provide immediate visual feedback - let parent component handle all filtering
      if (onWidgetClick) {
        onWidgetClick(widgetKey)
      }
    },
    [onWidgetClick, statsLoading]
  )

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = useMemo(
    () => [
      {
        key: 'total-plans',
        title:
          getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.total_plans_for_month', 'Total Plans for') +
          ' ' +
          currentMonthName,
        value: totalPlans,
        prefix: <FileTextOutlined />,
        color: '#1677ff',
        span: { xs: 24, sm: 12, md: 6 },
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.closed_expense_plans',
          'Closed expense plans'
        ),
        trend: plansTrend,
        active: activeWidgetKey === 'total-plans',
        onClick: () => handleWidgetClick('total-plans')
      },
      {
        key: 'total-estimated',
        title:
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:personal_expenses.total_estimated_for_month',
            'Total Estimated for'
          ) +
          ' ' +
          currentMonthName,
        value: `${formatCurrencyDisplay(String(totalEstimated ?? '0'), currencyCode)}`,
        prefix: <DollarOutlined />,
        color: '#3f8600',
        span: { xs: 24, sm: 12, md: 6 },
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:modify_expense_request.request_amount_title_text',
          'Estimated expenses'
        ),
        trend: estimatedAmountTrend,
        valueIsString: true,
        active: activeWidgetKey === 'total-estimated',
        onClick: () => handleWidgetClick('total-estimated')
      },
      {
        key: 'pending-approval',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.pending_approval', 'Pending Approval'),
        value: pendingApproval,
        prefix: <CalendarOutlined />,
        color: '#faad14',
        span: { xs: 24, sm: 12, md: 6 },
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.requires_action', 'Requires action'),
        active: activeWidgetKey === 'pending-approval',
        onClick: () => handleWidgetClick('pending-approval')
      },
      {
        key: 'top-destinations',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.top_destination', 'Top Destination'),
        value: topDestination && topDestination !== 'N/A' ? getCatalogValue(topDestination) : topDestination,
        prefix: <CompassOutlined />,
        color: '#722ed1',
        span: { xs: 24, sm: 12, md: 6 },
        description:
          topDestination && topDestination !== 'N/A'
            ? getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.most_frequent', 'Most frequent')
            : getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_data_available', 'No data available'),
        active: activeWidgetKey === 'top-destinations',
        onClick: () => {
          handleWidgetClick('top-destinations')
        }
      }
    ],
    [
      currentMonthName,
      totalPlans,
      totalEstimated,
      pendingApproval,
      topDestination,
      plansTrend,
      estimatedAmountTrend,
      activeWidgetKey,
      handleWidgetClick,
      statsLoading
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
      emptyText={getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.no_expense_plan_statistics_available',
        'No expense plan statistics available.'
      )}
      data-testid="expense-plan-statistics"
    />
  )
}

export default ExpensePlanStatistics
