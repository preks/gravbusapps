import { useCallback } from 'react'
import { CatalogManagerClient } from '@/common/network/catalogs/CatalogManagerClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { AssetCatalogEntry, AssetCatalogIdentifier } from '../types'
import { ASSET_CATALOG_VERSION } from '../types'
import { isAssetCatalogEntryMarkedDeleted } from '../utils/catalogEntryMetadata'

const getLocalizedAssetCatalogEntry = (entry: CatalogEntry, catalogLocale: string): AssetCatalogEntry => {
  const translation = (entry.translations || []).find(
    item => item.localeCode?.toLowerCase() === catalogLocale.toLowerCase()
  )
  const value = translation?.value?.trim() ? translation.value : entry.value
  const additionalValue1 =
    translation?.additionalValue1 != null && String(translation.additionalValue1).trim() !== ''
      ? translation.additionalValue1
      : entry.additionalValue1

  return {
    id: entry.id,
    code: entry.code,
    value,
    alternativeCode: entry.alternativeCode,
    additionalValue1,
    additionalValue2: entry.additionalValue2,
    additionalValue3: entry.additionalValue3,
    isDeleted: entry.isDeleted,
    translations: entry.translations || []
  }
}

export const useGetAssetCatalogEntriesData = (
  catalogClient: CatalogManagerClient,
  userLocale: string,
  catalogIdentifier: AssetCatalogIdentifier
) => {
  const fetchAssetCatalogEntries = useCallback(async () => {
    try {
      const catalogLocale = getCurrentActiveUserLocale() || userLocale
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier,
          version: ASSET_CATALOG_VERSION
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeTranslations: true,
          localeCode: catalogLocale
        }
      )

      return (response.data || [])
        .map(entry => getLocalizedAssetCatalogEntry(entry, catalogLocale))
        .filter(entry => !isAssetCatalogEntryMarkedDeleted(entry))
    } catch {
      console.error(`Failed to load ${catalogIdentifier} catalog entries`)
      return []
    }
  }, [catalogClient, catalogIdentifier, userLocale])

  return { fetchAssetCatalogEntries }
}
