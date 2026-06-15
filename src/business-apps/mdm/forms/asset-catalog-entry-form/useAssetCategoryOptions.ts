import { useEffect, useState } from 'react'
import type { CatalogManagerClient } from '@/common/network/catalogs/CatalogManagerClient'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { ASSET_CATALOG_VERSION, ASSET_CATEGORY_CATALOG } from '@/business-apps/mdm/apps/assets-master-data/types'
import type { AssetCategoryOption } from './AssetCategoryParentField'

const getLocalizedCatalogLabel = (entry: CatalogEntry, localeCode: string) => {
  const translation = entry.translations?.find(item => item.localeCode?.toLowerCase() === localeCode.toLowerCase())

  return translation?.value?.trim() || entry.value || entry.code || entry.id
}

interface UseAssetCategoryOptionsParams {
  catalogClient: CatalogManagerClient
  enabled: boolean
  userLocale: string
}

export const useAssetCategoryOptions = ({ catalogClient, enabled, userLocale }: UseAssetCategoryOptionsParams) => {
  const [options, setOptions] = useState<AssetCategoryOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setOptions([])
      return
    }

    let isMounted = true

    const loadAssetCategoryOptions = async () => {
      setLoading(true)

      try {
        const catalogLocale = getCurrentActiveUserLocale() || userLocale
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: ASSET_CATEGORY_CATALOG,
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

        if (!isMounted) return

        setOptions(
          (response.data || [])
            .filter(entry => entry.isDeleted !== true)
            .map(entry => ({
              id: entry.id,
              label: getLocalizedCatalogLabel(entry, catalogLocale)
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
        )
      } catch {
        if (isMounted) {
          setOptions([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadAssetCategoryOptions()

    return () => {
      isMounted = false
    }
  }, [catalogClient, enabled, userLocale])

  return { loading, options }
}
