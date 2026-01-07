import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface UseOpportunityPipelineStagesOptions {
  /**
   * The catalog identifier for stage conditions
   * e.g., "SalesPipelineStageCondition" or "InvestmentOpportunityPipelineStageCondition"
   */
  stageConditionCatalog: string

  /**
   * Access token for GraphQL requests
   */
  accessToken?: string

  /**
   * The opportunity data containing pipeline information with childEntries
   */
  opportunityData?: {
    opportunityPipeline?: {
      childEntries?: any[]
    }
  }

  /**
   * Optional context label for error messages (e.g., "customer" or "investment")
   */
  contextLabel?: string
}

export interface UseOpportunityPipelineStagesReturn {
  /**
   * Array of opportunity stages sorted by display order
   */
  opportunityStages: any[]

  /**
   * Array of catalog conditions for all stages
   */
  catalogStageConditions: any[]

  /**
   * Loading state for stages fetching
   */
  loadingStages: boolean

  /**
   * Error message if stages fetching failed
   */
  stagesError: string | null

  /**
   * Manual refetch function
   */
  fetchOpportunityStages: () => Promise<void>
}

/**
 * Shared hook for fetching opportunity pipeline stages and their catalog conditions
 *
 * This hook efficiently extracts stages from the opportunity's pipeline childEntries
 * (which are already loaded) and fetches only the catalog conditions via GraphQL.
 *
 * Used by both CRM and IRM opportunity records to display stage progression with tooltips.
 *
 * @example
 * // CRM Usage
 * const { opportunityStages, catalogStageConditions, loadingStages } =
 *   useOpportunityPipelineStages({
 *     opportunityData,
 *     stageConditionCatalog: 'SalesPipelineStageCondition',
 *     accessToken: props.accessToken,
 *     contextLabel: 'customer'
 *   })
 *
 * @example
 * // IRM Usage
 * const { opportunityStages, catalogStageConditions, loadingStages } =
 *   useOpportunityPipelineStages({
 *     opportunityData,
 *     stageConditionCatalog: 'InvestmentOpportunityPipelineStageCondition',
 *     accessToken: props.accessToken,
 *     contextLabel: 'investment'
 *   })
 */
export const useOpportunityPipelineStages = ({
  stageConditionCatalog,
  accessToken,
  opportunityData,
  contextLabel = 'opportunity'
}: UseOpportunityPipelineStagesOptions): UseOpportunityPipelineStagesReturn => {
  const graphQLClient = useGraphQLClient(accessToken)

  const [opportunityStages, setOpportunityStages] = useState<any[]>([])
  const [catalogStageConditions, setCatalogStageConditions] = useState<any[]>([])
  const [loadingStages, setLoadingStages] = useState(false)
  const [stagesError, setStagesError] = useState<string | null>(null)

  /**
   * Fetches catalog conditions for given stage IDs
   */
  const fetchCatalogConditions = useCallback(
    async (stageIds: string[]) => {
      if (!stageIds.length || !accessToken) {
        setCatalogStageConditions([])
        return
      }

      try {
        const GET_STAGE_CONDITIONS = `
        query GetStageConditions($stageIds: [String!]!) {
          conditions: CatalogEntry(
            where: {
              catalog: { identifier: { _eq: "${stageConditionCatalog}" } }
              parentEntryId: { _in: $stageIds }
              isDeleted: { _eq: false }
            }
            orderBy: { additionalValue1: ASC }
          ) {
            id
            code
            value
            parentEntryId
            additionalValue1
            objectValue
            type
          }
        }
      `

        const result = await graphQLClient.request<{ conditions: any[] }>(GET_STAGE_CONDITIONS, { stageIds })
        setCatalogStageConditions(result.conditions || [])
      } catch (err) {
        console.error('Error fetching catalog stage conditions:', err)
        setCatalogStageConditions([])
      }
    },
    [accessToken, graphQLClient, stageConditionCatalog]
  )

  /**
   * Extracts stages from opportunity pipeline childEntries and fetches their conditions
   */
  const fetchOpportunityStages = useCallback(async () => {
    try {
      setLoadingStages(true)
      setStagesError(null)

      const childEntries = (opportunityData?.opportunityPipeline as any)?.childEntries

      if (childEntries?.length) {
        // Sort by displayOrder
        const sorted = [...(childEntries as any[])].sort(
          (a: any, b: any) => (a?.displayOrder ?? 0) - (b?.displayOrder ?? 0)
        )

        // Map to stage format
        const stageData = sorted.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value,
          alternativeCode: entry.alternativeCode
        }))

        setOpportunityStages(stageData)

        // Fetch catalog conditions for all stages
        await fetchCatalogConditions(stageData.map(s => s.id))
      } else {
        setOpportunityStages([])
        setCatalogStageConditions([])
      }
    } catch (err) {
      console.error(`Error mapping ${contextLabel} opportunity pipeline stages:`, err)
      setStagesError(err instanceof Error ? err.message : 'Failed to fetch stages')
      setOpportunityStages([])
      setCatalogStageConditions([])
    } finally {
      setLoadingStages(false)
    }
  }, [opportunityData?.opportunityPipeline, fetchCatalogConditions, contextLabel])

  // Auto-fetch when opportunity data changes
  useEffect(() => {
    if (opportunityData) {
      fetchOpportunityStages()
    }
  }, [opportunityData, fetchOpportunityStages])

  return {
    opportunityStages,
    catalogStageConditions,
    loadingStages,
    stagesError,
    fetchOpportunityStages
  }
}
