import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

const buildStageKey = (stage: any): string =>
  [stage?.id ?? '', stage?.code ?? '', stage?.value ?? '', stage?.alternativeCode ?? ''].join(':')

const areStagesEqual = (left: any[], right: any[]): boolean =>
  left.length === right.length && left.every((stage, index) => buildStageKey(stage) === buildStageKey(right[index]))

const buildConditionKey = (condition: any): string =>
  [
    condition?.id ?? '',
    condition?.code ?? '',
    condition?.value ?? '',
    condition?.parentEntryId ?? '',
    condition?.additionalValue1 ?? '',
    condition?.type ?? ''
  ].join(':')

const areConditionsEqual = (left: any[], right: any[]): boolean =>
  left.length === right.length &&
  left.every((condition, index) => buildConditionKey(condition) === buildConditionKey(right[index]))

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
  const hasLoadedStagesRef = useRef(false)

  const childEntries = (opportunityData?.opportunityPipeline as any)?.childEntries as any[] | undefined
  const latestChildEntriesRef = useRef<any[] | undefined>(childEntries)
  latestChildEntriesRef.current = childEntries

  const pipelineStagesKey = useMemo(() => {
    if (!childEntries?.length) {
      return ''
    }

    return [...childEntries]
      .sort((a: any, b: any) => (a?.displayOrder ?? 0) - (b?.displayOrder ?? 0))
      .map(buildStageKey)
      .join('|')
  }, [childEntries])

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
        const nextConditions = result.conditions || []
        setCatalogStageConditions(previous =>
          areConditionsEqual(previous, nextConditions) ? previous : nextConditions
        )
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
  const fetchOpportunityStages = useCallback(
    async (entriesOverride?: any[]) => {
      try {
        if (!hasLoadedStagesRef.current) {
          setLoadingStages(true)
        }
        setStagesError(null)

        const entries = entriesOverride ?? latestChildEntriesRef.current

        if (entries?.length) {
          // Sort by displayOrder
          const sorted = [...(entries as any[])].sort(
            (a: any, b: any) => (a?.displayOrder ?? 0) - (b?.displayOrder ?? 0)
          )

          // Map to stage format
          const stageData = sorted.map((entry: any) => ({
            id: entry.id,
            code: entry.code,
            value: entry.value,
            alternativeCode: entry.alternativeCode
          }))

          setOpportunityStages(previous => (areStagesEqual(previous, stageData) ? previous : stageData))

          // Fetch catalog conditions for all stages
          await fetchCatalogConditions(stageData.map(s => s.id))
        } else {
          setOpportunityStages(previous => (previous.length === 0 ? previous : []))
          setCatalogStageConditions(previous => (previous.length === 0 ? previous : []))
        }
      } catch (err) {
        console.error(`Error mapping ${contextLabel} opportunity pipeline stages:`, err)
        setStagesError(err instanceof Error ? err.message : 'Failed to fetch stages')
        setOpportunityStages([])
        setCatalogStageConditions([])
      } finally {
        hasLoadedStagesRef.current = true
        setLoadingStages(false)
      }
    },
    [fetchCatalogConditions, contextLabel]
  )

  useEffect(() => {
    hasLoadedStagesRef.current = false
  }, [stageConditionCatalog, accessToken])

  // Auto-fetch only when pipeline stage definitions change, not on every opportunity refetch.
  useEffect(() => {
    if (opportunityData) {
      fetchOpportunityStages()
    }
  }, [Boolean(opportunityData), pipelineStagesKey, fetchOpportunityStages])

  return {
    opportunityStages,
    catalogStageConditions,
    loadingStages,
    stagesError,
    fetchOpportunityStages
  }
}
