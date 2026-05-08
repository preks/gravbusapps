import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { CheckCircleIcon, PercentIcon, TrendUpIcon, UsersIcon } from '@phosphor-icons/react'
import { LeadLifecycleChart, TimeFilter } from './widgets/LeadLifecycleChart'
import { LeadsBySourcePie } from './widgets/LeadsBySourcePie'
import { LeadsByStatusPie } from './widgets/LeadsByStatusPie'

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
  convertedLeads: number
  conversionRate: number
  trendData?: LeadsTrendData | null
  trendLoading?: boolean

  // Required: Lead Lifecycle Chart
  leadsOverTime: Array<{ date: string; count: number; leadsCreated: number; leadsConverted: number; leadsLost: number }>
  leadsOverTimeLoading?: boolean
  selectedTimeFilter: TimeFilter
  onTimeFilterChange: (filter: TimeFilter) => void

  // Optional: Distribution Charts (can be hidden)
  leadsBySource?: Array<{ source: string; count: number; percentage?: number; conversionRate?: number }>
  leadsBySourceLoading?: boolean
  leadsByStatus?: Array<{ status: string; count: number }>
  leadsByStatusLoading?: boolean
}

export const LeadsTabLayout: React.FC<LeadsTabLayoutProps> = ({
  moduleColor = 'default',
  totalLeads,
  convertedLeads,
  conversionRate,
  trendData,
  trendLoading = false,
  leadsOverTime,
  leadsOverTimeLoading = false,
  selectedTimeFilter,
  onTimeFilterChange,
  leadsBySource,
  leadsBySourceLoading = false,
  leadsByStatus,
  leadsByStatusLoading = false
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
      prefix: <UsersIcon size={16} />,
      description: 'All leads in the system',
      // Add trend data for total leads with custom description format
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrendWithTotalDescription(totalLeads || 0, trendData.totalLeadsLastMonth)
          }
        : {})
    },
    {
      key: 'converted-leads',
      title: 'Converted Leads',
      value: convertedLeads || 0,
      prefix: <CheckCircleIcon size={16} />,
      description: 'Leads converted to opportunities',
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(trendData.currentMonthConvertedLeads, trendData.previousMonthConvertedLeads)
          }
        : {})
    },
    {
      key: 'conversion-rate',
      title: 'Conversion Rate',
      value: conversionRate || 0,
      suffix: '%',
      prefix: <PercentIcon size={16} />,
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
      key: 'leads-this-period',
      title: 'New This Month',
      value: trendData?.currentMonthLeads || 0,
      prefix: <TrendUpIcon size={16} />,
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
        <WidgetGroup widgets={keyMetricsWidgets} isLoading={trendLoading} data-testid="leads-key-metrics" />
      </div>

      {/* Required: Lead Lifecycle Chart */}
      <LeadLifecycleChart
        key={`lead-lifecycle-${selectedTimeFilter}`}
        data={leadsOverTime}
        isLoading={leadsOverTimeLoading || leadsBySourceLoading || leadsByStatusLoading}
        selectedTimeFilter={selectedTimeFilter}
        onTimeFilterChange={onTimeFilterChange}
        moduleColor={moduleColor}
      />

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
    </div>
  )
}

export default LeadsTabLayout
