import React, { useMemo } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { UserOutlined, FireOutlined, RocketOutlined, TrophyOutlined } from '@ant-design/icons'

export interface LeadStatisticsData {
  recentLeads: {
    current: number
    changePercent: number
    isPositive: boolean
  }
  hotLeads: {
    current: number
    changePercent: number
    isPositive: boolean
  }
  conversionRate: {
    current: number
    currentRate: number
    currentTotal: number
    changePercent: number
    isPositive: boolean
  }
  convertedLeads: {
    current: number
    changePercent: number
    isPositive: boolean
  }
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

interface LeadStatisticsLayoutProps {
  statistics: LeadStatisticsData
  'data-testid'?: string
}

/**
 * Lead Statistics Layout
 * Displays lead statistics with trends
 * Used by both CRM and IRM Lead Views
 */
export const LeadStatisticsLayout: React.FC<LeadStatisticsLayoutProps> = ({
  statistics,
  'data-testid': dataTestId = 'lead-statistics'
}) => {
  const { recentLeads, hotLeads, conversionRate, convertedLeads, isLoading, error, refetch } = statistics

  // Get current year for display
  const currentYear = useMemo(() => new Date().getFullYear(), [])

  // Helper function to format trend percentage with proper sign
  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : ''
    return `${sign}${changePercent.toFixed(1)}%`
  }

  // Transform the statistics into widgets format
  const widgets: WidgetItem[] = useMemo(
    () => [
      {
        key: 'recent-leads',
        title: 'Recent Leads',
        value: recentLeads.current,
        prefix: <UserOutlined />,
        color: '#1677ff',
        span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
        description: 'New leads (past 2 weeks)',
        trend: {
          value: formatTrendPercent(recentLeads.changePercent),
          positive: recentLeads.isPositive,
          description: 'vs previous 2 weeks'
        }
      },
      {
        key: 'hot-leads',
        title: 'Hot Leads',
        value: hotLeads.current,
        prefix: <FireOutlined />,
        color: '#ff4d4f',
        span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
        description: 'High priority prospects',
        trend: {
          value: formatTrendPercent(hotLeads.changePercent),
          positive: hotLeads.isPositive,
          description: 'vs last month'
        }
      },
      {
        key: 'converted-leads',
        title: 'Converted',
        value: convertedLeads.current,
        prefix: <RocketOutlined />,
        color: '#52c41a',
        span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
        description: 'Successfully converted leads',
        trend: {
          value: formatTrendPercent(convertedLeads.changePercent),
          positive: convertedLeads.isPositive,
          description: 'vs last quarter'
        }
      },
      {
        key: 'conversion-rate',
        title: 'Conversion Rate',
        value: conversionRate.currentRate,
        prefix: <TrophyOutlined />,
        color: '#722ed1',
        precision: 1,
        suffix: '%',
        span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
        description: `${conversionRate.current} converted in ${currentYear}`,
        trend: {
          value: formatTrendPercent(conversionRate.changePercent),
          positive: conversionRate.isPositive,
          description: 'vs last year'
        }
      }
    ],
    [recentLeads, hotLeads, conversionRate, convertedLeads, currentYear]
  )

  return (
    <div data-testid={`${dataTestId}-container`}>
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeletonCount={4}
        emptyText="No lead statistics available."
        data-testid={dataTestId}
      />
    </div>
  )
}
