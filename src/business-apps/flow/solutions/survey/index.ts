export { default } from './SurveySolution.tsx'
export { default as SurveySolution } from './SurveySolution.tsx'

// Export components
export { DashboardTab } from './components/DashboardTab'
export { SurveyTemplatesTab } from './components/SurveyTemplatesTab'
export { SurveyDataTab } from './components/SurveyDataTab'
export { AnalyticsTab } from './components/AnalyticsTab'
export { AuditTab } from './components/AuditTab'

// Export services
export { SurveyFlowService } from './services/SurveyFlowService'
export { SurveyDataService } from './services/SurveyDataService'

// Export hooks
export { useSurveyData } from './hooks/useSurveyData'
export { useSurveyAuditLogs } from './hooks/useSurveyAuditData'

// Export types
export type { SurveyFlowData } from './services/SurveyFlowService'
export type { SurveyFlow, StepSegment, SurveyFlowsResponse } from './services/SurveyDataService'
export type { SurveyDataHookResult } from './hooks/useSurveyData'
