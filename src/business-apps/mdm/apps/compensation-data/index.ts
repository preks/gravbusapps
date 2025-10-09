export { CompensationData } from './CompensationData'
export { CompensationData as default } from './CompensationData'

// Export types
export type { CompensationDataProps, CompensationDataTabs } from './CompensationData'

// Export all tab components
export { CompensationBandsTab, PayGradesTab, CareerBandsTab } from './components/tabs'

// Export component types
export type { CompensationBandsTabProps } from './components/tabs/CompensationBandsTab'
export type { PayGradesTabProps } from './components/tabs/PayGradesTab'
export type { CareerBandsTabProps } from './components/tabs/CareerBandsTab'

// Export types from types folder
export type {
  CompensationBand,
  PayGrade,
  JobLevelGroup,
  JobLevel,
  PayGradeVisualizationData,
  JobLevelGroupData,
  PayGradeVisualization,
  JobLevelGroupVisualization,
  JobLevelVisualization
} from './types'

// Export data integration hooks
export { useCompensationDataIntegration } from './hooks/useCompensationDataIntegration'
export { useJobLevelGroups } from './hooks/useJobLevelGroups'

// Export queries
export { useGetCompensationBandData } from './queries/CompensationBandQueries'
export type { CompensationBandData, GetCompensationBandDataVariables } from './queries/CompensationBandQueries'
