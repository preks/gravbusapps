/**
 * Standalone Catalog Select Dependencies
 *
 * Handles catalogs with NO dependencies (no parent, no child, no external filters)
 * Examples: language, contentType
 *
 * Rules:
 * - Initial load: Show prefetched value if exists
 * - User changes: Just update value
 * - NO clears, NO auto-selection, NO filtering
 */

import { useEffect } from 'react'

export interface UseStandaloneDependenciesParams {
  configs: Array<{
    id: string
    parentField?: string
    externalEqualsFilters?: Array<{ externalKey: string; field: string }>
  }>
}

export const useStandaloneDependencies = ({ configs }: UseStandaloneDependenciesParams) => {
  // Standalone fields have no dependency logic
  // This hook exists for completeness and future extensions

  useEffect(() => {
    // No-op for standalone fields
    // They work purely through direct user interaction
  }, [configs])
}

export default useStandaloneDependencies
