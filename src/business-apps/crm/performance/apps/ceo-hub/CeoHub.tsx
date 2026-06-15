import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  LauncherLayout,
  type LauncherSectionConfig,
  type NavigationCardInput,
  type KpiData,
  type QuickActionData,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Button
} from '@newwork/nw-design-system'
import { useCeoHubStats } from './hooks/useCeoHubStats'
import { navigateTo, buildPlatformUrl, Navigation } from '@/common/utils/navigationUtils'
import { buildActivity360PlatformUrl } from '@/business-apps/crm/performance/apps/sales-activity-360/utils/activity360UrlHelpers'
import {
  ChartLineUpIcon,
  LightningIcon,
  PresentationChartIcon,
  UsersThreeIcon,
  LightbulbIcon,
  ArrowClockwiseIcon
} from '@phosphor-icons/react'

type CeoHubProps = BusinessAppContextProps

const DATA_TEST_ID_PREFIX = 'ceo-hub'

/**
 * Executive Hub
 * A cutting-edge launcher for C-level executives to access key sales modules
 */
const CeoHub: React.FC<CeoHubProps> = ({ accessToken }) => {
  const { stats, isLoading, error, refetch } = useCeoHubStats(accessToken)

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toLocaleString()
  }

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `€${(amount / 1000).toFixed(0)}K`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Executive KPIs for header
  const headerKpis = useMemo((): KpiData[] => {
    if (error) return []

    return [
      {
        id: 'total-revenue',
        title: 'Total Revenue',
        value: isLoading ? '...' : formatCurrency(stats.totalRevenue),
        color: 'success'
      },
      {
        id: 'pipeline-revenue',
        title: 'Pipeline Revenue',
        value: isLoading ? '...' : formatCurrency(stats.pipelineValue),
        color: 'primary'
      }
    ]
  }, [stats, isLoading, error])

  // Generate sections for LauncherLayout
  const sections = useMemo((): LauncherSectionConfig[] => {
    const cards: NavigationCardInput[] = [
      {
        id: 'sales-activity-360',
        title: 'Sales Activity 360°',
        description:
          'Complete visibility into all sales activities, customer interactions, and team engagement metrics across the entire organization.',
        icon: PresentationChartIcon,
        stats: {
          value: formatNumber(stats.totalActivities),
          label: 'Total Activities'
        },
        actions: [
          {
            label: 'Activity Timeline',
            onClick: () => {
              navigateTo(
                buildActivity360PlatformUrl({
                  appScreen: { screen: 'activity-view', filter: 'all' },
                  tab: 'calendar'
                })
              )
            }
          },
          {
            label: 'Team Overview',
            onClick: () => {
              navigateTo(
                buildActivity360PlatformUrl({
                  appScreen: { screen: 'activity-view', filter: 'all' },
                  tab: 'comparison'
                })
              )
            }
          },
          {
            label: 'Activity Analytics',
            onClick: () => {
              navigateTo(
                buildActivity360PlatformUrl({
                  appScreen: { screen: 'activity-view', filter: 'all' },
                  tab: 'comparison'
                })
              )
            }
          }
        ],
        primaryAction: {
          label: 'Open Activity Dashboard',
          onClick: () => {
            navigateTo(Navigation.CRM_PERFORMANCE_SALES_ACTIVITY_360)
          }
        },
        variant: 'info'
      },
      {
        id: 'sales-performance',
        title: 'Sales Performance',
        description:
          'Strategic performance insights with revenue analytics, team rankings, pipeline forecasts, and goal tracking for executive decision-making.',
        icon: ChartLineUpIcon,
        stats: {
          value: formatCurrency(stats.totalRevenue),
          label: 'Revenue Generated'
        },
        actions: [
          {
            label: 'Revenue Trends',
            onClick: () => {
              const url = buildPlatformUrl('/platform/crm/sales-performance', { view: 'overview' })
              navigateTo(url)
            }
          },
          {
            label: 'Team Comparison',
            onClick: () => {
              const url = buildPlatformUrl('/platform/crm/sales-performance', { view: 'teams' })
              navigateTo(url)
            }
          },
          {
            label: 'Employee Rankings',
            onClick: () => {
              const url = buildPlatformUrl('/platform/crm/sales-performance', { view: 'employees' })
              navigateTo(url)
            }
          }
        ],
        primaryAction: {
          label: 'Open Performance Dashboard',
          onClick: () => {
            const url = buildPlatformUrl('/platform/crm/sales-performance')
            navigateTo(url)
          }
        },
        variant: 'success'
      }
    ]

    return [
      {
        id: 'executive-modules',
        title: 'Executive Insights',
        description: 'Strategic command center for comprehensive sales intelligence and performance optimization',
        cards
      }
    ]
  }, [stats])

  // Quick actions for executives
  const quickActions = useMemo((): QuickActionData[] => {
    return [
      {
        id: 'team-performance',
        label: 'Team Performance',
        icon: UsersThreeIcon,
        onClick: () => {
          const url = buildPlatformUrl('/platform/crm/sales-performance', { view: 'teams' })
          navigateTo(url)
        },
        variant: 'secondary'
      },
      {
        id: 'activity-overview',
        label: 'Activity Overview',
        icon: LightningIcon,
        onClick: () => {
          navigateTo(Navigation.CRM_PERFORMANCE_SALES_ACTIVITY_360)
        },
        variant: 'secondary'
      }
    ]
  }, [])

  // Show loading state
  if (isLoading) {
    return (
      <div
        className="gba:min-h-screen gba:flex gba:items-center gba:justify-center gba:bg-gradient-to-br gba:from-slate-900 gba:via-slate-800 gba:to-slate-900"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        <div className="gba:max-w-md gba:mx-auto gba:p-6 gba:text-center">
          <LightbulbIcon
            className="gba:h-16 gba:w-16 gba:text-primary gba:mx-auto gba:mb-4 gba:animate-pulse"
            weight="duotone"
          />
          <Spinner size="lg" className="gba:mb-4" />
          <div className="gba:text-sm gba:text-slate-300">Loading Executive Hub...</div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div
        className="gba:min-h-screen gba:flex gba:items-center gba:justify-center gba:bg-gradient-to-br gba:from-slate-900 gba:via-slate-800 gba:to-slate-900"
        data-testid={`${DATA_TEST_ID_PREFIX}-error`}
      >
        <div className="gba:max-w-md gba:mx-auto gba:p-6">
          <Alert variant="destructive" className="gba:bg-card/90 gba:backdrop-blur-md">
            <AlertTitle>Unable to Load Executive Data</AlertTitle>
            <AlertDescription>
              {error}
              <div className="gba:mt-4">
                <Button size="sm" variant="outline" onClick={refetch}>
                  <ArrowClockwiseIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <LauncherLayout
      title="Executive Hub"
      description="Executive-level insights and strategic sales intelligence for data-driven decision making"
      icon={LightbulbIcon}
      // Disable the default header back arrow (LauncherLayout falls back to window.history.back()).
      onBack={null as unknown as (() => void) | undefined}
      headerKpis={headerKpis}
      sections={sections}
      quickActions={quickActions}
      quickActionsTitle="Executive Quick Actions"
      quickActionsDescription="Fast access to critical strategic views"
      variant="default"
      data-testid={DATA_TEST_ID_PREFIX}
    />
  )
}

export default CeoHub
