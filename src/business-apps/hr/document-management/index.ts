// Make DocumentManagementSetup the default export for the screen
export { default } from './DocumentManagementSetup';

// Continue to export other relevant items for potential internal use or shared functionality
// These will be available as named exports.
export * from './types';
export * from '../hooks/useDocumentTypes'; // Assuming useDocumentTypes might be used by other components too

// Explicitly re-export DocumentTypes if it's a separate, co-located component that needs to be accessible.
// If DocumentTypes.ts is an old file or not relevant to this screen, this line could be removed later.
export { default as DocumentTypes } from './DocumentTypes';

// Re-export specific types for convenience if they are commonly used
export type { DocumentType, Module, Role, RolePermission } from './types';
