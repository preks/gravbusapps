// Component exports will be added as components are implemented
// This file serves as the central export point for all dashboard components

export { default as MetricsCards } from './MetricsCards';
export { default as EquityMetricsCards } from './EquityMetricsCards';
export { default as RealEstateMetricsCards } from './RealEstateMetricsCards';
export { default as PrivateEquityMetricsCards } from './PrivateEquityMetricsCards';
export { default as LiquidFundsMetricsCards } from './LiquidFundsMetricsCards';
export { default as AnalyticsCharts } from './AnalyticsCharts';
export { default as AnalyticsMetrics } from './AnalyticsMetrics';
export { default as AnalyticsInsights } from './AnalyticsInsights';

// Phase 3 components (to be implemented)
// export { default as InvestmentTypeOverview } from './InvestmentTypeOverview';
// export { default as InvestmentCard } from './InvestmentCard';

// Phase 4 components (to be implemented)  
// export { default as InvestmentsList } from './InvestmentsList';
// export { default as InvestmentFilters } from './InvestmentFilters';
// export { default as InvestmentMetrics } from './InvestmentMetrics';

// New refactored components
export { default as DashboardHeader } from './DashboardHeader';
export { default as DashboardNavigation } from './DashboardNavigation';
export { default as InvestmentTypesTab } from './InvestmentTypesTab';
export { default as AllInvestmentsTab } from './AllInvestmentsTab';
export { default as AnalyticsTab } from './AnalyticsTab';
export { default as EquityTable } from './EquityTable';
export { default as RealEstateTable } from './RealEstateTable';
export { default as PrivateEquityTable } from './PrivateEquityTable';
export { default as LiquidFundsTable } from './LiquidFundsTable';