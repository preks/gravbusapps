import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { UserOutlined, ContactsOutlined, DollarOutlined, TeamOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePerformanceStatisticsData } from '../../hooks/usePerformanceStatisticsData'
import { EmployeeTrendData } from '../../hooks/useEmployeePerformanceData'

const DATA_TEST_ID_PREFIX = 'PerformanceStatistics'

interface PerformanceStatisticsProps extends BusinessAppContextProps {
  employeeId: string
  currencyCode?: string
  onRetry?: () => void
  // Enhanced context for comparisons
  teamContext?: {
    teamId: string
    teamName: string
  }
  showComparisons?: boolean
  // Trends data passed from parent to avoid duplicate queries
  trends?: {
    leadsWorked: EmployeeTrendData
    contactsWorked: EmployeeTrendData
    opportunitiesManaged: EmployeeTrendData
    activitiesCompleted: EmployeeTrendData
  }
}

export const PerformanceStatistics: React.FC<PerformanceStatisticsProps> = ({
  employeeId,
  currencyCode,
  accessToken,
  onRetry,
  trends,
  ...context
}) => {
  // Fetch real performance statistics data
  const { statistics, isLoading, error, refetch } = usePerformanceStatisticsData(
    { accessToken, ...context },
    employeeId,
    currencyCode
  )

  // Handle retry - use both internal refetch and optional external onRetry
  const handleRetry = () => {
    refetch()
    onRetry?.() // This will refetch all data including trends from parent
  }

  // Helper function to format trend percentage with proper sign
  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : ''
    return `${sign}${changePercent.toFixed(1)}%`
  }

  // Transform stats data into widgets format with trend percentages
  const widgets: WidgetItem[] = [
    {
      key: 'leads-worked',
      title: 'Leads Conversion Rate',
      value: statistics.leadsWorked.conversionRate,
      prefix: <UserOutlined />,
      color: '#1677ff',
      description: `${statistics.leadsWorked.converted} of ${statistics.leadsWorked.total} leads converted`,
      suffix: '%',
      precision: 1,
      trend: trends?.leadsWorked
        ? {
            value: formatTrendPercent(trends.leadsWorked.trendPercentage),
            positive: trends.leadsWorked.trend === 'up',
            description: 'vs last month'
          }
        : undefined
    },
    {
      key: 'contacts-engagement',
      title: 'Contact Engagement Rate',
      value: statistics.contactsWorked.percentage,
      prefix: <ContactsOutlined />,
      color: '#52c41a',
      description: `${statistics.contactsWorked.salesRelated} of ${statistics.contactsWorked.total} contacts engaged`,
      suffix: '%',
      precision: 1,
      trend: trends?.contactsWorked
        ? {
            value: formatTrendPercent(trends.contactsWorked.trendPercentage),
            positive: trends.contactsWorked.trend === 'up',
            description: 'vs last month'
          }
        : undefined
    },
    {
      key: 'opportunities-win-rate',
      title: 'Opportunity Win Rate',
      value: statistics.opportunitiesManaged.winRate,
      prefix: <DollarOutlined />,
      color: '#ff4d4f',
      description: `${statistics.opportunitiesManaged.won} of ${statistics.opportunitiesManaged.total} opportunities won`,
      suffix: '%',
      precision: 1,
      trend: trends?.opportunitiesManaged
        ? {
            value: formatTrendPercent(trends.opportunitiesManaged.trendPercentage),
            positive: trends.opportunitiesManaged.trend === 'up',
            description: 'vs last month'
          }
        : undefined
    },
    ...(trends
      ? [
          {
            key: 'activities-completed',
            title: 'Monthly Activities',
            value: trends.activitiesCompleted.currentValue,
            prefix: <TeamOutlined />,
            color: '#722ed1',
            description: 'Monthly activity execution rate',
            precision: 0,
            trend: {
              value: formatTrendPercent(trends.activitiesCompleted.trendPercentage),
              positive: trends.activitiesCompleted.trend === 'up',
              description: 'vs last month'
            }
          }
        ]
      : [])
  ]

  return (
    <div className="gba:w-full gba:mb-8" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error ? new Error(error) : null}
        onRetry={handleRetry}
        skeletonCount={4}
        emptyText="No performance statistics available."
        data-testid={DATA_TEST_ID_PREFIX}
      />
    </div>
  )
}

export default PerformanceStatistics
