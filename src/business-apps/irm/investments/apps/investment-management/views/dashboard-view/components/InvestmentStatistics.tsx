import React, { useMemo } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { DollarOutlined, RiseOutlined, PercentageOutlined, PieChartOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentKPIIntegration } from '../hooks/useInvestmentKPIIntegration'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'

interface InvestmentStatisticsProps extends BusinessAppContextProps {
  selectedCurrency: string // Currency code like "EUR", "USD", etc.
}

// Removed formatCurrencyCompact - now using formatCurrencyCompact utility

const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`
}

const calculateChange = (current: number, previous: number): { value: string; positive: boolean } => {
  // If no previous data, show as new
  if (previous === 0) {
    return { value: current > 0 ? 'New' : 'N/A', positive: true }
  }

  const change = ((current - previous) / previous) * 100

  // Cap extreme percentages for better UX
  if (Math.abs(change) >= 1000) {
    return {
      value: change >= 0 ? '>+1000%' : '<-1000%',
      positive: change >= 0
    }
  }

  return {
    value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
    positive: change >= 0
  }
}

export const InvestmentStatistics: React.FC<InvestmentStatisticsProps> = ({ selectedCurrency, ...context }) => {
  const { current, previous, isLoading, error, refetch } = useInvestmentKPIIntegration(context, selectedCurrency)

  const { totalInvestments, totalInvested, averageStakePercentage, totalMarketValue } = useMemo(() => {
    return {
      totalInvestments: current.totalInvestments,
      totalInvested: current.totalInvested,
      averageStakePercentage: current.averageStakePercentage,
      totalMarketValue: current.totalMarketValue
    }
  }, [current])

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
      value: formatCurrencyCompact(totalInvested, selectedCurrency, undefined, 1, true),
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
      value: formatCurrencyCompact(totalMarketValue, selectedCurrency, undefined, 1, true),
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
        onRetry={refetch}
        skeletonCount={4}
        emptyText="No investment statistics available."
        data-testid="investment-statistics"
      />
    </div>
  )
}

export default InvestmentStatistics
