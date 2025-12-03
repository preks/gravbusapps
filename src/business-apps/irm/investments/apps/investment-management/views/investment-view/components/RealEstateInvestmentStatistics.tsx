import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { DollarCircleOutlined, RiseOutlined, TeamOutlined, PercentageOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useRealEstateKPIIntegration } from '../../analytics-view/real-estate-analytics/hooks/useRealEstateKPIIntegration'
import { formatCurrencyCompact, formatPercentage } from '@/common/utils/numberFormatter'

export interface RealEstateInvestmentStatisticsProps extends BusinessAppContextProps {
  currencyCode?: string
}

export const RealEstateInvestmentStatistics: React.FC<RealEstateInvestmentStatisticsProps> = ({
  currencyCode,
  ...context
}) => {
  const {
    current: kpis,
    previous: previousKpis,
    isLoading,
    error,
    refetch
  } = useRealEstateKPIIntegration(context, currencyCode)

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
      description: 'Total number of real estate investments',
      trend: {
        value: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).value,
        positive: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).positive,
        description: 'vs last quarter'
      }
    },
    {
      key: 'total-amount-invested',
      title: 'Total Amount Invested',
      value: formatCurrencyCompact(kpis.totalAmountInvested, currencyCode || 'EUR', undefined, 1, true),
      prefix: <DollarCircleOutlined />,
      color: '#52c41a',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Sum of all real estate investment amounts',
      trend: {
        value: calculateChange(kpis.totalAmountInvested, previousKpis.totalAmountInvested).value,
        positive: calculateChange(kpis.totalAmountInvested, previousKpis.totalAmountInvested).positive,
        description: 'vs last quarter'
      }
    },
    {
      key: 'total-market-value',
      title: 'Total Market Value',
      value: formatCurrencyCompact(kpis.totalMarketValue, currencyCode || 'EUR', undefined, 1, true),
      prefix: <RiseOutlined />,
      color: '#faad14',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Current total market value of properties',
      trend: {
        value: calculateChange(kpis.totalMarketValue, previousKpis.totalMarketValue).value,
        positive: calculateChange(kpis.totalMarketValue, previousKpis.totalMarketValue).positive,
        description: 'vs last quarter'
      }
    },
    {
      key: 'average-occupancy-rate',
      title: 'Average Occupancy Rate',
      value: formatPercentage(kpis.averageOccupancyRate),
      prefix: <PercentageOutlined />,
      color: '#722ed1',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Average occupancy rate across all properties',
      trend: {
        value: calculateChange(kpis.averageOccupancyRate, previousKpis.averageOccupancyRate).value,
        positive: calculateChange(kpis.averageOccupancyRate, previousKpis.averageOccupancyRate).positive,
        description: 'vs last quarter'
      }
    }
  ]

  return (
    <div data-testid="real-estate-investment-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error ? new Error(error) : null}
        onRetry={refetch}
        skeletonCount={4}
        emptyText="No real estate investment statistics available."
        data-testid="real-estate-investment-statistics"
      />
    </div>
  )
}

export default RealEstateInvestmentStatistics
