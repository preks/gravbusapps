import { ChartPieIcon, ChartBarIcon, CurrencyDollarIcon, TrendUpIcon } from '@phosphor-icons/react'
import { KPIConfig } from './types'

/**
 * KPI Configuration for Investment Portfolio Overview Tab
 *
 * These KPIs provide a high-level view of the entire investment portfolio
 * across all investment types (Equity, Liquid Funds, Real Estate).
 *
 * Data Source: useInvestmentPortfolioIntegration hook or PortfolioKPIQueries
 */
export const OVERVIEW_KPI_CONFIG: KPIConfig = {
  name: 'Investment Portfolio Overview',
  description: 'High-level portfolio metrics across all investment types',
  kpis: [
    {
      key: 'total-portfolio-value',
      title: 'Total Portfolio Value',
      field: 'totalPortfolioValue',
      icon: ChartPieIcon,
      color: 'var(--nw-color-primary-500)',
      format: 'currency',
      description: 'All investments',
      order: 1,
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'total-investments',
      title: 'Total Investments',
      field: 'totalInvestments',
      icon: ChartBarIcon,
      color: 'var(--nw-color-success-500)',
      format: 'number',
      description: 'Investment count',
      order: 2,
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'total-amount-invested',
      title: 'Total Amount Invested',
      field: 'totalAmountInvested',
      icon: CurrencyDollarIcon,
      color: 'var(--nw-color-warning-500)',
      format: 'currency',
      description: 'Total capital',
      order: 3,
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'active-investments',
      title: 'Active Investments',
      field: 'activeInvestments',
      icon: TrendUpIcon,
      color: 'var(--nw-color-purple-500)',
      format: 'number',
      description: 'Active positions',
      order: 4,
      span: { xs: 24, sm: 12, lg: 6 }
    }
  ]
}
