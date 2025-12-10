/**
 * useDataSource Hook - Re-export from shared location
 *
 * This file re-exports the shared useDataSource hook for backward compatibility.
 * The actual implementation is in src/business-apps/ser/hooks/useDataSource.ts
 */

export { useDataSource, type DataSourceOption, type UseDataSourceResult } from '../../../hooks/useDataSource'
export { default } from '../../../hooks/useDataSource'
