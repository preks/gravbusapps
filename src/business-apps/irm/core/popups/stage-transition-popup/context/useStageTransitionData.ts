import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { OpportunityQueryResult, SalesPipelineStageResult, StageTransitionPopupValues } from '../types'
import { GET_INVESTMENT_OPPORTUNITY_BY_ID } from '@/common/data/investment/queries/investmentOpportunityQueries'

export interface UseStageTransitionDataReturn {
  opportunityData: OpportunityQueryResult | null
  targetStageData: SalesPipelineStageResult | null
  currentStageConditions: { id: string; value: string }[]
  incompleteConditionIds: string[]
  isLoading: boolean
  error: string | null
  mapToFormValues: (
    opportunity: OpportunityQueryResult,
    targetStage: SalesPipelineStageResult
  ) => Partial<StageTransitionPopupValues>
}

export const useStageTransitionData = (businessAppContext: BusinessAppContextProps): UseStageTransitionDataReturn => {
  const [opportunityData, setOpportunityData] = useState<OpportunityQueryResult | null>(null)
  const [targetStageData, setTargetStageData] = useState<SalesPipelineStageResult | null>(null)
  const [currentStageConditions, setCurrentStageConditions] = useState<{ id: string; value: string }[]>([])
  const [incompleteConditionIds, setIncompleteConditionIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(businessAppContext.accessToken)
  const catalogClient = useCatalogManagerClient(businessAppContext.accessToken)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  const mapToFormValues = useCallback(
    (
      opportunity: OpportunityQueryResult,
      targetStage: SalesPipelineStageResult
    ): Partial<StageTransitionPopupValues> => {
      return {
        opportunityId: opportunity.id,
        opportunityName: opportunity.name,
        sourceStageRef: opportunity.salesPipelineStageRef,
        sourceStage: opportunity.salesPipelineStage,
        targetStageRef: targetStage.id,
        targetStage: {
          id: targetStage.id,
          value: targetStage.value,
          code: targetStage.code
        }
      }
    },
    []
  )

  const opportunityId = useMemo(() => {
    return (
      businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId ||
      businessAppContext.additionalData?.opportunityId ||
      businessAppContext.additionalData?.id
    )
  }, [
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId,
    businessAppContext.additionalData?.opportunityId,
    businessAppContext.additionalData?.id
  ])

  const targetStageRef = useMemo(() => {
    return (
      businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.targetStageRef ||
      businessAppContext.additionalData?.targetStageRef
    )
  }, [
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.targetStageRef,
    businessAppContext.additionalData?.targetStageRef
  ])

  useEffect(() => {
    const loadData = async () => {
      if (!opportunityId || !targetStageRef) {
        setError('Missing required data: opportunityId or targetStageRef')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // 1) Load opportunity via central query (includes embedded stage conditions)
        const oppQuery = GET_INVESTMENT_OPPORTUNITY_BY_ID(opportunityId)
        const oppResp = await graphqlClient.request<{
          InvestmentOpportunity: Array<{
            id: string
            name: string
            opportunityPipelineStage?: { id: string; value: string; code: string }
            opportunityPipeline?: { childEntries?: Array<{ id: string; value: string; code: string }> }
            investmentOpportunityStageCondition?: Array<{
              id: string
              completed: boolean
              opportunityPipelineStageCondition?: {
                id: string
                value: string
                parentEntryId?: string
              }
            }>
          }>
        }>(oppQuery)
        const opp = oppResp?.InvestmentOpportunity?.[0]
        if (!opp) {
          throw new Error('Opportunity not found')
        }

        setOpportunityData({
          id: opp.id,
          name: opp.name,
          salesPipelineStageRef: opp.opportunityPipelineStage?.id,
          salesPipelineStage: opp.opportunityPipelineStage
        })

        // 2) Pipeline stages are available in opp.opportunityPipeline?.childEntries if needed

        // 3) Process embedded stage conditions (same logic as CRM)
        const conditions = opp.investmentOpportunityStageCondition || []
        const currentStageRef = opp.opportunityPipelineStage?.id
        const currentStageConds = conditions.filter(
          c => c?.opportunityPipelineStageCondition?.parentEntryId === currentStageRef
        )
        const mapped = currentStageConds.map(c => ({
          id: c.opportunityPipelineStageCondition?.id || '',
          value: c.opportunityPipelineStageCondition?.value || ''
        }))
        const incomplete = currentStageConds
          .filter(c => !c.completed)
          .map(c => c.opportunityPipelineStageCondition?.id)
          .filter(Boolean) as string[]
        setCurrentStageConditions(mapped)
        setIncompleteConditionIds(incomplete)

        // 4) Load target stage from catalog
        const targetStageResponse = await catalogClient.getCatalogEntryById(targetStageRef, {
          params: {
            includeTranslations: true,
            localeCode: userLocale
          }
        })
        setTargetStageData(targetStageResponse as any)
      } catch (err: any) {
        console.error('Error loading stage transition data:', err)
        setError(err?.message || 'Failed to load transition data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [opportunityId, targetStageRef, businessAppContext.accessToken, graphqlClient, catalogClient, userLocale])

  return {
    opportunityData,
    targetStageData,
    currentStageConditions,
    incompleteConditionIds,
    isLoading,
    error,
    mapToFormValues
  }
}
