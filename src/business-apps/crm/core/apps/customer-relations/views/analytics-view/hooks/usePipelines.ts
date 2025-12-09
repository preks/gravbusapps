// CRM-specific wrapper for shared generic pipelines hook
import { useMemo } from 'react'
import {
  useGenericPipelines,
  type Pipeline
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericPipelines'

/**
 * CRM Pipelines hook - Uses GraphQL distinctOn to fetch unique pipelines
 * This is more efficient than fetching from Catalog API
 */
const usePipelines = (accessToken: string) => {
  const config = useMemo(
    () => ({
      source: 'graphql' as const,
      opportunityEntity: 'Opportunity',
      pipelineField: 'salesPipelineRef',
      pipelineRelation: 'salesPipeline'
    }),
    []
  )

  return useGenericPipelines(accessToken, config)
}

export { usePipelines, type Pipeline }
