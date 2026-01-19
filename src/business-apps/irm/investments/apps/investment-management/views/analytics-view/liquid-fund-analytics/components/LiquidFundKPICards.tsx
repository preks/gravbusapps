import React from 'react'
import { CurrencyCircleDollarIcon, ChartLineUpIcon, TrendUpIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import { LiquidFundInvestmentKPIs } from '../LiquidFundInvestmentsReport'

interface LiquidFundKPICardsProps {
  kpis: LiquidFundInvestmentKPIs
  currency?: string
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
  prefixDataTestId?: string
}

// Calculate percentage change for comparison
const calculateChange = (current: number, previous: number): { value: string; positive: boolean } => {
  if (previous === 0) return { value: 'N/A', positive: true }
  const change = ((current - previous) / previous) * 100
  return {
    value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
    positive: change >= 0
  }
}

export const LiquidFundKPICards: React.FC<LiquidFundKPICardsProps> = ({
  kpis,
  currency = 'EUR',
  isLoading = false,
  error = null,
  onRetry,
  prefixDataTestId = 'LiquidFundKPICards'
}) => {
  // Calculate trends for each KPI
  const totalInvestmentsChange = calculateChange(kpis.totalInvestments, kpis.previousTotalInvestments || 0)
  const averageInvestmentValueChange = calculateChange(
    kpis.averageInvestmentValue,
    kpis.previousAverageInvestmentValue || 0
  )
  const activeInvestmentsChange = calculateChange(kpis.activeInvestments, kpis.previousActiveInvestments || 0)
  const totalAmountInvestedChange = calculateChange(kpis.totalAmountInvested, kpis.previousTotalAmountInvested || 0)

  const widgets: WidgetItem[] = [
    {
      key: 'total-investments',
      title: 'Total Investments',
      value: kpis.totalInvestments,
      prefix: <UsersThreeIcon />,
      color: 'var(--nw-color-primary-500)',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Fund count',
      trend: {
        value: totalInvestmentsChange.value,
        positive: totalInvestmentsChange.positive,
        description: 'vs last quarter'
      }
    },
    {
      key: 'average-investment-value',
      title: 'Average Investment Value',
      value: formatCurrencyCompact(kpis.averageInvestmentValue, currency, undefined, 1, true),
      prefix: <CurrencyCircleDollarIcon />,
      color: 'var(--nw-color-success-500)',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Avg per fund',
      trend: {
        value: averageInvestmentValueChange.value,
        positive: averageInvestmentValueChange.positive,
        description: 'vs last quarter'
      }
    },
    {
      key: 'active-investments',
      title: 'Active Investments',
      value: kpis.activeInvestments,
      prefix: <ChartLineUpIcon />,
      color: 'var(--nw-color-warning-500)',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Active positions',
      trend: {
        value: activeInvestmentsChange.value,
        positive: activeInvestmentsChange.positive,
        description: 'vs last quarter'
      }
    },
    {
      key: 'total-investment-value',
      title: 'Total Investment Value',
      value: formatCurrencyCompact(kpis.totalAmountInvested, currency, undefined, 1, true),
      prefix: <TrendUpIcon />,
      color: 'var(--nw-color-purple-500)',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Total capital deployed',
      trend: {
        value: totalAmountInvestedChange.value,
        positive: totalAmountInvestedChange.positive,
        description: 'vs last quarter'
      }
    }
  ]

  return (
    <div data-testid={`${prefixDataTestId}-container`}>
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No liquid fund statistics available."
        data-testid={prefixDataTestId}
      />
    </div>
  )
}
