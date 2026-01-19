import { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_INVESTMENT_OPPORTUNITY_STAGE_CONDITION_BY_ID } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { StageConditionPopupValues } from '../types'

interface UseInvestmentStageConditionDataProps {
  businessAppContext: BusinessAppContextProps
}

interface InvestmentStageConditionQueryResult {
  id: string
  completed: boolean
  completedAt?: string | null
  deadlineAt?: string | null
  version: number
  opportunityPipelineStageCondition?: {
    id: string
    value: string
    code: string
    parentEntryId?: string
  }
  configSnapshot?: any
}

interface UseInvestmentStageConditionDataReturn {
  stageConditionData: InvestmentStageConditionQueryResult | null
  isLoading: boolean
  error: string | null
  mapStageConditionToFormValues: (condition: InvestmentStageConditionQueryResult) => Partial<StageConditionPopupValues>
}

export const useInvestmentStageConditionData = ({
  businessAppContext
}: UseInvestmentStageConditionDataProps): UseInvestmentStageConditionDataReturn => {
  const [stageConditionData, setStageConditionData] = useState<InvestmentStageConditionQueryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(businessAppContext.accessToken)

  // Function to map stage condition data to form values
  const mapStageConditionToFormValues = useCallback(
    (condition: InvestmentStageConditionQueryResult): Partial<StageConditionPopupValues> => {
      return {
        id: condition.id,
        version: condition.version,
        completed: !!condition.completed,
        conditionTitle: condition.opportunityPipelineStageCondition?.value || 'Unknown Condition',
        currentStatus: condition.completed ? 'Completed' : 'Pending'
      }
    },
    []
  )

  // Memoize the stage condition status ID to prevent unnecessary re-renders
  const stageConditionStatusId = useMemo(() => {
    return (
      businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.stageConditionStatusId ||
      businessAppContext.additionalData?.stageConditionStatusId ||
      businessAppContext.additionalData?.id
    )
  }, [
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.stageConditionStatusId,
    businessAppContext.additionalData?.stageConditionStatusId,
    businessAppContext.additionalData?.id
  ])

  useEffect(() => {
    const load = async () => {
      if (!stageConditionStatusId || !businessAppContext.accessToken) {
        setError('No stage condition status ID provided in process payload')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const query = GET_INVESTMENT_OPPORTUNITY_STAGE_CONDITION_BY_ID(stageConditionStatusId)
        const response = await graphqlClient.request<{
          InvestmentOpportunityStageConditionByPk: InvestmentStageConditionQueryResult
        }>(query)
        const item = response?.InvestmentOpportunityStageConditionByPk
        if (item) {
          setStageConditionData(item)
        } else {
          setError('Stage condition not found')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load stage condition data'
        setError(errorMessage)
        console.error('❌ useInvestmentStageConditionData - Error loading data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [stageConditionStatusId, businessAppContext.accessToken, graphqlClient])

  return { stageConditionData, isLoading, error, mapStageConditionToFormValues }
}
