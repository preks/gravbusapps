import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

// Context-agnostic interfaces
export interface PipelineEntry {
  id: string
  code: string
  value: string
  description: string
  stageCount: number
  conditionCount: number
  objectValue?: Record<string, any>
}

export interface PipelineStageEntry {
  id: string
  parentEntryId: string
  code: string
  value: string
  displayOrder?: number
  alternativeCode?: string
  type?: string
  additionalValue1?: string
  additionalValue2?: string | null
  additionalValue3?: string | null
  activeFrom?: string | null
  activeTo?: string | null
  description?: string | null
  objectValue?: Record<string, any>
}

export interface PipelineSettingsData {
  pipelines: PipelineEntry[]
  stages: PipelineStageEntry[]
  isLoading: boolean
  error: string | null
}

interface UsePipelineSettingsProps {
  pipelineCatalog: string
  stageCatalog: string
  conditionCatalog?: string
  version?: string
  autoFetch?: boolean
}

export const usePipelineSettings = (
  context: BusinessAppContextProps,
  catalogConfig: UsePipelineSettingsProps
): PipelineSettingsData & { refetch: () => Promise<void> } => {
  const [data, setData] = useState<PipelineSettingsData>({
    pipelines: [],
    stages: [],
    isLoading: false,
    error: null
  })

  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchData = useCallback(async () => {
    if (!context.accessToken) {
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'No access token available'
      }))
      return
    }

    setData(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Fetch pipelines, stages, and conditions in parallel
      const [pipelinesResult, stagesResult, conditionsResult] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: catalogConfig.pipelineCatalog,
            version: catalogConfig.version || 'v1'
          },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: false
          }
        ),
        catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: catalogConfig.stageCatalog,
            version: catalogConfig.version || 'v1'
          },
          {
            limit: 1000,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true
          }
        ),
        // Fetch conditions if conditionCatalog is provided
        catalogConfig.conditionCatalog
          ? catalogClient.getCatalogEntriesList(
              {
                catalogIdentifier: catalogConfig.conditionCatalog,
                version: catalogConfig.version || 'v1'
              },
              {
                limit: 1000,
                offset: 0,
                returnTotalRecords: true,
                includeChildCatalogEntries: true
              }
            )
          : Promise.resolve({ data: [] })
      ])

      // Create stage count map
      const stageCountMap = new Map<string, number>()
      stagesResult.data.forEach(stage => {
        const parentId = stage.parentEntryId
        if (parentId) {
          stageCountMap.set(parentId, (stageCountMap.get(parentId) || 0) + 1)
        }
      })

      // Create condition count map (count conditions per pipeline via stages)
      const conditionCountMap = new Map<string, number>()
      if (catalogConfig.conditionCatalog) {
        conditionsResult.data.forEach(condition => {
          const stageId = condition.parentEntryId
          if (stageId) {
            // Find which pipeline this stage belongs to
            const stage = stagesResult.data.find(s => s.id === stageId)
            if (stage?.parentEntryId) {
              conditionCountMap.set(stage.parentEntryId, (conditionCountMap.get(stage.parentEntryId) || 0) + 1)
            }
          }
        })
      }

      // Transform pipelines
      const transformedPipelines: PipelineEntry[] = pipelinesResult.data
        .filter(entry => entry.id && entry.value)
        .map(entry => ({
          id: entry.id,
          code: entry.code || '',
          value: entry.value,
          description: entry.additionalValue1 || '',
          stageCount: stageCountMap.get(entry.id) || 0,
          conditionCount: conditionCountMap.get(entry.id) || 0,
          objectValue: entry.objectValue as Record<string, any>
        }))
        .sort((a, b) => a.value.localeCompare(b.value))

      // Transform stages
      const transformedStages: PipelineStageEntry[] = stagesResult.data
        .filter(entry => entry.id && entry.value)
        .map(entry => ({
          id: entry.id,
          parentEntryId: entry.parentEntryId || '',
          code: entry.code || '',
          value: entry.value,
          displayOrder: entry.displayOrder || 0,
          alternativeCode: entry.alternativeCode || '',
          type: entry.type || entry.alternativeCode || '',
          additionalValue1: entry.additionalValue1 || '',
          additionalValue2: entry.additionalValue2 || null,
          additionalValue3: entry.additionalValue3 || null,
          activeFrom: entry.activeFrom || null,
          activeTo: entry.activeTo || null,
          description: entry.description || null,
          objectValue: entry.objectValue as Record<string, any>
        }))
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))

      setData({
        pipelines: transformedPipelines,
        stages: transformedStages,
        isLoading: false,
        error: null
      })
    } catch (error) {
      console.error('Error fetching pipeline data:', error)
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }))
    }
  }, [
    context.accessToken,
    catalogConfig.pipelineCatalog,
    catalogConfig.stageCatalog,
    catalogConfig.version,
    catalogClient
  ])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  useEffect(() => {
    if (context.accessToken && catalogConfig.autoFetch !== false) {
      fetchData()
    }
  }, [context.accessToken, fetchData, catalogConfig.autoFetch])

  return {
    ...data,
    refetch
  }
}
