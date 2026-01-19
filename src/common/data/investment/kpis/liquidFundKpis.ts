import { UsersThreeIcon, CurrencyCircleDollarIcon, ChartLineUpIcon, TrendUpIcon } from '@phosphor-icons/react'
import { KPIConfig } from './types'

/**
 * KPI Configuration for Liquid Fund Investments Tab
 *
 * These KPIs focus on liquid fund-specific metrics including active positions
 * and total capital deployed.
 *
 * Data Source: useLiquidFundKPIIntegration hook or LiquidFundKPIQueries
 */
export const LIQUID_FUND_KPI_CONFIG: KPIConfig = {
  name: 'Liquid Fund Investments',
  description: 'Liquid fund-specific value and performance metrics',
  kpis: [
    {
      key: 'total-investments',
      title: 'Total Investments',
      field: 'totalInvestments',
      icon: UsersThreeIcon,
      color: 'var(--nw-color-primary-500)',
      format: 'number',
      description: 'Fund count',
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
      description: 'Avg per fund',
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
