import CampaignRecord from './CampaignRecord';

// Export main component
export { CampaignRecord };

// Export types
export * from './types';

// Export hooks
export * from './hooks';

// Export queries
export * from './queries';

// Export components (with explicit re-export to avoid conflicts)
export { 
  CampaignHeader,
  CampaignChart,
  CampaignEntitiesTable,
  CampaignEntitiesSection,
  CampaignAnalyticsStatistics,
  CampaignConversionFunnel,
  CampaignRevenueAnalysis,
  CampaignTopPerformers
} from './components';

// Export CampaignKPIs component with alias to avoid conflict with CampaignKPIs interface
export { CampaignKPIs as CampaignKPIsComponent } from './components';

export default CampaignRecord;
