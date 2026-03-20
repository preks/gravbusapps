import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label } from '@newwork/nw-design-system'
import {
  UserIcon,
  BankIcon,
  CurrencyCircleDollarIcon,
  AddressBookIcon,
  PercentIcon,
  TrophyIcon
} from '@phosphor-icons/react'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import type { OverviewTrendData } from '../../hooks'

// ============================================================================
// HELPER FUNCTIONS - Reduce cognitive complexity
// ============================================================================

/** Calculate percentage trend between current and previous values */
const calculateTrend = (
  current: number,
  previous: number
): { value: string; positive: boolean; description: string } => {
  // Handle edge case where previous is 0
  if (previous === 0) {
    if (current === 0) {
      return {
        value: '0.0%',
        positive: true,
        description: 'vs previous period (30 days ago)'
      }
    } else {
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

/** Build a count-based KPI widget with optional trend */
const buildCountWidget = (
  key: string,
  title: string,
  value: number,
  icon: React.ReactElement,
  description: string,
  trendData?: { current: number; previous: number },
  trendLoading?: boolean
): WidgetItem => ({
  key,
  title,
  value,
  prefix: icon,
  description,
  ...(trendData && !trendLoading ? { trend: calculateTrend(trendData.current, trendData.previous) } : {})
})

/** Build a percentage-based KPI widget with optional trend */
const buildPercentageWidget = (
  key: string,
  title: string,
  value: number,
  icon: React.ReactElement,
  description: string,
  trendData?: { current: number; previous: number },
  trendLoading?: boolean
): WidgetItem => ({
  key,
  title,
  value: `${value}%`,
  valueIsString: true,
  prefix: icon,
  description,
  ...(trendData && !trendLoading ? { trend: calculateTrend(trendData.current, trendData.previous) } : {})
})

/** Build a currency-based KPI widget with optional trend */
const buildCurrencyWidget = (params: {
  key: string
  title: string
  value: number
  currency: string
  icon: React.ReactElement
  description: string
  trendData?: { current: number; previous: number }
  trendLoading?: boolean
}): WidgetItem => ({
  key: params.key,
  title: params.title,
  value: formatCurrencyCompact(params.value, params.currency, undefined, 1, true),
  valueIsString: true,
  prefix: params.icon,
  description: params.description,
  ...(params.trendData && !params.trendLoading
    ? { trend: calculateTrend(params.trendData.current, params.trendData.previous) }
    : {})
})

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

  // Build KPI widgets based on visibility using helper functions
  const keyMetricsWidgets: WidgetItem[] = []

  if (visibility.leads) {
    keyMetricsWidgets.push(
      buildCountWidget(
        'total-leads',
        labels.leads.title,
        counts.leads,
        <UserIcon size={16} />,
        labels.leads.description,
        trendData?.leads,
        trendLoading
      )
    )
  }

  if (visibility.accounts) {
    keyMetricsWidgets.push(
      buildCountWidget(
        'total-accounts',
        labels.accounts.title,
        counts.accounts,
        <BankIcon size={16} />,
        labels.accounts.description,
        trendData?.accounts,
        trendLoading
      )
    )
  }

  if (visibility.opportunities) {
    keyMetricsWidgets.push(
      buildCountWidget(
        'total-opportunities',
        labels.opportunities.title,
        counts.opportunities,
        <CurrencyCircleDollarIcon />,
        labels.opportunities.description,
        trendData?.opportunities,
        trendLoading
      )
    )
  }

  if (visibility.contacts) {
    keyMetricsWidgets.push(
      buildCountWidget(
        'total-contacts',
        labels.contacts.title,
        counts.contacts,
        <AddressBookIcon size={16} />,
        labels.contacts.description,
        trendData?.contacts,
        trendLoading
      )
    )
  }

  const conversionWidgets: WidgetItem[] = []

  if (visibility.leadToOpportunityRate) {
    conversionWidgets.push(
      buildPercentageWidget(
        'lead-conversion-rate',
        labels.leadToOpportunityRate.title,
        conversionMetrics.leadToOpportunityRate,
        <PercentIcon size={16} />,
        labels.leadToOpportunityRate.description,
        trendData?.opportunities,
        trendLoading
      )
    )
  }

  if (visibility.opportunityWinRate) {
    conversionWidgets.push(
      buildPercentageWidget(
        'opportunity-win-rate',
        labels.opportunityWinRate.title,
        conversionMetrics.opportunityWinRate,
        <TrophyIcon />,
        labels.opportunityWinRate.description,
        trendData?.wonOpportunities,
        trendLoading
      )
    )
  }

  if (visibility.avgDealSize) {
    const currentAvgDealSize =
      trendData && trendData.wonOpportunities.current > 0
        ? trendData.wonRevenue.current / trendData.wonOpportunities.current
        : 0
    const previousAvgDealSize =
      trendData && trendData.wonOpportunities.previous > 0
        ? trendData.wonRevenue.previous / trendData.wonOpportunities.previous
        : 0

    conversionWidgets.push(
      buildCurrencyWidget({
        key: 'avg-deal-size',
        title: labels.avgDealSize.title,
        value: conversionMetrics.avgDealSize,
        currency: selectedCurrency,
        icon: <CurrencyCircleDollarIcon size={16} />,
        description: labels.avgDealSize.description,
        trendData: { current: currentAvgDealSize, previous: previousAvgDealSize },
        trendLoading
      })
    )
  }

  if (visibility.totalWonRevenue) {
    conversionWidgets.push(
      buildCurrencyWidget({
        key: 'total-won-revenue',
        title: labels.totalWonRevenue.title,
        value: conversionMetrics.totalWonRevenue,
        currency: selectedCurrency,
        icon: <CurrencyCircleDollarIcon size={16} />,
        description: labels.totalWonRevenue.description,
        trendData: trendData?.wonRevenue,
        trendLoading
      })
    )
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
