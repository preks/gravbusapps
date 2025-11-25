import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { SectionKpiCards, type KpiCardData } from '@newwork/nw-design-system'
import { Activity, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { useDashboardMetrics } from './hooks/useDashboardMetrics'

/**
 * KPI Section Component - Displays key performance indicators using live service desk data
 */
export type KPISectionProps = BusinessAppContextProps

export const KPISection: React.FC<KPISectionProps> = ({ accessToken, userInfo }) => {
  // Get real dashboard metrics from service desk APIs
  const { metrics, isLoading, error } = useDashboardMetrics({
    accessToken,
    userInfo
  })

  // Show loading state
  if (isLoading) {
    return (
      <div
        className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4"
        data-testid="kpi-section-loading"
      >
        {[...Array(4)].map((_, i) => (
          <div key={i} className="gba:h-32 gba:bg-muted gba:rounded-lg gba:animate-pulse" />
        ))}
      </div>
    )
  }

  // Show error state
  if (error || !metrics) {
    return (
      <div className="gba:space-y-4" data-testid="kpi-section-error">
        <div className="gba:text-center gba:py-8">
          <AlertTriangle className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-destructive" />
          <p className="gba:text-destructive gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('services.dashboard.kpi.error_title', 'Unable to load KPI data')}
          </p>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{error || 'Please try refreshing the page'}</p>
        </div>
      </div>
    )
  }

  // Generate PERSONAL KPI cards from user-specific data
  const kpiCards: KpiCardData[] = [
    {
      id: 'my-open-tickets',
      title: getTranslationFromI18nKeyAndLabel('services.dashboard.kpi.my_open', 'My Open Tickets'),
      value: metrics.myOpenTickets,
      icon: <Activity className="gba:size-4" />,
      trend: {
        value: `${metrics.myInProgressTickets} in progress`,
        positive: undefined,
        description: 'currently working on',
        badgeVariant: 'info'
      },
      footer: getTranslationFromI18nKeyAndLabel('services.dashboard.kpi.my_open_footer', 'Assigned or claimed by you')
    },
    {
      id: 'my-due-today',
      title: getTranslationFromI18nKeyAndLabel('services.dashboard.kpi.my_due_today', 'Due Today'),
      value: metrics.myDueToday,
      icon: <Clock className="gba:size-4" />,
      trend: {
        value: metrics.myOverdue > 0 ? `${metrics.myOverdue} overdue` : 'On track',
        positive: metrics.myOverdue === 0,
        description: metrics.myOverdue > 0 ? 'needs immediate attention' : 'all on schedule',
        badgeVariant: metrics.myOverdue > 0 ? 'destructive' : 'success'
      },
      footer: getTranslationFromI18nKeyAndLabel(
        'services.dashboard.kpi.my_due_today_footer',
        "Tickets with today's deadline"
      )
    },
    {
      id: 'my-completed-week',
      title: getTranslationFromI18nKeyAndLabel('services.dashboard.kpi.my_completed_week', 'Completed This Week'),
      value: metrics.myCompletedThisWeek,
      icon: <CheckCircle className="gba:size-4" />,
      trend: {
        value: metrics.myWeeklyTrend > 0 ? `+${metrics.myWeeklyTrend}%` : `${metrics.myWeeklyTrend}%`,
        positive: metrics.myWeeklyTrend >= 0,
        description: 'vs previous weeks',
        badgeVariant: metrics.myWeeklyTrend >= 0 ? 'success' : 'default'
      },
      footer: getTranslationFromI18nKeyAndLabel('services.dashboard.kpi.my_completed_week_footer', 'Great work!')
    },
    {
      id: 'my-awaiting-action',
      title: getTranslationFromI18nKeyAndLabel('services.dashboard.kpi.my_awaiting_action', 'Awaiting My Action'),
      value: metrics.myAwaitingAction,
      icon: <AlertTriangle className="gba:size-4" />,
      trend: {
        value:
          metrics.myAwaitingAction > 10 ? 'High priority' : metrics.myAwaitingAction > 5 ? 'Moderate' : 'Low priority',
        positive: metrics.myAwaitingAction <= 5,
        description: 'requires attention',
        badgeVariant:
          metrics.myAwaitingAction > 10 ? 'destructive' : metrics.myAwaitingAction > 5 ? 'warning' : 'success'
      },
      footer: getTranslationFromI18nKeyAndLabel(
        'services.dashboard.kpi.my_awaiting_action_footer',
        'In progress + overdue tickets'
      )
    }
  ]

  return (
    <div className="gba:space-y-4" data-testid="kpi-section">
      {/* Section Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div>
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('services.dashboard.kpi.section_title', 'My Performance Overview')}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
            {getTranslationFromI18nKeyAndLabel(
              'services.dashboard.kpi.section_description',
              'Your personal workload, performance metrics, and ticket status at a glance'
            )}
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
          <Activity className="gba:size-4 gba:animate-pulse gba:text-success" />
          <span>{getTranslationFromI18nKeyAndLabel('services.dashboard.kpi.live_data', 'Live Data')}</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <SectionKpiCards cards={kpiCards} className="gba:gap-4" />
    </div>
  )
}
