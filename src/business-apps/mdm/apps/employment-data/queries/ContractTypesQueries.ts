import { CatalogManagerClient } from '@/common/network/catalogs/CatalogManagerClient'
import { useCallback } from 'react'
import { ContractType } from '../components/tabs'
import { isContractTypeMarkedDeleted } from '../utils/catalogEntryMetadata'
import {
  CONTRACT_TYPE_CATALOG,
  CONTRACT_TYPE_VERSION,
  EMPLOYMENT_TYPE_CATALOG,
  EMPLOYMENT_TYPE_VERSION
} from '@/business-apps/mdm/apps/employment-data/types'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export const useGetContractTypesData = (catalogClient: CatalogManagerClient, userLocale: string) => {
  const fetchContractTypes = useCallback(async () => {
    try {
      const catalogLocale = getCurrentActiveUserLocale() || userLocale
      const baseParams = {
        catalogIdentifier: CONTRACT_TYPE_CATALOG,
        version: CONTRACT_TYPE_VERSION
      }
      const queryParams = {
        limit: 100,
        offset: 0,
        returnTotalRecords: true,
        localeCode: catalogLocale,
        includeTranslations: true
      }

      const queryParamsWithChildren = {
        ...queryParams,
        includeChildCatalogEntries: true
      }

      const [allContractTypesResponse, allContractTypesWithChildrenResponse, employmentTypesResponse] =
        await Promise.all([
          catalogClient.getCatalogEntriesList(baseParams, queryParams),
          catalogClient.getCatalogEntriesList(baseParams, queryParamsWithChildren),
          catalogClient.getCatalogEntriesList(
            {
              catalogIdentifier: EMPLOYMENT_TYPE_CATALOG,
              version: EMPLOYMENT_TYPE_VERSION
            },
            queryParams
          )
        ])

      const employmentTypeParentIds = new Set(
        (employmentTypesResponse.data || []).flatMap(entry => {
          const ids = [entry.id]
          if (entry.code) {
            ids.push(`${EMPLOYMENT_TYPE_CATALOG}:${EMPLOYMENT_TYPE_VERSION}:${entry.code}`)
          }
          return ids
        })
      )

      const isEmploymentTypeParent = (parentEntryId?: string) =>
        Boolean(
          parentEntryId &&
            (parentEntryId === EMPLOYMENT_TYPE_CATALOG ||
              parentEntryId.startsWith(`${EMPLOYMENT_TYPE_CATALOG}:`) ||
              employmentTypeParentIds.has(parentEntryId))
        )

      const topLevelContractTypes = (allContractTypesResponse.data || []).filter(
        entry => !entry.parentEntryId || isEmploymentTypeParent(entry.parentEntryId)
      )

      const employmentLinkedEntries = (allContractTypesWithChildrenResponse.data || []).filter(entry => {
        return isEmploymentTypeParent(entry.parentEntryId)
      })

      const entriesById = new Map(
        [...topLevelContractTypes, ...employmentLinkedEntries].map(entry => [entry.id, entry])
      )

      const entries = Array.from(entriesById.values())

      if (entries.length > 0) {
        const types: ContractType[] = entries
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
              parentEntryId: entry.parentEntryId,
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
