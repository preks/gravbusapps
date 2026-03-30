import { UsersThreeIcon, ChartLineUpIcon, CalendarIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import { KPIConfig } from './types'

/**
 * KPI cards for Investment View (overview + all group tabs). Analytics views keep their own configs.
 */
export const INVESTMENT_VIEW_KPI_CONFIG: KPIConfig = {
  name: 'Investment portfolio',
  description: 'Count-based metrics for the investment list',
  kpis: [
    {
      key: 'total-investments',
      title: 'Total investments',
      field: 'totalInvestments',
      icon: UsersThreeIcon,
      color: 'var(--nw-color-primary-500)',
      format: 'number',
      description: 'All matching investments',
      order: 1,
      span: { xs: 24, sm: 12, lg: 6 },
      trendDescription: 'vs prior period'
    },
    {
      key: 'active-investments',
      title: 'Active investments',
      field: 'activeInvestments',
      icon: ChartLineUpIcon,
      color: 'var(--nw-color-warning-500)',
      format: 'number',
      description: 'Active status',
      order: 2,
      span: { xs: 24, sm: 12, lg: 6 },
      trendDescription: 'vs prior period'
    },
    {
      key: 'new-this-quarter',
      title: 'New this quarter',
      field: 'newThisQuarter',
      icon: CalendarIcon,
      color: 'var(--nw-color-success-500)',
      format: 'number',
      description: 'Created this quarter',
      order: 3,
      span: { xs: 24, sm: 12, lg: 6 },
      trendDescription: 'vs last quarter'
    },
    {
      key: 'new-this-year',
      title: 'New this year',
      field: 'newThisYear',
      icon: CalendarBlankIcon,
      color: 'var(--nw-color-purple-500)',
      format: 'number',
      description: 'Created this year',
      order: 4,
      span: { xs: 24, sm: 12, lg: 6 },
      trendDescription: 'vs last year'
    }
  ]
}
