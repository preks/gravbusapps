import { UsersThreeIcon, CurrencyCircleDollarIcon, TrendUpIcon, PercentIcon } from '@phosphor-icons/react'
import { KPIConfig } from './types'

/**
 * KPI Configuration for Real Estate Investments Tab
 *
 * These KPIs focus on real estate-specific metrics including property valuation
 * and occupancy rates.
 *
 * Data Source: useRealEstateKPIIntegration hook or RealEstateKPIQueries
 */
export const REAL_ESTATE_KPI_CONFIG: KPIConfig = {
  name: 'Real Estate Investments',
  description: 'Real estate-specific valuation and occupancy metrics',
  kpis: [
    {
      key: 'total-investments',
      title: 'Total Investments',
      field: 'totalInvestments',
      icon: UsersThreeIcon,
      color: 'var(--nw-color-primary-500)',
      format: 'number',
      description: 'Property count',
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
      description: 'Total capital',
      order: 2,
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'total-market-value',
      title: 'Total Market Value',
      field: 'totalMarketValue',
      icon: TrendUpIcon,
      color: 'var(--nw-color-warning-500)',
      format: 'currency',
      description: 'Current valuation',
      order: 3,
      span: { xs: 24, sm: 12, lg: 6 }
    },
    {
      key: 'average-occupancy-rate',
      title: 'Average Occupancy Rate',
      field: 'averageOccupancyRate',
      icon: PercentIcon,
      color: 'var(--nw-color-purple-500)',
      format: 'percentage',
      description: 'Portfolio avg',
      order: 4,
      span: { xs: 24, sm: 12, lg: 6 }
    }
  ]
}
