// Make DocumentManagementSetup the default export for the screen
export { default } from './DocumentManagementSetup'

// Continue to export other relevant items for potential internal use or shared functionality
// These will be available as named exports.
export * from '../../../common/types/DocumentTypeObjectTypes'

// Re-export specific types for convenience if they are commonly used
export type { DocumentType, Module, Role } from '../../../common/types/DocumentTypeObjectTypes'
