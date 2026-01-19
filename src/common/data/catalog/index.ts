/**
 * Catalog Data Infrastructure - Main Export File
 * Central GraphQL-based catalog data access for the platform
 */

// Types
export * from './types/catalogTypes'

// Mappers
export { toCatalog, toCatalogEntry, toTranslationsArray, prepareCatalogEntryForApi } from './mappers/catalogMappers'

// Hooks
export { default as useCatalogs } from './hooks/useCatalogs'
export { default as useCatalog } from './hooks/useCatalog'
export { default as useCatalogEntries } from './hooks/useCatalogEntries'
export { useCatalogEntry } from './hooks/useCatalogEntry'
export { default as useImportCatalogEntries } from './hooks/useImportCatalogEntries'
export { default as useExportCatalogs } from './hooks/useExportCatalogs'
// Mutations (Catalog Management via REST client)
export { default as useCreateCatalog } from './hooks/useCreateCatalog'
export { default as useUpdateCatalog } from './hooks/useUpdateCatalog'
export { default as useDeleteCatalog } from './hooks/useDeleteCatalog'
export { default as useCreateCatalogEntry } from './hooks/useCreateCatalogEntry'
export { default as useUpdateCatalogEntry } from './hooks/useUpdateCatalogEntry'
export { default as useDeleteCatalogEntry } from './hooks/useDeleteCatalogEntry'

// Utils - Translation utilities
export * from './utils'
