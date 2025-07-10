import React from 'react';
import { PortfolioTimelineCharts } from './PortfolioTimelineCharts';
import { PortfolioAnalyticsCharts } from './PortfolioAnalyticsCharts';
import { PortfolioDistributionCharts } from './PortfolioDistributionCharts';

interface ChartData {
  // Original data
  investmentTypeData: any[];
  investmentGroupData: any[];
  statusData: any[];
  phaseData: any[];
  riskLevelData: any[];
  currencyData: any[];
  roiData: any[];
  valueOverTimeData: any[];
  // Enhanced analytics data
  performanceTimelineData: any[];
  sizeVsRoiData: any[];
  leverageAnalysisData: any[];
  riskReturnData: any[];
  concentrationByGroupData: any[];
  activePeriodData: any[];
  valueByAccountData: any[];
  roiDistributionData: any[];
}

interface PortfolioChartsProps {
  chartData: ChartData;
}

export const PortfolioCharts: React.FC<PortfolioChartsProps> = ({ chartData }) => {
  const {
    // Original data
    investmentTypeData,
    investmentGroupData,
    statusData,
    phaseData,
    riskLevelData,
    currencyData,
    roiData,
    valueOverTimeData,
    // Enhanced analytics data
    performanceTimelineData,
    sizeVsRoiData,
    leverageAnalysisData,
    riskReturnData,
    concentrationByGroupData,
    activePeriodData,
    valueByAccountData,
    roiDistributionData
  } = chartData;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
      {/* Timeline and Trend Analysis */}
      <PortfolioTimelineCharts
        performanceTimelineData={performanceTimelineData}
        valueOverTimeData={valueOverTimeData}
      />
      
      {/* Analytics and Correlation Charts */}
      <PortfolioAnalyticsCharts
        sizeVsRoiData={sizeVsRoiData}
        leverageAnalysisData={leverageAnalysisData}
        riskReturnData={riskReturnData}
        concentrationByGroupData={concentrationByGroupData}
        valueByAccountData={valueByAccountData}
      />
      
      {/* Distribution Charts */}
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
  );
}; 