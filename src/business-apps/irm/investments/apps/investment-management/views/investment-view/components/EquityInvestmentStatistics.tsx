import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { DollarCircleOutlined, RiseOutlined, BankOutlined, TeamOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEquityKPIIntegration } from '../../analytics-view/equity-analytics/hooks/useEquityKPIIntegration'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'

type EquityInvestmentStatisticsProps = BusinessAppContextProps

export const EquityInvestmentStatistics: React.FC<EquityInvestmentStatisticsProps> = ({ ...context }) => {
  const { current: kpis, previous: previousKpis, isLoading, error, refetch } = useEquityKPIIntegration(context)

  // Calculate percentage change between current and previous values
  const calculateChange = (current: number, previous: number): { value: string; positive: boolean } => {
    if (previous === 0) {
      return { value: current > 0 ? '+100%' : '0%', positive: current > 0 }
    }
    const change = ((current - previous) / Math.abs(previous)) * 100
    const formattedChange = Math.abs(change).toFixed(1)
    return {
      value: `${change >= 0 ? '+' : '-'}${formattedChange}%`,
      positive: change >= 0
    }
  }

  const widgets: WidgetItem[] = [
    {
      key: 'total-investments',
      title: 'Total Investments',
      value: kpis.totalInvestments,
      prefix: <TeamOutlined />,
      color: '#1677ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Total number of equity investments',
      trend: {
        value: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).value,
        positive: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).positive,
        description: 'vs 7 days ago'
      }
    },
    {
      key: 'total-amount-invested',
      title: 'Total Amount Invested',
      value: formatCurrencyCompact(kpis.totalAmountInvested, 'EUR', undefined, 1, true),
      prefix: <DollarCircleOutlined />,
      color: '#52c41a',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Sum of all equity investment amounts',
      trend: {
        value: calculateChange(kpis.totalAmountInvested, previousKpis.totalAmountInvested).value,
        positive: calculateChange(kpis.totalAmountInvested, previousKpis.totalAmountInvested).positive,
        description: 'vs 7 days ago'
      }
    },
    {
      key: 'portfolio-moic',
      title: 'Portfolio MOIC',
      value: kpis.portfolioMoic.toFixed(2) + 'x',
      prefix: <RiseOutlined />,
      color: '#faad14',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Multiple on Invested Capital for equity portfolio',
      trend: {
        value: calculateChange(kpis.portfolioMoic, previousKpis.portfolioMoic).value,
        positive: calculateChange(kpis.portfolioMoic, previousKpis.portfolioMoic).positive,
        description: 'vs 7 days ago'
      }
    },
    {
      key: 'average-duration',
      title: 'Average Duration',
      value: Math.round(kpis.averageDuration) + ' days',
      prefix: <BankOutlined />,
      color: '#722ed1',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Average investment holding period',
      trend: {
        value: calculateChange(kpis.averageDuration, previousKpis.averageDuration).value,
        positive: calculateChange(kpis.averageDuration, previousKpis.averageDuration).positive,
        description: 'vs 7 days ago'
      }
    }
  ]

  return (
    <div data-testid="equity-investment-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error ? new Error(error) : null}
        onRetry={refetch}
        skeletonCount={4}
        emptyText="No equity investment statistics available."
        data-testid="equity-investment-statistics"
      />
    </div>
  )
}

export default EquityInvestmentStatistics
