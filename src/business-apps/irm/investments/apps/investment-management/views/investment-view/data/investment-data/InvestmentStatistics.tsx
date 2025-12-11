import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { DollarOutlined, RiseOutlined, PercentageOutlined, PieChartOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentStatisticsSection } from '@/common/data/investment/hooks/useInvestmentStatistics'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'

export interface InvestmentStatisticsProps extends BusinessAppContextProps {
  currencyCode?: string
  statistics: InvestmentStatisticsSection
  isLoading?: boolean
  error?: string | null
  onRetry?: () => Promise<void>
}

const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`
}

const calculateChange = (current: number, previous: number): { value: string; positive: boolean } => {
  if (previous === 0) return { value: 'N/A', positive: true }
  const change = ((current - previous) / previous) * 100
  return {
    value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
    positive: change >= 0
  }
}

export const InvestmentStatistics: React.FC<InvestmentStatisticsProps> = ({
  currencyCode,
  statistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const { current, previous } = statistics
  const { totalInvestments, totalInvested, averageStakePercentage, totalMarketValue } = current

  // Calculate comparison trends using real historical data
  const investmentsChange = calculateChange(totalInvestments, previous.totalInvestments)
  const investedChange = calculateChange(totalInvested, previous.totalInvested)
  const stakeChange = calculateChange(averageStakePercentage, previous.averageStakePercentage)
  const marketValueChange = calculateChange(totalMarketValue, previous.totalMarketValue)

  const widgets: WidgetItem[] = [
    {
      key: 'total-investments',
      title: 'Total Investments',
      value: totalInvestments,
      prefix: <PieChartOutlined />,
      color: '#1677ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'All types',
      trend: {
        value: investmentsChange.value,
        positive: investmentsChange.positive,
        description: 'vs last quarter'
      }
    },
    {
      key: 'total-invested',
      title: 'Total Invested',
      value: formatCurrencyCompact(totalInvested, currencyCode || 'EUR', undefined, 1, true),
      prefix: <DollarOutlined />,
      color: '#52c41a',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Total capital',
      trend: {
        value: investedChange.value,
        positive: investedChange.positive,
        description: 'vs last quarter'
      }
    },
    {
      key: 'average-stake',
      title: 'Average Stake Percentage',
      value: formatPercentage(averageStakePercentage),
      prefix: <PercentageOutlined />,
      color: '#faad14',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Portfolio avg',
      trend: {
        value: stakeChange.value,
        positive: stakeChange.positive,
        description: 'vs last quarter'
      }
    },
    {
      key: 'total-market-value',
      title: 'Total Market Value',
      value: formatCurrencyCompact(totalMarketValue, currencyCode || 'EUR', undefined, 1, true),
      prefix: <RiseOutlined />,
      color: '#722ed1',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Current valuation',
      trend: {
        value: marketValueChange.value,
        positive: marketValueChange.positive,
        description: 'vs last quarter'
      }
    }
  ]

  return (
    <div data-testid="investment-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error ? new Error(error) : null}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No investment statistics available."
        data-testid="investment-statistics"
      />
    </div>
  )
}

export default InvestmentStatistics
