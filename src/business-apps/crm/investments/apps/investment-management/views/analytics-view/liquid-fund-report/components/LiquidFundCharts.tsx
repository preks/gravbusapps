import React from 'react'
import { Card } from '@newwork/nw-design-system'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ScatterChart,
  Scatter
} from 'recharts'
import { formatCurrency } from '@/common/data/investment'
import { LiquidFundTimelineCharts } from './LiquidFundTimelineCharts'
import { LiquidFundPortfolioCharts } from './LiquidFundPortfolioCharts'
import { LiquidFundDistributionCharts } from './LiquidFundDistributionCharts'

interface ChartData {
  // Enhanced data for new chart types
  performanceTimelineData: any[]
  yieldValueData: any[]
  maturityYieldData: any[]
  accountConcentrationData: any[]
  riskReturnData: any[]
  activePeriodsData: any[]
  interestRateDistributionData: any[]
  enhancedCurrencyData: any[]
  // Legacy data for backwards compatibility
  interestRateData: any[]
  maturityTimelineData: any[]
  paymentFrequencyData: any[]
  earlyTerminationData: any[]
  statusData: any[]
  phaseData: any[]
  riskLevelData: any[]
  currencyData: any[]
}

interface LiquidFundChartsProps {
  chartData: ChartData
}

export const LiquidFundCharts: React.FC<LiquidFundChartsProps> = ({ chartData }) => {
  const {
    // Enhanced data
    performanceTimelineData,
    yieldValueData,
    maturityYieldData,
    accountConcentrationData,
    riskReturnData,
    activePeriodsData,
    interestRateDistributionData,
    enhancedCurrencyData,
    // Legacy data
    interestRateData,
    maturityTimelineData,
    paymentFrequencyData,
    earlyTerminationData,
    statusData,
    phaseData,
    riskLevelData,
    currencyData
  } = chartData

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
      {/* Timeline and Performance Analysis Charts */}
      <LiquidFundTimelineCharts
        performanceTimelineData={performanceTimelineData}
        yieldValueData={yieldValueData}
        maturityYieldData={maturityYieldData}
        interestRateDistributionData={interestRateDistributionData}
      />

      {/* Portfolio Analysis Charts */}
      <LiquidFundPortfolioCharts
        accountConcentrationData={accountConcentrationData}
        riskReturnData={riskReturnData}
        enhancedCurrencyData={enhancedCurrencyData}
      />

      {/* Distribution Charts */}
      <LiquidFundDistributionCharts
        paymentFrequencyData={paymentFrequencyData}
        earlyTerminationData={earlyTerminationData}
        statusData={statusData}
        phaseData={phaseData}
        riskLevelData={riskLevelData}
        activePeriodsData={activePeriodsData}
      />

      {/* Legacy Charts - Keeping some original charts */}
      <Card title="Interest Rate Distribution" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={interestRateData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} fontSize={10} />
            <YAxis tickFormatter={value => `${value}%`} />
            <Tooltip formatter={value => [`${value}%`, 'Interest Rate']} />
            <Bar dataKey="value" fill="var(--nw-color-primary-500)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Maturity Timeline" style={{ borderRadius: '8px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={maturityTimelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis dataKey="maturityYear" fontSize={12} />
            <YAxis tickFormatter={value => formatCurrency(value, 'EUR').replace('€', '')} />
            <Tooltip
              formatter={value => [formatCurrency(value as number, 'EUR'), 'Total Value']}
              labelFormatter={label => `Maturity Year: ${label}`}
            />
            <Bar dataKey="value" fill="var(--nw-color-success-500)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
