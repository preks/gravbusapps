import { UsersThreeIcon, CurrencyCircleDollarIcon, ChartLineUpIcon, TrendUpIcon } from '@phosphor-icons/react'
import { KPIConfig } from './types'

/**
 * Generic KPI Configuration for Investment Groups
 *
 * This configuration provides the 4 basic KPIs that work for any investment group:
 * - Total Investments (count)
 * - Average Investment Value (currency)
 * - Active Investments (count)
 * - Total Investment Value (currency)
 *
 * Used as default for dynamically discovered investment groups that don't have
 * specialized KPI configurations defined in code.
 *
 * Based on: Liquid Fund and Private Equity KPI patterns
 * Data Source: useGenericInvestmentKPIs hook (created from createKPIQueryHook factory)
 */
export const GENERIC_INVESTMENT_KPI_CONFIG: KPIConfig = {
  name: 'Investment Metrics',
  description: 'Core investment value and performance metrics',
  kpis: [
    {
      key: 'total-investments',
      title: 'Total Investments',
      field: 'totalInvestments',
      icon: UsersThreeIcon,
      color: 'var(--nw-color-primary-500)',
      format: 'number',
      description: 'Investment count',
      order: 1,
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'average-investment-value',
      title: 'Average Investment Value',
      field: 'averageInvestmentValue',
      icon: CurrencyCircleDollarIcon,
      color: 'var(--nw-color-success-500)',
      format: 'currency',
      description: 'Avg per investment',
      order: 2,
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'active-investments',
      title: 'Active Investments',
      field: 'activeInvestments',
      icon: ChartLineUpIcon,
      color: 'var(--nw-color-warning-500)',
      format: 'number',
      description: 'Active positions',
      order: 3,
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'total-investment-value',
      title: 'Total Investment Value',
      field: 'totalAmountInvested',
      icon: TrendUpIcon,
      color: 'var(--nw-color-purple-500)',
      format: 'currency',
      description: 'Total capital deployed',
      order: 4,
      span: { xs: 24, sm: 12, lg: 6 }
    }
  ]
}
