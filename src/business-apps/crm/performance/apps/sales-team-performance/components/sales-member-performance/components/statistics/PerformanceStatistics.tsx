import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { UserOutlined, ContactsOutlined, DollarOutlined, TeamOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePerformanceStatisticsData } from '../../hooks'
import { useEmployeeTrendData } from '../../hooks/useEmployeeTrendData'

const DATA_TEST_ID_PREFIX = 'PerformanceStatistics'

interface PerformanceStatisticsProps extends BusinessAppContextProps {
  employeeId: string
  onRetry?: () => void
  // Enhanced context for comparisons
  teamContext?: {
    teamId: string
    teamName: string
  }
  showComparisons?: boolean
}

export const PerformanceStatistics: React.FC<PerformanceStatisticsProps> = ({
  employeeId,
  accessToken,
  onRetry,
  showComparisons = true,
  ...context
}) => {
  // Fetch real performance statistics data
  const { statistics, isLoading, error, refetch } = usePerformanceStatisticsData(
    { accessToken, ...context },
    employeeId
  )

  // Fetch trend data for comparisons
  const { trends, refetch: refetchTrends } = useEmployeeTrendData(accessToken, employeeId)

  // Mock team and company averages (in real implementation, fetch from API)
  const teamAverages = {
    leadsConversionRate: 35,
    contactsEngagementRate: 65,
    winRate: 25,
    activitiesPerMonth: 85
  }

  const companyAverages = {
    leadsConversionRate: 30,
    contactsEngagementRate: 60,
    winRate: 22,
    activitiesPerMonth: 75
  }

  // Handle retry - use both internal refetch and optional external onRetry
  const handleRetry = () => {
    refetch()
    refetchTrends()
    onRetry?.()
  }

  // Helper function to format trend percentage with proper sign
  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : ''
    return `${sign}${changePercent.toFixed(1)}%`
  }

  // Helper function to create comparison description
  const createComparisonDescription = (
    personalValue: number,
    teamAvg: number,
    companyAvg: number,
    metric: string
  ): string => {
    if (!showComparisons) {
      return `Personal ${metric}`
    }

    const teamDiff = personalValue - teamAvg
    const companyDiff = personalValue - companyAvg
    const teamSign = teamDiff >= 0 ? '+' : ''
    const companySign = companyDiff >= 0 ? '+' : ''

    return `${teamSign}${teamDiff.toFixed(1)}% vs team | ${companySign}${companyDiff.toFixed(1)}% vs company`
  }

  // Transform stats data into widgets format with contextual comparisons
  const widgets: WidgetItem[] = [
    {
      key: 'leads-worked',
      title: 'Leads Conversion Rate',
      value: statistics.leadsWorked.conversionRate,
      prefix: <UserOutlined />,
      color: '#1677ff',
      description: showComparisons
        ? createComparisonDescription(
            statistics.leadsWorked.conversionRate,
            teamAverages.leadsConversionRate,
            companyAverages.leadsConversionRate,
            'conversion rate'
          )
        : `${statistics.leadsWorked.converted} of ${statistics.leadsWorked.total} leads converted`,
      suffix: '%',
      precision: 1,
      trend: showComparisons
        ? {
            value: `Team: ${teamAverages.leadsConversionRate}% | Company: ${companyAverages.leadsConversionRate}%`,
            positive: statistics.leadsWorked.conversionRate >= teamAverages.leadsConversionRate,
            description: 'benchmarks'
          }
        : {
            value: `${statistics.leadsWorked.conversionRate}%`,
            positive: statistics.leadsWorked.conversionRate >= 30,
            description: 'conversion rate'
          }
    },
    {
      key: 'contacts-engagement',
      title: 'Contact Engagement Rate',
      value: statistics.contactsWorked.percentage,
      prefix: <ContactsOutlined />,
      color: '#52c41a',
      description: showComparisons
        ? createComparisonDescription(
            statistics.contactsWorked.percentage,
            teamAverages.contactsEngagementRate,
            companyAverages.contactsEngagementRate,
            'engagement rate'
          )
        : `${statistics.contactsWorked.salesRelated} of ${statistics.contactsWorked.total} contacts engaged`,
      suffix: '%',
      precision: 1,
      trend: showComparisons
        ? {
            value: `Team: ${teamAverages.contactsEngagementRate}% | Company: ${companyAverages.contactsEngagementRate}%`,
            positive: statistics.contactsWorked.percentage >= teamAverages.contactsEngagementRate,
            description: 'benchmarks'
          }
        : {
            value: `${statistics.contactsWorked.percentage}%`,
            positive: statistics.contactsWorked.percentage >= 60,
            description: 'engagement rate'
          }
    },
    {
      key: 'opportunities-win-rate',
      title: 'Opportunity Win Rate',
      value: statistics.opportunitiesManaged.winRate,
      prefix: <DollarOutlined />,
      color: '#ff4d4f',
      description: showComparisons
        ? createComparisonDescription(
            statistics.opportunitiesManaged.winRate,
            teamAverages.winRate,
            companyAverages.winRate,
            'win rate'
          )
        : `${statistics.opportunitiesManaged.won} of ${statistics.opportunitiesManaged.total} opportunities won`,
      suffix: '%',
      precision: 1,
      trend: showComparisons
        ? {
            value: `Team: ${teamAverages.winRate}% | Company: ${companyAverages.winRate}%`,
            positive: statistics.opportunitiesManaged.winRate >= teamAverages.winRate,
            description: 'benchmarks'
          }
        : {
            value: `${statistics.opportunitiesManaged.winRate}%`,
            positive: statistics.opportunitiesManaged.winRate >= 25,
            description: 'win rate'
          }
    },
    {
      key: 'activities-completed',
      title: 'Monthly Activities',
      value: trends.activitiesCompleted.currentValue,
      prefix: <TeamOutlined />,
      color: '#722ed1',
      description: showComparisons
        ? createComparisonDescription(
            trends.activitiesCompleted.currentValue,
            teamAverages.activitiesPerMonth,
            companyAverages.activitiesPerMonth,
            'activities per month'
          )
        : 'Monthly activity execution rate',
      precision: 0,
      trend: showComparisons
        ? {
            value: `Team: ${teamAverages.activitiesPerMonth} | Company: ${companyAverages.activitiesPerMonth}`,
            positive: trends.activitiesCompleted.currentValue >= teamAverages.activitiesPerMonth,
            description: 'benchmarks'
          }
        : {
            value: formatTrendPercent(trends.activitiesCompleted.trendPercentage),
            positive: trends.activitiesCompleted.trend === 'up',
            description: 'vs last month'
          }
    }
  ]

  return (
    <div className="gba:w-full gba:mb-8" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading || trends.isLoading}
        error={error ? new Error(error) : trends.error ? new Error(trends.error) : null}
        onRetry={handleRetry}
        skeletonCount={4}
        emptyText="No performance statistics available."
        data-testid={DATA_TEST_ID_PREFIX}
      />
    </div>
  )
}

export default PerformanceStatistics
