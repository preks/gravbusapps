import { CatalogManagerClient } from '@/common/network/catalogs/CatalogManagerClient'
import { useCallback } from 'react'
import { ContractType } from '../components/tabs'
import { isContractTypeMarkedDeleted } from '../utils/catalogEntryMetadata'
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
          includeTranslations: true
        }
      )

      if (response.data) {
        const types: ContractType[] = response.data
          .map((entry: any) => {
            const tr = (entry.translations || []).find((t: { localeCode?: string }) => t.localeCode === userLocale)
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
              objectValue: entry.objectValue,
              isDeleted: entry.isDeleted,
              translations: entry.translations || []
            }
          })
          .filter(entry => !isContractTypeMarkedDeleted(entry))
        return types
      }
    } catch {
      console.error('Failed to load contract types')
    }
  }, [catalogClient, userLocale])

  return { fetchContractTypes }
}
