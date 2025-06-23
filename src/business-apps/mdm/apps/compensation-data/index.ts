export { CompensationData } from './CompensationData';

// Export types
export type { CompensationDataProps, CompensationDataTabs } from './CompensationData';

// Export all tab components
export { CompensationBandsTab, PayGradesTab, CareerBandsTab } from './components/tabs';

// Export component types
export type { CompensationBand, CompensationBandsTabProps } from './components/tabs/CompensationBandsTab';
export type { PayGrade, JobLevelGroup, JobLevel, PayGradesTabProps } from './components/tabs/PayGradesTab';
export type { CareerBandsTabProps } from './components/tabs/CareerBandsTab';

// Export data integration hooks
export { useCompensationDataIntegration } from './hooks/useCompensationDataIntegration';
export { useJobLevelGroups } from './hooks/useJobLevelGroups';

// Export queries
export { useGetCompensationBandData } from './queries/CompensationBandQueries';
export type { CompensationBandData, GetCompensationBandDataVariables } from './queries/CompensationBandQueries';

// Export enhanced types
export type { 
  EnhancedPayGrade, 
  EnhancedJobLevelGroup, 
  EnhancedJobLevel,
  PayGradeVisualizationData 
} from './hooks/useCompensationDataIntegration';
