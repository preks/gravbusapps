import { CatalogManagerClient } from '@/common/network/catalogs/CatalogManagerClient'
import { CatalogEntry as CmCatalogEntry } from '@/common/types/CatalogTypes'
import {
  BenefitCatalogItem,
  ProviderEntry
} from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/benefitCatalogTypes'

/**
 * Fetch BenefitProvider catalog entries and map them for a specific benefit.
 * - Primary filter: provider.type matches benefit.catalogEntry.type
 * - Fallback filter: provider.parentEntryId equals benefit.catalogId
 */
export const fetchBenefitProvidersForBenefit = async (
  catalogClient: CatalogManagerClient,
  selectedBenefit: BenefitCatalogItem | undefined | null
): Promise<ProviderEntry[]> => {
  if (!catalogClient || !selectedBenefit) return []

  const providersResponse = await catalogClient.getCatalogEntriesList(
    { catalogIdentifier: 'BenefitProvider', version: 'v1' },
    {
      includeTranslations: true,
      returnTotalRecords: true,
      includeChildCatalogEntries: true,
      limit: 1000,
      offset: 0
    }
  )

  const benefitType = selectedBenefit?.catalogEntry?.type
  const benefitCatalogId = selectedBenefit?.catalogId

  const mapped: ProviderEntry[] = (providersResponse?.data || [])
    .filter((p: CmCatalogEntry) => {
      const typeMatches = !!benefitType && p.type === benefitType
      const parentMatches = !!benefitCatalogId && p.parentEntryId === benefitCatalogId
      return typeMatches || parentMatches
    })
    .map((p: CmCatalogEntry) => ({
      id: p.id,
      value: p.value,
      code: p.code,
      description: p.additionalValue1,
      parentEntryId: p.parentEntryId,
      translations: (p.translations || []).map(tr => ({
        localeCode: tr.localeCode || '',
        value: tr.value || '',
        additionalValue1: tr.additionalValue1,
        additionalValue2: tr.additionalValue2,
        additionalValue3: tr.additionalValue3
      }))
    }))

  return mapped
}
