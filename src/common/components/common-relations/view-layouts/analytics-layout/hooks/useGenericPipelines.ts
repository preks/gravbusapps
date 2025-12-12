/**
 * Generic pipelines hook
 * Fetches pipeline options from either GraphQL (distinctOn) or Catalog API
 * Used by both CRM and IRM with different data source configurations
 */

import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface Pipeline {
  id: string
  name: string
  value: string
}

export type PipelineSource = 'graphql' | 'catalog'

export interface PipelinesGraphQLConfig {
  source: 'graphql'
  opportunityEntity: string // 'Opportunity' or 'InvestmentOpportunity'
  pipelineField: string // 'salesPipelineRef' or 'opportunityPipelineRef'
  pipelineRelation: string // 'salesPipeline' or 'opportunityPipeline'
}

export interface PipelinesCatalogConfig {
  source: 'catalog'
  catalogIdentifier: string // e.g., 'InvestmentOpportunityPipeline'
  catalogVersion?: string // defaults to 'v1'
}

export type PipelinesConfig = PipelinesGraphQLConfig | PipelinesCatalogConfig

export const useGenericPipelines = (accessToken: string, config: PipelinesConfig) => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  const loadPipelines = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (config.source === 'graphql') {
        // GraphQL source: Use distinctOn to get unique pipelines
        const query = `
          query GetDistinctPipelines {
            ${config.opportunityEntity}(
              where: {
                isDeleted: {_eq: false}
                ${config.pipelineField}: {_isNull: false}
              }
              distinctOn: [${config.pipelineField}]
              limit: 20
            ) {
              ${config.pipelineRelation} {
                id
                value
                code
              }
            }
          }
        `

        const response = await graphqlClient.request<{
          [key: string]: Array<{ [key: string]: { id: string; value?: string; code?: string } | null }>
        }>(query)

        // Extract pipelines from response
        const opportunitiesData = response[config.opportunityEntity]
        if (!opportunitiesData) {
          throw new Error('No pipeline data received from GraphQL')
        }

        const uniquePipelines = opportunitiesData
          .filter(opp => opp[config.pipelineRelation]?.id)
          .map(opp => {
            const pipeline = opp[config.pipelineRelation]!
            return {
              id: pipeline.id,
              name: pipeline.value || pipeline.code || pipeline.id,
              value: pipeline.value || pipeline.code || pipeline.id
            }
          })

        setPipelines(uniquePipelines)
      } else {
        // Catalog source: Fetch from Catalog API
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: config.catalogIdentifier,
            version: config.catalogVersion || 'v1'
          },
          {
            limit: 50,
            offset: 0,
            returnTotalRecords: true,
            localeCode: userLocale
          }
        )

        if (response?.data) {
          const processedPipelines = response.data.map((entry: any) => ({
            id: entry.id,
            name: entry.value || entry.code || entry.id,
            value: entry.value || entry.code || entry.id
          }))

          setPipelines(processedPipelines)
        } else {
          setPipelines([])
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipelines')
      setPipelines([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, config, graphqlClient, catalogClient, userLocale])

  useEffect(() => {
    loadPipelines()
  }, [loadPipelines])

  return {
    pipelines,
    isLoading,
    error,
    refetch: loadPipelines
  }
}
