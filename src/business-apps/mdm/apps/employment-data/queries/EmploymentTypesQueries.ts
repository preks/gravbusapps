import { CatalogManagerClient } from '@/common/network/catalogs/CatalogManagerClient'
import { EmploymentType } from '../components/tabs'
import { useCallback } from 'react'
import { isEmploymentTypeMarkedDeleted } from '../utils/catalogEntryMetadata'
import { EMPLOYMENT_TYPE_CATALOG, EMPLOYMENT_TYPE_VERSION } from '@/business-apps/mdm/apps/employment-data/types'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export const useGetEmploymentTypesData = (catalogClient: CatalogManagerClient, userLocale: string) => {
  const fetchEmploymentTypes = useCallback(async () => {
    try {
      const catalogLocale = getCurrentActiveUserLocale() || userLocale
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: EMPLOYMENT_TYPE_CATALOG,
          version: EMPLOYMENT_TYPE_VERSION
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeTranslations: true,
          localeCode: catalogLocale
        }
      )

      if (response.data) {
        const types: EmploymentType[] = response.data
          .map((entry: any) => {
            const tr = (entry.translations || []).find(
              (t: { localeCode?: string }) => t.localeCode?.toLowerCase() === catalogLocale.toLowerCase()
            )
            const value = tr?.value?.trim() ? tr.value : entry.value
            const additionalValue1 =
              tr?.additionalValue1 != null && String(tr.additionalValue1).trim() !== ''
                ? tr.additionalValue1
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
          })
          .filter(entry => !isEmploymentTypeMarkedDeleted(entry))
        return types
      }
    } catch {
      console.error('Failed to load employment types')
    }
  }, [catalogClient, userLocale])

  return { fetchEmploymentTypes }
}
