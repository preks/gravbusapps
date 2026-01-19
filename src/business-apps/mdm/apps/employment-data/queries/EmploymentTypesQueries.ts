import { CatalogManagerClient } from '@/common/network/catalogs/CatalogManagerClient'
import { EmploymentType } from '../components/tabs'
import { useCallback } from 'react'
import {
  EMPLOYMENT_TYPE_CATALOG,
  EMPLOYMENT_TYPE_VERSION
} from '@/business-apps/hr/core/forms/job-position/hooks/useEmploymentTypes'

export const useGetEmploymentTypesData = (catalogClient: CatalogManagerClient, userLocale: string) => {
  const fetchEmploymentTypes = useCallback(async () => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: EMPLOYMENT_TYPE_CATALOG,
          version: EMPLOYMENT_TYPE_VERSION
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          localeCode: userLocale
        }
      )

      if (response.data) {
        const types: EmploymentType[] = response.data.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value,
          alternativeCode: entry.alternativeCode,
          additionalValue1: entry.additionalValue1,
          additionalValue2: entry.additionalValue2,
          additionalValue3: entry.additionalValue3,
          translations: entry.translations || []
        }))
        return types
      }
    } catch (error) {
      console.error('Failed to load employment types')
    }
  }, [catalogClient, userLocale])

  return { fetchEmploymentTypes }
}
