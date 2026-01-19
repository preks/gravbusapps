import { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { StageConditionPopupValues } from '../types'

interface UseStageConditionDataProps {
  businessAppContext: BusinessAppContextProps
}

interface StageConditionQueryResult {
  id: string
  completed: boolean
  version: number
  salesPipelineStageCondition?: {
    id: string
    value: string
    code: string
  }
  configSnapshot?: any
}

interface UseStageConditionDataReturn {
  stageConditionData: StageConditionQueryResult | null
  isLoading: boolean
  error: string | null
  mapStageConditionToFormValues: (condition: StageConditionQueryResult) => Partial<StageConditionPopupValues>
}

export const useStageConditionData = ({
  businessAppContext
}: UseStageConditionDataProps): UseStageConditionDataReturn => {
  const [stageConditionData, setStageConditionData] = useState<StageConditionQueryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(businessAppContext.accessToken)

  // Function to map stage condition data to form values
  const mapStageConditionToFormValues = useCallback(
    (condition: StageConditionQueryResult): Partial<StageConditionPopupValues> => {
      return {
        id: condition.id,
        version: condition.version,
        completed: condition.completed || false,
        conditionTitle: condition.salesPipelineStageCondition?.value || 'Unknown Condition',
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

  // Load stage condition data when stageConditionStatusId is provided in additionalData
  useEffect(() => {
    const loadStageConditionData = async () => {
      if (!stageConditionStatusId || !businessAppContext.accessToken) {
        setError('No stage condition status ID provided in process payload')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetStageConditionStatus($id: uuid!) {
            OpportunityStageConditionStatusByPk(id: $id) {
              id
              completed
              version
              salesPipelineStageCondition {
                id
                value
                code
              }
              configSnapshot
            }
          }
        `

        const response = await graphqlClient.request(query, {
          id: stageConditionStatusId
        })

        if (response?.OpportunityStageConditionStatusByPk) {
          const conditionData = response.OpportunityStageConditionStatusByPk
          setStageConditionData(conditionData)
        } else {
          setError('Stage condition not found')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load stage condition data'
        setError(errorMessage)
        console.error('❌ useStageConditionData - Error loading data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadStageConditionData()
  }, [stageConditionStatusId, businessAppContext.accessToken])

  return {
    stageConditionData,
    isLoading,
    error,
    mapStageConditionToFormValues
  }
}
