import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { TeamOutlined, PercentageOutlined, ClockCircleOutlined, RiseOutlined } from '@ant-design/icons'
import { LeadLifecycleChart, TimeFilter } from './widgets/LeadLifecycleChart'
import { LeadVelocityAnalysis } from './widgets/LeadVelocityAnalysis'
import { LeadsBySourcePie } from './widgets/LeadsBySourcePie'
import { LeadsByStatusPie } from './widgets/LeadsByStatusPie'
import TopLeadOwners from './widgets/TopLeadOwners'
import { LeadQualityMatrix } from './widgets/LeadQualityMatrix'
import { LeadEngagementInsights } from './widgets/LeadEngagementInsights'

// Leads-specific trend data interface (matching archived version)
interface LeadsTrendData {
  currentMonthLeads: number
  previousMonthLeads: number
  currentMonthConvertedLeads: number
  previousMonthConvertedLeads: number
  totalLeadsThisMonth: number
  totalLeadsLastMonth: number
  actualConversionRateThisMonth: number
  actualConversionRateLastMonth: number
  actualAvgConversionTimeThisMonth: number
  actualAvgConversionTimeLastMonth: number
  currentPeriodLeads: number
  previousPeriodLeads: number
}

export interface LeadsTabLayoutProps {
  title?: string
  moduleColor?: string

  // Required: Core KPIs
  totalLeads: number
  conversionRate: number
  avgTimeToConversion: number
  trendData?: LeadsTrendData | null
  trendLoading?: boolean

  // Required: Lead Lifecycle Chart
  leadsOverTime: Array<{ date: string; count: number; leadsCreated: number; leadsConverted: number; leadsLost: number }>
  leadsOverTimeLoading?: boolean
  selectedTimeFilter: TimeFilter
  onTimeFilterChange: (filter: TimeFilter) => void

  // Optional: Lead Velocity Analysis (can be hidden)
  velocityData?: {
    avgTimeToConversion: number
    conversionRate: number
    volumeTrend: number
    velocityTrendData: Array<{
      month: string
      date: string
      leadsCreated: number
      leadsConverted: number
      conversionVelocity: number
    }>
  } | null
  velocityLoading?: boolean

  // Optional: Lead Quality Matrix (can be hidden)
  leadQualityMatrix?: {
    leadsBySource: Array<{ source: string; count: number; percentage?: number; conversionRate?: number }>
    isLoading?: boolean
  }

  // Optional: Lead Engagement Insights (can be hidden)
  leadEngagementInsights?: {
    leadsByRating: Array<{ rating: string; count: number; percentage?: number }>
    leadHealthIndicators: Array<{ label: string; value: number; status?: 'good' | 'warning' | 'bad' }>
    highQualityPercentage: number
    isLoading?: boolean
  }

  // Optional: Distribution Charts (can be hidden)
  leadsBySource?: Array<{ source: string; count: number; percentage?: number; conversionRate?: number }>
  leadsBySourceLoading?: boolean
  leadsByStatus?: Array<{ status: string; count: number }>
  leadsByStatusLoading?: boolean

  // Optional: Top Lead Owners (can be hidden)
  topOwners?: Array<{ employeeId: string; employeeName: string; leadCount: number; conversionRate: number }>
}

export const LeadsTabLayout: React.FC<LeadsTabLayoutProps> = ({
  title = 'Leads Analytics',
  moduleColor = 'default',
  totalLeads,
  conversionRate,
  avgTimeToConversion,
  trendData,
  trendLoading = false,
  leadsOverTime,
  leadsOverTimeLoading = false,
  selectedTimeFilter,
  onTimeFilterChange,
  velocityData,
  velocityLoading = false,
  leadQualityMatrix,
  leadEngagementInsights,
  leadsBySource,
  leadsBySourceLoading = false,
  leadsByStatus,
  leadsByStatusLoading = false,
  topOwners
}) => {
  // Helper function to calculate trend with total description (matching archived version)
  const calculateTrendWithTotalDescription = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) {
      return {
        value: currentValue > 0 ? '100%' : '0%',
        positive: currentValue >= 0,
        description: `${currentValue} total vs ${previousValue} last month`
      }
    }
    const change = ((currentValue - previousValue) / previousValue) * 100
    return {
      value: `${Math.abs(change).toFixed(1)}%`,
      positive: change >= 0,
      description: `${currentValue} total vs ${previousValue} last month`
    }
  }

  // Helper function to calculate trend (matching archived version)
  const calculateTrend = (currentValue: number, previousValue: number) => {
    const difference = currentValue - previousValue
    const percentageChange = previousValue > 0 ? Math.abs((difference / previousValue) * 100) : 0

    return {
      value: `${percentageChange.toFixed(1)}%`,
      positive: difference >= 0,
      description: `${Math.abs(difference)} ${difference >= 0 ? 'more' : 'fewer'} than last month`
    }
  }

  // Widget configuration for key metrics (matching archived version)
  const keyMetricsWidgets: WidgetItem[] = [
    {
      key: 'total-leads',
      title: 'Total Leads',
      value: totalLeads || 0,
      prefix: <TeamOutlined />,
      description: 'All leads in the system',
      // Add trend data for total leads with custom description format
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrendWithTotalDescription(totalLeads || 0, trendData.totalLeadsLastMonth)
          }
        : {})
    },
    {
      key: 'conversion-rate',
      title: 'Conversion Rate',
      value: conversionRate || 0,
      suffix: '%',
      prefix: <PercentageOutlined />,
      description: 'Leads converted to opportunities',
      // Compare current conversion rate to last month's conversion rate
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: `${Math.abs((conversionRate || 0) - trendData.actualConversionRateLastMonth).toFixed(1)}%`,
              positive: (conversionRate || 0) >= trendData.actualConversionRateLastMonth,
              description: `${(conversionRate || 0).toFixed(1)}% this month vs ${trendData.actualConversionRateLastMonth.toFixed(1)}% last month`
            }
          }
        : {})
    },
    {
      key: 'avg-conversion-time',
      title: 'Avg. Conversion Time',
      value: avgTimeToConversion || 0,
      suffix: ' days',
      prefix: <ClockCircleOutlined />,
      description: 'Average time to convert leads',
      // Compare current conversion time to last month's conversion time
      ...(trendData && !trendLoading
        ? {
            trend: {
              value:
                (trendData.actualAvgConversionTimeLastMonth || 0) === 0
                  ? (avgTimeToConversion || 0) > 0
                    ? '100%'
                    : '0%'
                  : `${Math.abs(
                      (((avgTimeToConversion || 0) - (trendData.actualAvgConversionTimeLastMonth || 0)) /
                        trendData.actualAvgConversionTimeLastMonth) *
                        100
                    ).toFixed(1)}%`,
              positive: (avgTimeToConversion || 0) <= (trendData.actualAvgConversionTimeLastMonth || 0), // Lower time is better
              description: `${(avgTimeToConversion || 0).toFixed(1)} days this month vs ${(trendData.actualAvgConversionTimeLastMonth || 0).toFixed(1)} days last month`
            }
          }
        : {})
    },
    {
      key: 'leads-this-period',
      title: 'New This Month',
      value: trendData?.currentMonthLeads || 0,
      prefix: <RiseOutlined />,
      description: 'Leads created this month',
      // Add trend data for new leads this month vs last month
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(trendData.currentMonthLeads, trendData.previousMonthLeads)
          }
        : {})
    }
  ]

  // No filtering needed - useLeadsOverTime hook already returns correctly aggregated data per period
  // (daily for month, weekly for quarter/sixMonths, monthly for year, yearly for historical)

  return (
    <div className="gba:space-y-6" data-testid="leads-analytics-tab">
      <div>
        <h2 className="gba:text-2xl gba:font-bold gba:mb-4">{title}</h2>
        <WidgetGroup widgets={keyMetricsWidgets} isLoading={trendLoading} data-testid="leads-key-metrics" />
      </div>

      {/* Required: Lead Lifecycle Chart */}
      <LeadLifecycleChart
        key={`lead-lifecycle-${selectedTimeFilter}`}
        data={leadsOverTime}
        isLoading={
          leadsOverTimeLoading ||
          velocityLoading ||
          leadQualityMatrix?.isLoading ||
          leadEngagementInsights?.isLoading ||
          leadsBySourceLoading ||
          leadsByStatusLoading
        }
        selectedTimeFilter={selectedTimeFilter}
        onTimeFilterChange={onTimeFilterChange}
        moduleColor={moduleColor}
      />

      {/* Optional: Velocity & Quality Analysis */}
      {(velocityData || leadQualityMatrix) && (
        <div className="gba:grid gba:grid-cols-1 xl:gba:grid-cols-2 gba:gap-6">
          {velocityData && (
            <LeadVelocityAnalysis
              avgTimeToConversion={velocityData.avgTimeToConversion || avgTimeToConversion}
              conversionRate={velocityData.conversionRate || conversionRate}
              volumeTrend={velocityData.volumeTrend || 0}
              velocityTrendData={velocityData.velocityTrendData || []}
              isLoading={velocityLoading}
              moduleColor={moduleColor}
            />
          )}
          {leadQualityMatrix && (
            <LeadQualityMatrix
              data={{
                totalLeads,
                conversionRate,
                leadsBySource: leadQualityMatrix.leadsBySource.map(s => ({
                  source: s.source,
                  count: s.count,
                  percentage: s.percentage || 0,
                  conversionRate: s.conversionRate || 0
                }))
              }}
              isLoading={leadQualityMatrix.isLoading}
              moduleColor={moduleColor}
            />
          )}
        </div>
      )}

      {/* Optional: Lead Engagement Insights */}
      {leadEngagementInsights && (
        <LeadEngagementInsights
          leadsByRating={leadEngagementInsights.leadsByRating.map(r => ({
            rating: r.rating,
            count: r.count,
            percentage: r.percentage || 0
          }))}
          leadHealthIndicators={leadEngagementInsights.leadHealthIndicators}
          conversionRate={conversionRate}
          avgTimeToConversion={avgTimeToConversion}
          leadsOverTime={leadsOverTime}
          highQualityPercentage={leadEngagementInsights.highQualityPercentage}
          isLoading={leadEngagementInsights.isLoading}
          moduleColor={moduleColor}
        />
      )}

      {/* Optional: Distribution Pie Charts */}
      {(leadsBySource || leadsByStatus) && (
        <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2">
          {leadsBySource && (
            <LeadsBySourcePie
              data={leadsBySource.map(s => ({ source: s.source, count: s.count }))}
              isLoading={leadsBySourceLoading}
              moduleColor={moduleColor}
            />
          )}
          {leadsByStatus && (
            <LeadsByStatusPie data={leadsByStatus} isLoading={leadsByStatusLoading} moduleColor={moduleColor} />
          )}
        </div>
      )}

      {/* Optional: Top Lead Owners */}
      {topOwners && topOwners.length > 0 && <TopLeadOwners owners={topOwners} moduleColor={moduleColor} />}
    </div>
  )
}

export default LeadsTabLayout
