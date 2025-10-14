import React from 'react'
import { PortfolioTimelineCharts } from './PortfolioTimelineCharts'
import { PortfolioAnalyticsCharts } from './PortfolioAnalyticsCharts'
import { PortfolioDistributionCharts } from './PortfolioDistributionCharts'

interface ChartData {
  investmentTypeData: any[]
  investmentGroupData: any[]
  statusData: any[]
  phaseData: any[]
  riskLevelData: any[]
  currencyData: any[]
  roiData: any[]
  valueOverTimeData: any[]
  performanceTimelineData: any[]
  sizeVsRoiData: any[]
  leverageAnalysisData: any[]
  riskReturnData: any[]
  concentrationByGroupData: any[]
  activePeriodData: any[]
  valueByAccountData: any[]
  roiDistributionData: any[]
}

interface PortfolioChartsProps {
  chartData: ChartData
}

export const PortfolioCharts: React.FC<PortfolioChartsProps> = ({ chartData }) => {
  const {
    investmentTypeData,
    investmentGroupData,
    statusData,
    phaseData,
    riskLevelData,
    currencyData,
    roiData,
    valueOverTimeData,
    performanceTimelineData,
    sizeVsRoiData,
    leverageAnalysisData,
    riskReturnData,
    concentrationByGroupData,
    activePeriodData,
    valueByAccountData,
    roiDistributionData
  } = chartData

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
      <PortfolioTimelineCharts
        performanceTimelineData={performanceTimelineData}
        valueOverTimeData={valueOverTimeData}
      />
      <PortfolioAnalyticsCharts
        sizeVsRoiData={sizeVsRoiData}
        leverageAnalysisData={leverageAnalysisData}
        riskReturnData={riskReturnData}
        concentrationByGroupData={concentrationByGroupData}
        valueByAccountData={valueByAccountData}
      />
      <PortfolioDistributionCharts
        investmentTypeData={investmentTypeData}
        investmentGroupData={investmentGroupData}
        statusData={statusData}
        phaseData={phaseData}
        riskLevelData={riskLevelData}
        currencyData={currencyData}
        roiData={roiData}
        roiDistributionData={roiDistributionData}
      />
    </div>
  )
}
