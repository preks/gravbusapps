import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { DollarCircleOutlined, RiseOutlined, BankOutlined, TeamOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentStatisticsSection } from '@/common/data/investment/hooks/useInvestmentStatistics'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'

export interface EquityInvestmentStatisticsProps extends BusinessAppContextProps {
  currencyCode?: string
  statistics: InvestmentStatisticsSection
  isLoading?: boolean
  error?: string | null
  onRetry?: () => Promise<void>
}

export const EquityInvestmentStatistics: React.FC<EquityInvestmentStatisticsProps> = ({
  currencyCode,
  statistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const { current: kpis, previous: previousKpis } = statistics

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
      description: 'Equity count',
      trend: {
        value: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).value,
        positive: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).positive,
        description: 'vs last quarter'
      }
    },
    {
      key: 'total-amount-invested',
      title: 'Total Amount Invested',
      value: formatCurrencyCompact(kpis.totalInvested, currencyCode || 'EUR', undefined, 1, true),
      prefix: <DollarCircleOutlined />,
      color: '#52c41a',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Total capital',
      trend: {
        value: calculateChange(kpis.totalInvested, previousKpis.totalInvested).value,
        positive: calculateChange(kpis.totalInvested, previousKpis.totalInvested).positive,
        description: 'vs last quarter'
      }
    },
    {
      key: 'average-stake',
      title: 'Average Stake Percentage',
      value: `${kpis.averageStakePercentage.toFixed(1)}%`,
      prefix: <RiseOutlined />,
      color: '#faad14',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Avg across equity',
      trend: {
        value: calculateChange(kpis.averageStakePercentage, previousKpis.averageStakePercentage).value,
        positive: calculateChange(kpis.averageStakePercentage, previousKpis.averageStakePercentage).positive,
        description: 'vs last quarter'
      }
    },
    {
      key: 'total-market-value',
      title: 'Total Market Value',
      value: formatCurrencyCompact(kpis.totalMarketValue, currencyCode || 'EUR', undefined, 1, true),
      prefix: <BankOutlined />,
      color: '#722ed1',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Current valuation',
      trend: {
        value: calculateChange(kpis.totalMarketValue, previousKpis.totalMarketValue).value,
        positive: calculateChange(kpis.totalMarketValue, previousKpis.totalMarketValue).positive,
        description: 'vs last quarter'
      }
    }
  ]

  return (
    <div data-testid="equity-investment-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error ? new Error(error) : null}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No equity investment statistics available."
        data-testid="equity-investment-statistics"
      />
    </div>
  )
}

export default EquityInvestmentStatistics
