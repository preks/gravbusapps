import { useMemo } from 'react'
import type { FlowStudioData } from '../../hooks/useFlowStudioData'
import type { FlowContextBrowserDialogProps } from '../shared/FlowContextBrowserDialog'

export function useFlowContextDataSources(studioData: FlowStudioData): FlowContextBrowserDialogProps['dataSources'] {
  return useMemo(
    () => ({
      catalogs: studioData.catalogs,
      catalogsLoading: studioData.catalogsLoading,
      catalogsError: studioData.catalogsError,
      catalogsQuery: studioData.catalogsQuery,
      catalogsHasMore: studioData.catalogsHasMore,
      searchCatalogs: studioData.searchCatalogs,
      loadMoreCatalogs: studioData.loadMoreCatalogs,
      entities: studioData.entities,
      entitiesLoading: studioData.entitiesLoading,
      entitiesError: studioData.entitiesError,
      loadEntities: studioData.loadEntities
    }),
    [
      studioData.catalogs,
      studioData.catalogsError,
      studioData.catalogsHasMore,
      studioData.catalogsLoading,
      studioData.catalogsQuery,
      studioData.entities,
      studioData.entitiesError,
      studioData.entitiesLoading,
      studioData.loadEntities,
      studioData.loadMoreCatalogs,
      studioData.searchCatalogs
    ]
  )
}
