import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label } from '@newwork/nw-design-system'
import {
  UserOutlined,
  BankOutlined,
  DollarCircleOutlined,
  ContactsOutlined,
  PercentageOutlined,
  TrophyOutlined
} from '@ant-design/icons'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import type { OverviewTrendData } from '../../hooks'

export interface OverviewCounts {
  leads: number
  accounts: number
  opportunities: number
  contacts: number
}

export interface ConversionMetrics {
  leadToOpportunityRate: number
  opportunityWinRate: number
  avgDealSize: number
  totalWonRevenue: number
  salesCycleLength?: number // Optional: not used in KPIs display
}

/**
 * Configuration for customizing KPI labels and descriptions
 * Allows modules (CRM, IRM, etc.) to use their own terminology
 */
export interface KpiLabels {
  // First row KPIs (entity counts)
  leads?: { title: string; description: string }
  accounts?: { title: string; description: string }
  opportunities?: { title: string; description: string }
  contacts?: { title: string; description: string }

  // Second row KPIs (conversion metrics)
  leadToOpportunityRate?: { title: string; description: string }
  opportunityWinRate?: { title: string; description: string }
  avgDealSize?: { title: string; description: string }
  totalWonRevenue?: { title: string; description: string }
}

/**
 * Configuration for showing/hiding specific KPIs
 * Set to false to hide a KPI from the overview
 */
export interface KpiVisibility {
  leads?: boolean
  accounts?: boolean
  opportunities?: boolean
  contacts?: boolean
  leadToOpportunityRate?: boolean
  opportunityWinRate?: boolean
  avgDealSize?: boolean
  totalWonRevenue?: boolean
}

export interface OverviewMetricsWidgetsProps {
  counts: OverviewCounts
  conversionMetrics: ConversionMetrics
  trendData?: OverviewTrendData | null
  trendLoading?: boolean
  selectedCurrency?: string
  onCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]

  // Optional: Customize KPI labels (defaults to CRM terminology)
  kpiLabels?: KpiLabels

  // Optional: Show/hide specific KPIs (all shown by default)
  kpiVisibility?: KpiVisibility
}

/**
 * Default KPI labels (CRM terminology)
 */
const DEFAULT_KPI_LABELS: Required<KpiLabels> = {
  leads: {
    title: 'Total Leads',
    description: 'Active leads in system'
  },
  accounts: {
    title: 'Total Accounts',
    description: 'Active accounts in system'
  },
  opportunities: {
    title: 'Total Opportunities',
    description: 'Active opportunities in pipeline'
  },
  contacts: {
    title: 'Total Contacts',
    description: 'Active contacts in system'
  },
  leadToOpportunityRate: {
    title: 'Lead to Opportunity Rate',
    description: 'Lead conversion efficiency'
  },
  opportunityWinRate: {
    title: 'Opportunity Win Rate',
    description: 'Deal closing success rate'
  },
  avgDealSize: {
    title: 'Avg Deal Size',
    description: 'Average opportunity value'
  },
  totalWonRevenue: {
    title: 'Total Won Revenue',
    description: 'Total revenue from won opportunities'
  }
}

const calculateTrend = (current: number, previous: number) => {
  console.log('Previos: ', previous)
  console.log('Current: ', current)
  // Handle edge case where previous is 0
  if (previous === 0) {
    if (current === 0) {
      // No change
      return {
        value: '0.0%',
        positive: true,
        description: 'vs previous period (30 days ago)'
      }
    } else {
      // Previous was 0, current is not - show 100% growth
      return {
        value: '+100.0%',
        positive: true,
        description: 'vs previous period (30 days ago)'
      }
    }
  }

  const change = ((current - previous) / previous) * 100
  return {
    value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
    positive: change >= 0,
    description: 'vs previous period (30 days ago)'
  }
}

export const OverviewMetricsWidgets: React.FC<OverviewMetricsWidgetsProps> = ({
  counts,
  conversionMetrics,
  trendData,
  trendLoading = false,
  selectedCurrency = 'EUR',
  onCurrencyChange,
  availableCurrencies = ['EUR', 'USD'],
  kpiLabels = {},
  kpiVisibility = {}
}) => {
  // Merge custom labels with defaults
  const labels = {
    leads: { ...DEFAULT_KPI_LABELS.leads, ...kpiLabels.leads },
    accounts: { ...DEFAULT_KPI_LABELS.accounts, ...kpiLabels.accounts },
    opportunities: { ...DEFAULT_KPI_LABELS.opportunities, ...kpiLabels.opportunities },
    contacts: { ...DEFAULT_KPI_LABELS.contacts, ...kpiLabels.contacts },
    leadToOpportunityRate: { ...DEFAULT_KPI_LABELS.leadToOpportunityRate, ...kpiLabels.leadToOpportunityRate },
    opportunityWinRate: { ...DEFAULT_KPI_LABELS.opportunityWinRate, ...kpiLabels.opportunityWinRate },
    avgDealSize: { ...DEFAULT_KPI_LABELS.avgDealSize, ...kpiLabels.avgDealSize },
    totalWonRevenue: { ...DEFAULT_KPI_LABELS.totalWonRevenue, ...kpiLabels.totalWonRevenue }
  }

  // Default visibility: all KPIs are shown unless explicitly hidden
  const visibility = {
    leads: kpiVisibility.leads !== false,
    accounts: kpiVisibility.accounts !== false,
    opportunities: kpiVisibility.opportunities !== false,
    contacts: kpiVisibility.contacts !== false,
    leadToOpportunityRate: kpiVisibility.leadToOpportunityRate !== false,
    opportunityWinRate: kpiVisibility.opportunityWinRate !== false,
    avgDealSize: kpiVisibility.avgDealSize !== false,
    totalWonRevenue: kpiVisibility.totalWonRevenue !== false
  }

  // Build KPI widgets based on visibility
  const keyMetricsWidgets: WidgetItem[] = []

  if (visibility.leads) {
    keyMetricsWidgets.push({
      key: 'total-leads',
      title: labels.leads.title,
      value: counts.leads,
      prefix: <UserOutlined />,
      description: labels.leads.description,
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.leads.current, trendData.leads.previous) }
        : {})
    })
  }

  if (visibility.accounts) {
    keyMetricsWidgets.push({
      key: 'total-accounts',
      title: labels.accounts.title,
      value: counts.accounts,
      prefix: <BankOutlined />,
      description: labels.accounts.description,
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.accounts.current, trendData.accounts.previous) }
        : {})
    })
  }

  if (visibility.opportunities) {
    keyMetricsWidgets.push({
      key: 'total-opportunities',
      title: labels.opportunities.title,
      value: counts.opportunities,
      prefix: <DollarCircleOutlined />,
      description: labels.opportunities.description,
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.opportunities.current, trendData.opportunities.previous) }
        : {})
    })
  }

  if (visibility.contacts) {
    keyMetricsWidgets.push({
      key: 'total-contacts',
      title: labels.contacts.title,
      value: counts.contacts,
      prefix: <ContactsOutlined />,
      description: labels.contacts.description,
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.contacts.current, trendData.contacts.previous) }
        : {})
    })
  }

  const conversionWidgets: WidgetItem[] = []

  if (visibility.leadToOpportunityRate) {
    // Trend shows change in opportunities created (last 30 days vs previous 30 days)
    // Note: We compare absolute counts, not rates, to avoid division by zero when few entities exist
    conversionWidgets.push({
      key: 'lead-conversion-rate',
      title: labels.leadToOpportunityRate.title,
      value: `${conversionMetrics.leadToOpportunityRate}%`,
      valueIsString: true,
      prefix: <PercentageOutlined />,
      description: labels.leadToOpportunityRate.description,
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.opportunities.current, trendData.opportunities.previous) }
        : {})
    })
  }

  if (visibility.opportunityWinRate) {
    // Trend shows change in won opportunities (last 30 days vs previous 30 days)
    // Note: We compare absolute counts, not rates, to avoid division by zero when few entities exist
    conversionWidgets.push({
      key: 'opportunity-win-rate',
      title: labels.opportunityWinRate.title,
      value: `${conversionMetrics.opportunityWinRate}%`,
      valueIsString: true,
      prefix: <TrophyOutlined />,
      description: labels.opportunityWinRate.description,
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.wonOpportunities.current, trendData.wonOpportunities.previous) }
        : {})
    })
  }

  if (visibility.avgDealSize) {
    // Calculate avg deal size for each period (last 30 days vs previous 30 days)
    // If no won opportunities in a period, default to 0 to avoid division by zero
    const currentAvgDealSize =
      trendData && trendData.wonOpportunities.current > 0
        ? trendData.wonRevenue.current / trendData.wonOpportunities.current
        : 0
    const previousAvgDealSize =
      trendData && trendData.wonOpportunities.previous > 0
        ? trendData.wonRevenue.previous / trendData.wonOpportunities.previous
        : 0

    conversionWidgets.push({
      key: 'avg-deal-size',
      title: labels.avgDealSize.title,
      value: formatCurrencyCompact(conversionMetrics.avgDealSize, selectedCurrency, undefined, 1, true),
      valueIsString: true,
      prefix: <DollarCircleOutlined />,
      description: labels.avgDealSize.description,
      ...(trendData && !trendLoading ? { trend: calculateTrend(currentAvgDealSize, previousAvgDealSize) } : {})
    })
  }

  if (visibility.totalWonRevenue) {
    conversionWidgets.push({
      key: 'total-won-revenue',
      title: labels.totalWonRevenue.title,
      value: formatCurrencyCompact(conversionMetrics.totalWonRevenue, selectedCurrency, undefined, 1, true),
      valueIsString: true,
      prefix: <DollarCircleOutlined />,
      description: labels.totalWonRevenue.description,
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.wonRevenue.current, trendData.wonRevenue.previous) }
        : {})
    })
  }

  const allKpiWidgets = [...keyMetricsWidgets, ...conversionWidgets]

  return (
    <div data-testid="overview-metrics-section">
      {/* Currency Filter for KPIs */}
      {availableCurrencies && availableCurrencies.length > 1 && onCurrencyChange && (
        <div className="gba:mb-4 gba:flex gba:items-center gba:justify-end gba:gap-2" data-testid="kpi-currency-filter">
          <Label className="gba:text-sm gba:font-medium">Currency</Label>
          <Select value={selectedCurrency} onValueChange={onCurrencyChange}>
            <SelectTrigger className="gba:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableCurrencies.map(currency => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <WidgetGroup widgets={allKpiWidgets} isLoading={trendLoading} data-testid="overview-all-kpis" />
    </div>
  )
}

export default OverviewMetricsWidgets
