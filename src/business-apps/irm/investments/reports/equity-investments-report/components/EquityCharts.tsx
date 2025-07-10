import React from 'react';
import { EquityTimelineCharts } from './EquityTimelineCharts';
import { EquityAnalyticsCharts } from './EquityAnalyticsCharts';
import { EquityDistributionCharts } from './EquityDistributionCharts';

interface ChartData {
  // Original data
  roleData: any[];
  valuationEbitdaData: any[];
  ebitdaMarginData: any[];
  statusData: any[];
  phaseData: any[];
  riskLevelData: any[];
  currencyData: any[];
  roiData: any[];
  // Enhanced analytics data
  equityTimelineData: any[];
  stakeVsValuationData: any[];
  ebitdaValuationAnalysisData: any[];
  rolePerformanceData: any[];
  concentrationByRoleData: any[];
  equityActivePeriodData: any[];
  topCompaniesByValuationData: any[];
  valuationDistributionData: any[];
}

interface EquityChartsProps {
  chartData: ChartData;
}

export const EquityCharts: React.FC<EquityChartsProps> = ({ chartData }) => {
  const {
    // Original chart data
    roleData,
    valuationEbitdaData,
    ebitdaMarginData,
    statusData,
    phaseData,
    riskLevelData,
    currencyData,
    roiData,
    // Enhanced chart data
    equityTimelineData,
    stakeVsValuationData,
    ebitdaValuationAnalysisData,
    rolePerformanceData,
    concentrationByRoleData,
    topCompaniesByValuationData,
    valuationDistributionData
  } = chartData;

  // Debug the data
  console.log('ebitdaValuationAnalysisData:', ebitdaValuationAnalysisData);
  console.log('valuationDistributionData:', valuationDistributionData);

  return (
    <>
      {/* Distribution and Overview Charts */}
      <EquityDistributionCharts
        roleData={roleData}
        statusData={statusData}
        phaseData={phaseData}
        riskLevelData={riskLevelData}
        currencyData={currencyData}
        roiData={roiData}
        ebitdaMarginData={ebitdaMarginData}
        valuationEbitdaData={valuationEbitdaData}
      />

      {/* Analytics and Performance Charts */}
      <EquityAnalyticsCharts
        stakeVsValuationData={stakeVsValuationData}
        ebitdaValuationAnalysisData={ebitdaValuationAnalysisData}
        rolePerformanceData={rolePerformanceData}
        concentrationByRoleData={concentrationByRoleData}
        valuationDistributionData={valuationDistributionData}
      />

      {/* Timeline and Trend Analysis Charts */}
      <EquityTimelineCharts
        equityTimelineData={equityTimelineData}
        topCompaniesByValuationData={topCompaniesByValuationData}
      />
    </>
  );
}; 