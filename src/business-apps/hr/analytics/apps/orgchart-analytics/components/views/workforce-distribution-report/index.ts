export { default } from './WorkforceDistributionReport';
export { default as WorkforceDistributionReport } from './WorkforceDistributionReport';

// Export components
export { default as DistributionPieChart } from './components/DistributionPieChart';
export { default as DistributionBarChart } from './components/DistributionBarChart';
export { default as WorkforceStatisticsDashboard } from './components/WorkforceStatisticsDashboard';

// Export hooks
export { useWorkforceDataIntegration } from './hooks/useWorkforceDataIntegration';
export { useGetWorkforceData } from './queries/WorkforceQueries';

// Export types
export type {
  WorkforceEmployee,
  WorkforceDistribution,
  WorkforceStatistics,
  WorkforceTableData,
  GeographicDistribution,
  OrganizationalDistribution,
  DemographicDistribution,
  EmploymentDistribution,
  DistributionSegment,
  ChartData,
  TreemapData,
  UseWorkforceDistributionResponse
} from './types/workforceTypes';

// Export utility functions
export {
  processWorkforceDistribution,
  calculateWorkforceStatistics,
  generateWorkforceTableData,
  convertToChartData,
  convertToTreemapData,
  chartColors
} from './utils/workforceUtils'; 