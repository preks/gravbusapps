import { useState, useEffect, useCallback } from 'react'
import { FlowTemplate, FlowTemplateState } from '../../../types/flowTemplate'
import { createTemplatesService } from '../../../services/templatesService'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { isServicesAppTemplate } from '../../../config/servicePortalConfig'
import { transformTemplate } from '../../../utils/templateTransformUtils'

interface UseFlowTemplatesOptions {
  categoryId?: string
  enabled?: boolean
  limit?: number
  offset?: number
  filterByApp?: boolean // New option to enable app filtering
}

interface UseFlowTemplatesResult extends FlowTemplateState {
  refetch: () => Promise<void>
  hasNextPage: boolean
  loadMore: () => Promise<void>
}

export const useFlowTemplates = (
  contextProps: BusinessAppContextProps,
  options: UseFlowTemplatesOptions = {}
): UseFlowTemplatesResult => {
  const { categoryId, enabled = true, limit = 100, offset = 0, filterByApp = false } = options

  const [state, setState] = useState<FlowTemplateState>({
    templates: [],
    isLoading: false,
    error: null,
    totalCount: 0
  })

  const [currentOffset, setCurrentOffset] = useState(offset)

  const fetchTemplates = useCallback(
    async (isLoadMore = false) => {
      if (!enabled) return

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }))

      try {
        console.log('🎭 [useFlowTemplates] Fetching templates with options:', {
          categoryId,
          limit,
          offset: isLoadMore ? currentOffset : 0,
          filterByApp
        })

        const templatesService = createTemplatesService(contextProps)

        const result = await templatesService.getTemplates({
          limit,
          offset: isLoadMore ? currentOffset : 0,
          onlyLatest: true,
          includeDrafts: false,
          categoryId: categoryId,
          search: undefined
        })

        console.log('🎭 [useFlowTemplates] Raw templates received from shared service:', result)

        if (result.error) {
          throw new Error(result.error)
        }

        // Handle response from shared templates service
        const rawTemplates = result.templates || []
        const totalCount = result.totalCount || rawTemplates.length

        // Transform templates
        const transformedTemplates = rawTemplates
          .filter((template: any) => template && typeof template === 'object')
          .map(transformTemplate)
          .filter((template: FlowTemplate) => {
            // Filter by app if enabled
            if (filterByApp) {
              if (!isServicesAppTemplate(template.tags?.app)) {
                return false
              }
            }

            // Filter by category if specified
            if (categoryId && template.category && template.category !== categoryId) {
              return false
            }
            // For now, show all templates since we don't have category field yet
            return true
          })

        console.log('🎭 [useFlowTemplates] Transformed templates:', transformedTemplates)

        setState(prev => ({
          ...prev,
          templates: isLoadMore ? [...prev.templates, ...transformedTemplates] : transformedTemplates,
          isLoading: false,
          totalCount,
          error: null
        }))

        if (isLoadMore) {
          setCurrentOffset(prev => prev + limit)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch flow templates'
        console.error('🎭 [useFlowTemplates] Error fetching templates:', error)

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          templates: isLoadMore ? prev.templates : []
        }))
      }
    },
    [contextProps, categoryId, enabled, limit, currentOffset, filterByApp]
  )

  const refetch = useCallback(async () => {
    setCurrentOffset(0)
    await fetchTemplates(false)
  }, [fetchTemplates])

  const loadMore = useCallback(async () => {
    await fetchTemplates(true)
  }, [fetchTemplates])

  // Initial fetch
  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const hasNextPage = state.templates.length < state.totalCount

  return {
    ...state,
    refetch,
    hasNextPage,
    loadMore
  }
}
