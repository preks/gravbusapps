import React, { useMemo, useEffect } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { DollarOutlined, RiseOutlined, PercentageOutlined, PieChartOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentKPIIntegration } from '../hooks/useInvestmentKPIIntegration'
import { formatCurrencyCompact } from '../../../utils/currencyUtils'

type InvestmentStatisticsProps = BusinessAppContextProps

// Removed formatCurrencyCompact - now using formatCurrencyCompact utility

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

export const InvestmentStatistics: React.FC<InvestmentStatisticsProps> = ({ ...context }) => {
  const { current, previous, isLoading, error, refetch } = useInvestmentKPIIntegration(context)

  // Listen for process completion events to refresh statistics
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('InvestmentStatistics: Process completion event received:', event.type)

        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          console.log('InvestmentStatistics: Process completed successfully, refreshing statistics')
          refetch()
          return
        }

        // Check for different event structures
        const response = event.detail?.response
        if (response?.detail?.resolution === 'success' || response?.investment) {
          console.log('InvestmentStatistics: Investment data detected, refreshing statistics')
          refetch()
          return
        }

        // Check for continue events with payload (investment creation/update)
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          console.log('InvestmentStatistics: Continue event with payload detected, refreshing statistics')
          refetch()
        }
      } catch (err) {
        console.error('Error handling process completion in InvestmentStatistics:', err)
      }
    }

    // Listen to multiple possible event names for investment updates
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ]

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion)
    })

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion)
      })
    }
  }, [refetch])

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
      description: 'Across all investment types',
      trend: {
        value: investmentsChange.value,
        positive: investmentsChange.positive,
        description: 'vs 7 days ago'
      }
    },
    {
      key: 'total-invested',
      title: 'Total Invested',
      value: formatCurrencyCompact(totalInvested),
      prefix: <DollarOutlined />,
      color: '#52c41a',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Sum of total investment amounts',
      trend: {
        value: investedChange.value,
        positive: investedChange.positive,
        description: 'vs 7 days ago'
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
      description: 'Average across all investments',
      trend: {
        value: stakeChange.value,
        positive: stakeChange.positive,
        description: 'vs 7 days ago'
      }
    },
    {
      key: 'total-market-value',
      title: 'Total Market Value',
      value: formatCurrencyCompact(totalMarketValue),
      prefix: <RiseOutlined />,
      color: '#722ed1',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Current market valuation',
      trend: {
        value: marketValueChange.value,
        positive: marketValueChange.positive,
        description: 'vs 7 days ago'
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
