import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getStageParentEntryId, SourceApp } from '../utils/catalogConfig'

export interface StageConditionEntry {
  id: string
  value: string
  objectValue: any
  code: string
  alternativeCode: string
  additionalValue1: string
  additionalValue2: string
  additionalValue3: string
}

export interface StageConditionsResponse {
  CatalogEntry: StageConditionEntry[]
}

export interface StageConditionsCountVariables {
  parentEntryId: string
}

export const GET_STAGE_CONDITIONS_COUNT = (variables: StageConditionsCountVariables): string => {
  return `
    query GetStageConditionsCount {
      CatalogEntry(
        where: {parentEntryId: {_eq: "${variables.parentEntryId}"}}
        orderBy: {additionalValue1: ASC}
      ) {
        id
        value
        objectValue
        code
        alternativeCode
        additionalValue1
        additionalValue2
        additionalValue3
      }
    }
  `
}

export const useStageConditions = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchStageConditionsCount = async (stageCode: string, sourceApp: SourceApp = 'CRM'): Promise<number> => {
    if (!stageCode) return 0

    try {
      const parentEntryId = getStageParentEntryId(sourceApp, stageCode)
      const query = GET_STAGE_CONDITIONS_COUNT({ parentEntryId })

      const result = await graphqlClient.request<StageConditionsResponse>(query)
      return result.CatalogEntry.length
    } catch (error) {
      console.error('Error fetching stage conditions count:', error)
      return 0
    }
  }

  const fetchStageConditions = async (
    stageCode: string,
    sourceApp: SourceApp = 'CRM'
  ): Promise<StageConditionEntry[]> => {
    if (!stageCode) return []

    try {
      const parentEntryId = getStageParentEntryId(sourceApp, stageCode)
      const query = GET_STAGE_CONDITIONS_COUNT({ parentEntryId })

      const result = await graphqlClient.request<StageConditionsResponse>(query)
      return result.CatalogEntry
    } catch (error) {
      console.error('Error fetching stage conditions:', error)
      return []
    }
  }

  return {
    fetchStageConditionsCount,
    fetchStageConditions
  }
}
