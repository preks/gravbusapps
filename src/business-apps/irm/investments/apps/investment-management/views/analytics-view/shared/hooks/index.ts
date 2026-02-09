/**
 * @module shared/hooks
 * @description Shared hooks for analytics view components.
 * These hooks provide reusable state management and data fetching patterns
 * across all analytics tabs (overview, equity, liquid fund, real estate).
 */

// Currency synchronization hooks
export { useCurrencySync, useMultipleCurrencySync } from './useCurrencySync'

// KPI integration hooks
export { useKPIIntegration, useSimpleKPIIntegration } from './useKPIIntegration'
export type { KPIIntegrationResult, KPIFetcher } from './useKPIIntegration'
export { useGenericGroupKPIIntegration } from '@/common/data/investment/hooks/useGenericGroupKPIIntegration'
export type {
  GenericGroupKPIIntegration,
  GenericKPIData
} from '@/common/data/investment/hooks/useGenericGroupKPIIntegration'
