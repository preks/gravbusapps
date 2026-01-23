// Layout components (config-driven)
export { OpportunitySettingsLayout } from './opportunity'
export type { OpportunitySettingsConfig, OpportunitySettingsLayoutProps } from './opportunity'

export { AccountSettingsLayout } from './account'
export type { AccountSettingsConfig, AccountSettingsLayoutProps } from './account'

export { LeadSettingsLayout } from './lead'
export type { LeadSettingsConfig, LeadSettingsLayoutProps } from './lead'

export { EngagementSettingsLayout } from './engagement'
export type { EngagementSettingsConfig, EngagementSettingsLayoutProps } from './engagement'

export { DocumentSettingsLayout } from './document'
export type { DocumentSettingsConfig, DocumentSettingsLayoutProps } from './document'

// Shared components
export { CatalogTab } from './components/CatalogTab'

// Shared types
export * from './types/catalogTypes'

// Still-used standalone components
export { PipelineSettings } from './pipelines/PipelineSettings'
export { TaskTemplateSettings } from './task-template/TaskTemplateSettings'
export * from './task-template/types'
export * from './folder-templates'
