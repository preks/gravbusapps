import { useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry } from '@/common/types/CatalogTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SalesPipelineStageData } from '../types'
import { getPipelineCatalogConfig, SourceApp } from '../utils/catalogConfig'

export const SALES_PIPELINE_STAGE_CATALOG = 'SalesPipelineStage'
export const SALES_PIPELINE_STAGE_VERSION = 'v1'

export const useSalesPipelineStages = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchSalesPipelineStages = useCallback(
    async (params?: {
      limit?: number
      offset?: number
      search?: string
      parentPipelineId?: string
      sourceApp?: SourceApp
    }): Promise<SalesPipelineStageData> => {
      const cfg = getPipelineCatalogConfig(params?.sourceApp || 'CRM')

      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: cfg.stageCatalog,
          version: cfg.version
        },
        {
          limit: params?.limit || 100,
          offset: params?.offset || 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true,
          ...(params?.search && { searchCriteria: params.search })
        }
      )

      return response
    },
    [catalogClient]
  )

  const fetchSalesPipelineStagesByParent = useCallback(
    async (
      parentPipelineId: string,
      params?: {
        limit?: number
        offset?: number
        search?: string
        sourceApp?: SourceApp
      }
    ): Promise<SalesPipelineStageData> => {
      return fetchSalesPipelineStages({
        ...params,
        parentPipelineId
      })
    },
    [fetchSalesPipelineStages]
  )

  const fetchSalesPipelineStageById = useCallback(
    async (id: string, includeTranslations = true): Promise<CatalogEntry> => {
      const queryParams = new URLSearchParams({
        ...(includeTranslations && { includeTranslations: 'true' })
      })

      const response = await catalogClient.get<CatalogEntry>(
        `/../catalog-entries/${encodeURIComponent(id)}?${queryParams}`
      )

      return response
    },
    [catalogClient]
  )

  return {
    fetchSalesPipelineStages,
    fetchSalesPipelineStagesByParent,
    fetchSalesPipelineStageById
  }
}
