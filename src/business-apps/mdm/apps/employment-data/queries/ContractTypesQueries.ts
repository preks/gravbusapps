import { CatalogManagerClient } from '@/common/network/catalogs/CatalogManagerClient'
import { useCallback } from 'react'
import { ContractType } from '../components/tabs'
import { parseContractTypeJson } from '../utils/catalogEntryMetadata'
import {
  CONTRACT_TYPE_CATALOG,
  CONTRACT_TYPE_VERSION
} from '@/business-apps/hr/core/forms/job-position/hooks/useContractTypes'

export const useGetContractTypesData = (catalogClient: CatalogManagerClient, userLocale: string) => {
  const fetchContractTypes = useCallback(async () => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: CONTRACT_TYPE_CATALOG,
          version: CONTRACT_TYPE_VERSION
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          localeCode: userLocale
        }
      )

      if (response.data) {
        const types: ContractType[] = response.data
          .map((entry: any) => ({
            id: entry.id,
            code: entry.code,
            value: entry.value,
            alternativeCode: entry.alternativeCode,
            additionalValue1: entry.additionalValue1,
            additionalValue2: entry.additionalValue2,
            additionalValue3: entry.additionalValue3,
            translations: entry.translations || []
          }))
          .filter(entry => !parseContractTypeJson(entry.additionalValue2).is_deleted)
        return types
      }
    } catch {
      console.error('Failed to load contract types')
    }
  }, [catalogClient, userLocale])

  return { fetchContractTypes }
}
