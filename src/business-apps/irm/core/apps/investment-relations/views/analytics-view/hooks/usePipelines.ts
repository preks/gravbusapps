// IRM-specific wrapper for shared generic pipelines hook
import { useMemo } from 'react'
import {
  useGenericPipelines,
  type Pipeline
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericPipelines'

export type { Pipeline }

/**
 * IRM Pipelines hook - Uses Catalog API to fetch pipeline options
 * IRM uses the Catalog Manager for pipeline data
 */
export const usePipelines = (accessToken: string) => {
  const config = useMemo(
    () => ({
      source: 'catalog' as const,
      catalogIdentifier: 'InvestmentOpportunityPipeline',
      catalogVersion: 'v1'
    }),
    []
  )

  return useGenericPipelines(accessToken, config)
}
