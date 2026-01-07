/**
 * Service Portal Components
 */

export { ServiceCatalog } from './ServiceCatalog'
export { ServiceDetail } from './ServiceDetail'
export { RequestForm } from './RequestForm'
export { MyRequests } from './MyRequests'
export { EnhancedServiceCatalog } from './EnhancedServiceCatalog'
export { EmployeeOnboardingForm } from './EmployeeOnboardingForm'
export { RequestComments } from './RequestComments'
export { AIOnboardingTooltip } from './AIOnboardingTooltip'
export { FlowSummary } from './FlowSummary'
export { FlowSummaryErrorBoundary } from './FlowSummaryErrorBoundary'

// Data source select components for dynamic form fields
export { DataSourceSelect } from './DataSourceSelect'
export { DataSourceMultiSelect } from './DataSourceMultiSelect'

// Dynamic form components (moved to shared components)
export { DynamicFormGenerator } from '../../../components/DynamicFormGenerator'
export { FlowTemplateCard } from './FlowTemplateCard'
export { FlowTemplatesDetail } from './FlowTemplatesDetail'

export type { ServiceCatalogProps } from './ServiceCatalog'
export type { ServiceDetailProps } from './ServiceDetail'
export type { RequestFormProps } from './RequestForm'
export type { MyRequestsProps } from './MyRequests'
export type { RequestCommentsProps } from './RequestComments'
export type { FlowSummaryProps } from './FlowSummary'
export type { DataSourceSelectProps } from './DataSourceSelect'
export type { DataSourceMultiSelectProps } from './DataSourceMultiSelect'

// Dynamic form types (moved to shared components)
export type { DynamicFormGeneratorProps } from '../../../components/DynamicFormGenerator'
export type { FlowTemplateCardProps } from './FlowTemplateCard'
export type { FlowTemplatesDetailProps } from './FlowTemplatesDetail'
