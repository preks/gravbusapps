import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
// import { CatalogEntry } from '@/common/types/CatalogTypes';
import { PipelineDataIntegration } from '../types'
import { useSalesPipelines } from './useSalesPipelines'
import { useSalesPipelineStages } from './useSalesPipelineStages'
import { SourceApp } from '../utils/catalogConfig'

export const usePipelineDataIntegration = (
  context: BusinessAppContextProps,
  options?: {
    limit?: number
    autoFetch?: boolean
    sourceApp?: SourceApp // determines which catalogs to use
  }
): PipelineDataIntegration & {
  refetch: () => Promise<void>
} => {
  const [data, setData] = useState<PipelineDataIntegration>({
    pipelines: [],
    stages: [],
    isLoading: false,
    error: null
  })

  const { fetchSalesPipelines } = useSalesPipelines(context)
  const { fetchSalesPipelineStages } = useSalesPipelineStages(context)

  // Note: transformPipelines is not used in the current overview flow (stages on demand)

  // transformStage kept for reference in case future needs arise

  // Note: transformStages is unused in current modal-first design

  const fetchData = useCallback(async () => {
    if (!context.accessToken) {
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'No access token available. Please ensure you are authenticated.'
      }))
      return
    }

    setData(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      console.log('Fetching pipeline data with token:', context.accessToken.substring(0, 20) + '...')

      // Fetch both pipelines and stages in parallel using selected catalogs
      const [pipelinesResult, stagesResult] = await Promise.all([
        fetchSalesPipelines({
          limit: options?.limit || 100,
          offset: 0,
          sourceApp: options?.sourceApp || 'CRM'
        }),
        fetchSalesPipelineStages({
          limit: 1000, // Get all stages
          offset: 0,
          sourceApp: options?.sourceApp || 'CRM'
        })
      ])

      console.log('Raw pipelines result:', pipelinesResult)
      console.log('Raw stages result:', stagesResult)
      console.log('Found pipelines:', pipelinesResult.data?.length || 0)
      console.log('Found stages:', stagesResult.data?.length || 0)

      // No type filtering anymore; catalogs are already specific to sourceApp
      const filteredPipelines = pipelinesResult.data.filter(entry => entry.id && entry.value)

      // Create a map to count stages per pipeline
      const stageCountMap = new Map<string, number>()
      stagesResult.data.forEach(stage => {
        const parentId = stage.parentEntryId
        if (parentId) {
          stageCountMap.set(parentId, (stageCountMap.get(parentId) || 0) + 1)
        }
      })

      // Transform pipelines with real stage counts
      const transformedPipelines = filteredPipelines
        .map(entry => {
          const stageCount = stageCountMap.get(entry.id) || 0
          console.log(`Pipeline ${entry.value} has ${stageCount} stages`)

          return {
            id: entry.id,
            code: entry.code,
            value: entry.value,
            objectValue: (entry.objectValue as Record<string, any>) || {},
            stages: [], // Empty array - stages loaded on-demand in modal
            stageCount: stageCount, // Real stage count from fetched data
            displayName: entry.value,
            description: entry.additionalValue1 || '', // Use additionalValue1 as description
            // Use sourceApp as type for display context
            type: options?.sourceApp || 'CRM'
          }
        })
        .sort((a, b) => a.value.localeCompare(b.value))

      console.log('Transformed pipelines with stage counts:', transformedPipelines)

      setData({
        pipelines: transformedPipelines,
        stages: [], // Empty array for overview
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
    options?.limit,
    options?.sourceApp, // Add sourceApp to dependencies
    fetchSalesPipelines,
    fetchSalesPipelineStages
  ])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  useEffect(() => {
    if (context.accessToken && options?.autoFetch !== false) {
      fetchData()
    }
  }, [context.accessToken, fetchData, options?.autoFetch])

  return {
    ...data,
    refetch
  }
}
