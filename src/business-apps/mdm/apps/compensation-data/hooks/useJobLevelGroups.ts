import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry } from '@/common/types/CatalogTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { JobLevelGroupData } from '../types'

export const JOB_LEVEL_GROUP_CATALOG = 'JobLevelGroup'
export const JOB_LEVEL_GROUP_VERSION = 'v1'

export const useJobLevelGroups = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchJobLevelGroups = async (params?: {
    limit?: number
    offset?: number
    search?: string
  }): Promise<JobLevelGroupData> => {
    const response = await catalogClient.getCatalogEntriesList(
      {
        catalogIdentifier: JOB_LEVEL_GROUP_CATALOG,
        version: JOB_LEVEL_GROUP_VERSION
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
  }

  const fetchJobLevelGroupById = async (id: string, includeTranslations = true): Promise<CatalogEntry> => {
    // For individual catalog entry, we need to use the direct path since there's no specific method in the client
    const queryParams = new URLSearchParams({
      ...(includeTranslations && { includeTranslations: 'true' })
    })

    // Use the base path without /catalogs since the client already includes it
    const response = await catalogClient.get<CatalogEntry>(
      `/../catalog-entries/${encodeURIComponent(id)}?${queryParams}`
    )

    return response
  }

  return {
    fetchJobLevelGroups,
    fetchJobLevelGroupById
  }
}
