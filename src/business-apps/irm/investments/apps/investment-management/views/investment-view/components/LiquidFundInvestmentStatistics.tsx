import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { DollarCircleOutlined, RiseOutlined, TeamOutlined, BankOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useLiquidFundKPIIntegration } from '../../analytics-view/liquid-fund-report/hooks/useLiquidFundKPIIntegration'
import { formatCurrency, calculateChange } from '../../analytics-view/shared/utils'

type LiquidFundInvestmentStatisticsProps = BusinessAppContextProps

export const LiquidFundInvestmentStatistics: React.FC<LiquidFundInvestmentStatisticsProps> = ({ ...context }) => {
  const { current: kpis, previous: previousKpis, isLoading, error, refetch } = useLiquidFundKPIIntegration(context)

  const widgets: WidgetItem[] = [
    {
      key: 'total-investments',
      title: 'Total Investments',
      value: kpis.totalInvestments,
      prefix: <TeamOutlined />,
      color: '#1677ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Total number of liquid fund investments',
      trend: {
        value: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).value,
        positive: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).positive,
        description: 'vs 7 days ago'
      }
    },
    {
      key: 'average-investment-value',
      title: 'Average Investment Value',
      value: formatCurrency(kpis.averageInvestmentValue),
      prefix: <DollarCircleOutlined />,
      color: '#52c41a',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Average value per liquid fund investment',
      trend: {
        value: calculateChange(kpis.averageInvestmentValue, previousKpis.averageInvestmentValue).value,
        positive: calculateChange(kpis.averageInvestmentValue, previousKpis.averageInvestmentValue).positive,
        description: 'vs 7 days ago'
      }
    },
    {
      key: 'average-market-value',
      title: 'Average Market Value',
      value: formatCurrency(kpis.averageMarketValue),
      prefix: <RiseOutlined />,
      color: '#faad14',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Average market value across all funds',
      trend: {
        value: calculateChange(kpis.averageMarketValue, previousKpis.averageMarketValue).value,
        positive: calculateChange(kpis.averageMarketValue, previousKpis.averageMarketValue).positive,
        description: 'vs 7 days ago'
      }
    },
    {
      key: 'total-fund-value',
      title: 'Total Fund Value',
      value: formatCurrency(kpis.totalMarketValue),
      prefix: <BankOutlined />,
      color: '#722ed1',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Total market value of all liquid funds',
      trend: {
        value: calculateChange(kpis.totalMarketValue, previousKpis.totalMarketValue).value,
        positive: calculateChange(kpis.totalMarketValue, previousKpis.totalMarketValue).positive,
        description: 'vs 7 days ago'
      }
    }
  ]

  return (
    <div data-testid="liquid-fund-investment-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error ? new Error(error) : null}
        onRetry={refetch}
        skeletonCount={4}
        emptyText="No liquid fund investment statistics available."
        data-testid="liquid-fund-investment-statistics"
      />
    </div>
  )
}

export default LiquidFundInvestmentStatistics
