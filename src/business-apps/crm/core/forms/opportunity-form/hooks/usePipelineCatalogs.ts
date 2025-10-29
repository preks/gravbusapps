import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface PipelineOption {
  id: string
  value: string
}

export interface PipelineStageOption {
  id: string
  value: string
  label: string
  name: string
}

export interface UsePipelineCatalogsReturn {
  pipelineOptions: PipelineOption[]
  pipelineStageOptions: PipelineStageOption[]
  isLoadingPipelines: boolean
  isLoadingStages: boolean
  pipelineError: string | null
  stageError: string | null
  refetchPipelines: () => void
  refetchStages: (selectedPipelineId?: string) => void
}

export const usePipelineCatalogs = (
  context: BusinessAppContextProps,
  selectedPipelineId?: string
): UsePipelineCatalogsReturn => {
  const [pipelineOptions, setPipelineOptions] = useState<PipelineOption[]>([])
  const [pipelineStageOptions, setPipelineStageOptions] = useState<PipelineStageOption[]>([])
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(true)
  const [isLoadingStages, setIsLoadingStages] = useState(true)
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const [stageError, setStageError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)
  const graphqlClient = useGraphQLClient(context.accessToken)

  const loadPipelines = useCallback(async () => {
    if (!context.accessToken) {
      console.log('❌ No access token available for pipelines')
      setIsLoadingPipelines(false)
      return
    }

    setIsLoadingPipelines(true)
    setPipelineError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'SalesPipeline',
          version: 'v1'
        },
        {
          limit: 50,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      if (response?.data) {
        const mappedPipelines: PipelineOption[] = response.data.map((entry: any) => ({
          id: entry.id,
          value: entry.id, // Send the full catalog reference as value for API
          label: entry.value, // Display the human-readable value from database
          name: entry.value // Same as label
        }))
        setPipelineOptions(mappedPipelines)
      } else {
        console.error('❌ Failed to load pipelines:', response)
        setPipelineError('Failed to load pipelines')
      }
    } catch (error) {
      console.error('❌ Error loading pipelines:', error)
      setPipelineError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoadingPipelines(false)
    }
  }, [context.accessToken, catalogClient])

  const loadPipelineStages = useCallback(
    async (filterPipelineId?: string) => {
      if (!context.accessToken) {
        console.log('❌ No access token available for pipeline stages')
        setIsLoadingStages(false)
        return
      }

      const pipelineIdToFilter = filterPipelineId || selectedPipelineId
      setIsLoadingStages(true)
      setStageError(null)

      try {
        let response

        if (pipelineIdToFilter) {
          // Use GraphQL to filter by parent pipeline ID
          const query = `
          query GetPipelineStages($parentId: String!) {
            CatalogEntry(where: {parentEntryId: {_eq: $parentId}}) {
              id
              value
              code
            }
          }
        `

          response = await graphqlClient.request(query, {
            parentId: pipelineIdToFilter
          })
          response = { data: response.CatalogEntry }
        } else {
          // Load all stages using catalog client
          response = await catalogClient.getCatalogEntriesList(
            {
              catalogIdentifier: 'SalesPipelineStage',
              version: 'v1'
            },
            {
              limit: 50,
              offset: 0,
              returnTotalRecords: true,
              includeChildCatalogEntries: true
            }
          )
        }

        if (response?.data) {
          const mappedStages: PipelineStageOption[] = response.data.map((entry: any) => ({
            id: entry.id,
            value: entry.id, // Send the full catalog reference as value for API
            label: entry.value, // Display the human-readable value
            name: entry.value
          }))
          setPipelineStageOptions(mappedStages)
        } else {
          console.error('❌ Failed to load pipeline stages:', response)
          setStageError('Failed to load pipeline stages')
          setPipelineStageOptions([])
        }
      } catch (error) {
        console.error('❌ Error loading pipeline stages:', error)
        setStageError(error instanceof Error ? error.message : 'Unknown error')
        setPipelineStageOptions([])
      } finally {
        setIsLoadingStages(false)
      }
    },
    [context.accessToken, catalogClient, graphqlClient, selectedPipelineId]
  )

  // Create a stable refetchStages function
  const refetchStages = useCallback(
    (pipelineId?: string) => {
      loadPipelineStages(pipelineId)
    },
    [loadPipelineStages]
  )

  useEffect(() => {
    loadPipelines()
    // Only load stages if a pipeline is selected
    if (selectedPipelineId) {
      loadPipelineStages()
    }
  }, [loadPipelines, loadPipelineStages, selectedPipelineId])

  return {
    pipelineOptions,
    pipelineStageOptions,
    isLoadingPipelines,
    isLoadingStages,
    pipelineError,
    stageError,
    refetchPipelines: loadPipelines,
    refetchStages
  }
}
