import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { CheckCircleIcon, PercentIcon, TrendUpIcon, UsersIcon } from '@phosphor-icons/react'
import { LeadLifecycleChart, TimeFilter } from './widgets/LeadLifecycleChart'
import { LeadsBySourcePie } from './widgets/LeadsBySourcePie'
import { LeadsByStatusPie } from './widgets/LeadsByStatusPie'
import type { LeadDrillDownSelection } from '../hooks/useLeadDrillDownState'
import type { LeadLifecyclePointSelection } from '../hooks/useLeadLifecycleDrillDownState'
import { mergeTabKpiLabels, type PartialTabKpiLabels, type TabKpiLabel } from '../types/tabKpiLabels'

export type LeadsTabKpiLabels = {
  totalLeads: TabKpiLabel
  convertedLeads: TabKpiLabel
  conversionRate: TabKpiLabel
  newThisMonth: TabKpiLabel
}

const DEFAULT_LEADS_TAB_KPI_LABELS: LeadsTabKpiLabels = {
  totalLeads: { title: 'Total Leads', description: 'All leads in the system' },
  convertedLeads: { title: 'Converted Leads', description: 'Leads converted to opportunities' },
  conversionRate: { title: 'Conversion Rate', description: 'Leads converted to opportunities' },
  newThisMonth: { title: 'New This Month', description: 'Leads created this month' }
}

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
  leadsOverTime: Array<{
    date: string
    endDate: string
    count: number
    leadsCreated: number
    leadsConverted: number
    leadsLost: number
  }>
  leadsOverTimeLoading?: boolean
  selectedTimeFilter: TimeFilter
  onTimeFilterChange: (filter: TimeFilter) => void

  // Optional: Distribution Charts (can be hidden)
  leadsBySource?: Array<{
    source: string
    sourceRef?: string
    count: number
    percentage?: number
    conversionRate?: number
  }>
  leadsBySourceLoading?: boolean
  leadsByStatus?: Array<{ status: string; statusRef?: string; count: number }>
  leadsByStatusLoading?: boolean

  // Optional: Top Lead Owners (can be hidden)

  // Optional: Lead drill-down (source / status pie chart click-through)
  selectedLeadFilter?: LeadDrillDownSelection | null
  onSourceClick?: (label: string, ref: string) => void
  onStatusClick?: (label: string, ref: string) => void
  renderLeadPanel?: (selection: LeadDrillDownSelection) => React.ReactNode

  // Optional: Lead Lifecycle chart drill-down
  onLifecyclePointClick?: (
    label: string,
    date: string,
    endDate: string,
    metric: 'leadsCreated' | 'leadsConverted' | 'leadsLost'
  ) => void
  selectedLeadLifecyclePoint?: LeadLifecyclePointSelection | null
  renderLeadLifecycleDrillDown?: (selection: LeadLifecyclePointSelection) => React.ReactNode

  /** Optional KPI title/description overrides (e.g. IRM investment terminology) */
  kpiLabels?: PartialTabKpiLabels<LeadsTabKpiLabels>
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
  leadsByStatusLoading = false,
  selectedLeadFilter,
  onSourceClick,
  onStatusClick,
  renderLeadPanel,
  onLifecyclePointClick,
  selectedLeadLifecyclePoint,
  renderLeadLifecycleDrillDown,
  kpiLabels = {}
}) => {
  const labels = mergeTabKpiLabels(DEFAULT_LEADS_TAB_KPI_LABELS, kpiLabels)
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
      title: labels.totalLeads.title,
      value: totalLeads || 0,
      prefix: <UsersIcon size={16} />,
      description: labels.totalLeads.description,
      // Add trend data for total leads with custom description format
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrendWithTotalDescription(totalLeads || 0, trendData.totalLeadsLastMonth)
          }
        : {})
    },
    {
      key: 'converted-leads',
      title: labels.convertedLeads.title,
      value: convertedLeads || 0,
      prefix: <CheckCircleIcon size={16} />,
      description: labels.convertedLeads.description,
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(trendData.currentMonthConvertedLeads, trendData.previousMonthConvertedLeads)
          }
        : {})
    },
    {
      key: 'conversion-rate',
      title: labels.conversionRate.title,
      value: conversionRate || 0,
      suffix: '%',
      prefix: <PercentIcon size={16} />,
      description: labels.conversionRate.description,
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
      title: labels.newThisMonth.title,
      value: trendData?.currentMonthLeads || 0,
      prefix: <TrendUpIcon size={16} />,
      description: labels.newThisMonth.description,
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
        onPointClick={onLifecyclePointClick}
      />

      {/* Lead Lifecycle chart drill-down panel */}
      {selectedLeadLifecyclePoint && renderLeadLifecycleDrillDown?.(selectedLeadLifecyclePoint)}

      {/* Optional: Distribution Pie Charts */}
      {(leadsBySource || leadsByStatus) && (
        <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2">
          {leadsBySource && (
            <LeadsBySourcePie
              data={leadsBySource.map(s => ({ source: s.source, sourceRef: s.sourceRef, count: s.count }))}
              isLoading={leadsBySourceLoading}
              moduleColor={moduleColor}
              onSliceClick={onSourceClick}
            />
          )}
          {leadsByStatus && (
            <LeadsByStatusPie
              data={leadsByStatus}
              isLoading={leadsByStatusLoading}
              moduleColor={moduleColor}
              onSliceClick={onStatusClick}
            />
          )}
        </div>
      )}

      {/* Lead drill-down panel (source or status) */}
      {selectedLeadFilter && renderLeadPanel?.(selectedLeadFilter)}
    </div>
  )
}

export default LeadsTabLayout
