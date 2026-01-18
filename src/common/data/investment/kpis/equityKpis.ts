import { UsersThreeIcon, CurrencyCircleDollarIcon, ChartLineIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import { KPIConfig } from './types'

/**
 * KPI Configuration for Equity Investments Tab
 *
 * These KPIs focus on equity-specific metrics including portfolio performance
 * (MOIC) and investment duration.
 *
 * Data Source: useEquityKPIIntegration hook or EquityKPIQueries
 */
export const EQUITY_KPI_CONFIG: KPIConfig = {
  name: 'Equity Investments',
  description: 'Equity-specific performance and duration metrics',
  kpis: [
    {
      key: 'total-investments',
      title: 'Total Investments',
      field: 'totalInvestments',
      icon: UsersThreeIcon,
      color: 'var(--nw-color-primary-500)',
      format: 'number',
      description: 'Equity count',
      order: 1,
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'total-amount-invested',
      title: 'Total Amount Invested',
      field: 'totalAmountInvested',
      icon: CurrencyCircleDollarIcon,
      color: 'var(--nw-color-success-500)',
      format: 'currency',
      description: 'Total AUM',
      order: 2,
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'portfolio-moic',
      title: 'Portfolio MOIC',
      field: 'portfolioMoic',
      icon: ChartLineIcon,
      color: 'var(--nw-color-warning-500)',
      format: 'multiplier',
      description: 'Avg MOIC',
      order: 3,
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'average-duration',
      title: 'Average Duration',
      field: 'averageDuration',
      icon: CalendarBlankIcon,
      color: 'var(--nw-color-purple-500)',
      format: 'duration',
      description: 'Avg holding period',
      order: 4,
      span: { xs: 24, sm: 12, lg: 6 }
    }
  ]
}
