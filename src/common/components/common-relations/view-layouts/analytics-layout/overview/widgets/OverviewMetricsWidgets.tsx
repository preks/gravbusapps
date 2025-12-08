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
  salesCycleLength: number
}

export interface TrendData {
  totalLeadsThisMonth: number
  totalLeadsLastMonth: number
  totalAccountsThisMonth: number
  totalAccountsLastMonth: number
  totalOpportunitiesThisMonth: number
  totalOpportunitiesLastMonth: number
  totalContactsThisMonth: number
  totalContactsLastMonth: number
  currentMonthWonOpportunities: number
  previousMonthWonOpportunities: number
  // New trend metrics for conversion rates and performance indicators
  currentMonthLeadConversionRate: number
  previousMonthLeadConversionRate: number
  currentMonthAvgDealSize: number
  previousMonthAvgDealSize: number
  currentMonthSalesCycleLength: number
  previousMonthSalesCycleLength: number
}

export interface OverviewMetricsWidgetsProps {
  counts: OverviewCounts
  conversionMetrics: ConversionMetrics
  trendData?: TrendData | null
  trendLoading?: boolean
  selectedCurrency?: string
  onCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]
}

const calculateTrend = (current: number, previous: number) => {
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
  availableCurrencies = ['EUR', 'USD']
}) => {
  const keyMetricsWidgets: WidgetItem[] = [
    {
      key: 'total-leads',
      title: 'Total Leads',
      value: counts.leads,
      prefix: <UserOutlined />,
      description: 'Active leads in system',
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.totalLeadsThisMonth, trendData.totalLeadsLastMonth) }
        : {})
    },
    {
      key: 'total-accounts',
      title: 'Total Accounts',
      value: counts.accounts,
      prefix: <BankOutlined />,
      description: 'Active accounts in system',
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.totalAccountsThisMonth, trendData.totalAccountsLastMonth) }
        : {})
    },
    {
      key: 'total-opportunities',
      title: 'Total Opportunities',
      value: counts.opportunities,
      prefix: <DollarCircleOutlined />,
      description: 'Active opportunities in pipeline',
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.totalOpportunitiesThisMonth, trendData.totalOpportunitiesLastMonth) }
        : {})
    },
    {
      key: 'total-contacts',
      title: 'Total Contacts',
      value: counts.contacts,
      prefix: <ContactsOutlined />,
      description: 'Active contacts in system',
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.totalContactsThisMonth, trendData.totalContactsLastMonth) }
        : {})
    }
  ]

  const conversionWidgets: WidgetItem[] = [
    {
      key: 'lead-conversion-rate',
      title: 'Lead to Opportunity Rate',
      value: `${conversionMetrics.leadToOpportunityRate}%`,
      valueIsString: true,
      prefix: <PercentageOutlined />,
      description: 'Lead conversion efficiency',
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.currentMonthLeadConversionRate, trendData.previousMonthLeadConversionRate) }
        : {})
    },
    {
      key: 'opportunity-win-rate',
      title: 'Opportunity Win Rate',
      value: `${conversionMetrics.opportunityWinRate}%`,
      valueIsString: true,
      prefix: <TrophyOutlined />,
      description: 'Deal closing success rate',
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.currentMonthWonOpportunities, trendData.previousMonthWonOpportunities) }
        : {})
    },
    {
      key: 'avg-deal-size',
      title: 'Avg Deal Size',
      value: formatCurrencyCompact(conversionMetrics.avgDealSize, selectedCurrency, undefined, 1, true),
      valueIsString: true,
      prefix: <DollarCircleOutlined />,
      description: 'Average opportunity value',
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.currentMonthAvgDealSize, trendData.previousMonthAvgDealSize) }
        : {})
    },
    {
      key: 'total-won-revenue',
      title: 'Total Won Revenue',
      value: formatCurrencyCompact(conversionMetrics.salesCycleLength, selectedCurrency, undefined, 1, true),
      valueIsString: true,
      prefix: <DollarCircleOutlined />,
      description: 'Total revenue from won opportunities',
      ...(trendData && !trendLoading
        ? { trend: calculateTrend(trendData.currentMonthSalesCycleLength, trendData.previousMonthSalesCycleLength) }
        : {})
    }
  ]

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
