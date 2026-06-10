import { useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CatalogEntry } from '@/common/data/catalog'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import {
  BENEFIT_TYPE_CATALOG,
  BENEFIT_TYPE_VERSION,
  BENEFIT_PROVIDER_CATALOG,
  BENEFIT_PROVIDER_VERSION
} from '../constants/benefitsMaintenanceConstants'
import {
  BenefitCatalogObjectValue,
  BenefitTypeFormData,
  BenefitProviderFormData,
  BenefitObjectValue,
  CatalogMutationSource
} from '../types/benefitsMaintenanceTypes'

interface BenefitCatalogCreatePayload {
  readonly code: string
  readonly value: string
  readonly description?: string
  readonly parentEntryId?: string
  readonly additionalValue1?: string
  readonly displayOrder?: number
  readonly objectValue?: BenefitCatalogObjectValue
  readonly translations: []
}

function getCatalogEntryCreatePath(catalogIdentifier: string, version: string): string {
  return `/catalogs/${encodeURIComponent(catalogIdentifier)}/${encodeURIComponent(version)}/entries`
}

const composeObjectValue = (obj: BenefitObjectValue): BenefitCatalogObjectValue => {
  const cleaned: BenefitCatalogObjectValue = {}
  if (obj.value) cleaned.value = obj.value
  if (obj.period) cleaned.period = obj.period
  if (obj.currency) cleaned.currency = obj.currency
  if (obj.groups?.length) cleaned.groups = obj.groups
  if (obj.employeeYearlyContribution) cleaned.employeeYearlyContribution = obj.employeeYearlyContribution
  if (obj.employeeMonthlyContribution) cleaned.employeeMonthlyContribution = obj.employeeMonthlyContribution
  if (obj.icon) cleaned.icon = obj.icon
  if (obj.legalEntityId) cleaned.legalEntityId = obj.legalEntityId
  if (obj.legalEntityName) cleaned.legalEntityName = obj.legalEntityName
  if (obj.countryRef) cleaned.countryRef = obj.countryRef
  return cleaned
}

export const useBenefitMutations = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const createBenefitType = useCallback(
    async (data: BenefitTypeFormData) => {
      const payload: BenefitCatalogCreatePayload = {
        code: data.code,
        value: data.value,
        description: data.description || undefined,
        parentEntryId: data.objectValue.countryRef || undefined,
        additionalValue1: data.objectValue.countryRef || undefined,
        displayOrder: data.displayOrder,
        objectValue: composeObjectValue(data.objectValue),
        translations: []
      }

      return catalogClient.post<CatalogEntry>(
        getCatalogEntryCreatePath(BENEFIT_TYPE_CATALOG, BENEFIT_TYPE_VERSION),
        payload
      )
    },
    [catalogClient]
  )

  const updateBenefitType = useCallback(
    async (
      entryId: string,
      data: Partial<BenefitTypeFormData>,
      original: CatalogMutationSource
    ): Promise<CatalogEntry> => {
      const ov = data.objectValue ? composeObjectValue(data.objectValue) : (original.objectValue ?? {})
      const countryRef = data.objectValue?.countryRef || original.parentEntryId
      return catalogClient.put<CatalogEntry>(`/catalog-entries/${entryId}`, {
        id: entryId,
        code: original.code,
        value: data.value,
        description: data.description || '',
        parentEntryId: countryRef || original.parentEntryId,
        additionalValue1: countryRef || undefined,
        objectValue: ov,
        translations: [],
        isDeleted: false
      })
    },
    [catalogClient]
  )

  const deactivateBenefitType = useCallback(
    async (entryId: string, entry: CatalogMutationSource): Promise<void> => {
      await catalogClient.put(`/catalog-entries/${entryId}`, {
        id: entryId,
        code: entry.code,
        value: entry.value,
        description: entry.description || '',
        parentEntryId: entry.parentEntryId,
        objectValue: entry.objectValue ?? {},
        translations: [],
        isDeleted: true
      })
    },
    [catalogClient]
  )

  const activateBenefitType = useCallback(
    async (entryId: string, entry: CatalogMutationSource): Promise<void> => {
      await catalogClient.put(`/catalog-entries/${entryId}`, {
        id: entryId,
        code: entry.code,
        value: entry.value,
        description: entry.description || '',
        parentEntryId: entry.parentEntryId,
        objectValue: entry.objectValue ?? {},
        translations: [],
        isDeleted: false
      })
    },
    [catalogClient]
  )

  const createProvider = useCallback(
    async (data: BenefitProviderFormData) => {
      const payload: BenefitCatalogCreatePayload = {
        code: data.code,
        value: data.value,
        description: data.description || undefined,
        parentEntryId: data.parentEntryId,
        displayOrder: data.displayOrder,
        translations: []
      }

      return catalogClient.post<CatalogEntry>(
        getCatalogEntryCreatePath(BENEFIT_PROVIDER_CATALOG, BENEFIT_PROVIDER_VERSION),
        payload
      )
    },
    [catalogClient]
  )

  const updateProvider = useCallback(
    async (
      entryId: string,
      data: Partial<BenefitProviderFormData>,
      original: CatalogMutationSource
    ): Promise<CatalogEntry> => {
      return catalogClient.put<CatalogEntry>(`/catalog-entries/${entryId}`, {
        id: entryId,
        code: original.code,
        value: data.value,
        description: data.description || '',
        parentEntryId: data.parentEntryId ?? original.parentEntryId,
        objectValue: original.objectValue ?? {},
        translations: [],
        isDeleted: false
      })
    },
    [catalogClient]
  )

  const deleteProvider = useCallback(
    async (entryId: string, entry: CatalogMutationSource): Promise<void> => {
      await catalogClient.put(`/catalog-entries/${entryId}`, {
        id: entryId,
        code: entry.code,
        value: entry.value,
        description: entry.description || '',
        parentEntryId: entry.parentEntryId,
        objectValue: entry.objectValue ?? {},
        translations: [],
        isDeleted: true
      })
    },
    [catalogClient]
  )

  const activateProvider = useCallback(
    async (entryId: string, entry: CatalogMutationSource): Promise<void> => {
      await catalogClient.put(`/catalog-entries/${entryId}`, {
        id: entryId,
        code: entry.code,
        value: entry.value,
        description: entry.description || '',
        parentEntryId: entry.parentEntryId,
        objectValue: entry.objectValue ?? {},
        translations: [],
        isDeleted: false
      })
    },
    [catalogClient]
  )

  const linkProviderToBenefit = useCallback(
    async (provider: CatalogEntry, benefitTypeId: string): Promise<void> => {
      await catalogClient.put(`/catalog-entries/${provider.id}`, {
        id: provider.id,
        code: provider.code,
        value: provider.value,
        description: provider.description || '',
        parentEntryId: benefitTypeId,
        objectValue: provider.objectValue ?? {},
        translations: [],
        isDeleted: false
      })
    },
    [catalogClient]
  )

  const unlinkProvider = useCallback(
    async (provider: CatalogEntry): Promise<void> => {
      if (!provider.parentEntryId) {
        return
      }

      await catalogClient.deleteParentEntryCatalog(provider.id, provider.parentEntryId)
    },
    [catalogClient]
  )

  return useMemo(
    () => ({
      createBenefitType,
      updateBenefitType,
      deactivateBenefitType,
      activateBenefitType,
      createProvider,
      updateProvider,
      deleteProvider,
      activateProvider,
      linkProviderToBenefit,
      unlinkProvider
    }),
    [
      createBenefitType,
      updateBenefitType,
      deactivateBenefitType,
      activateBenefitType,
      createProvider,
      updateProvider,
      deleteProvider,
      activateProvider,
      linkProviderToBenefit,
      unlinkProvider
    ]
  )
}

export default useBenefitMutations
