import { useState } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { InvestmentCatalogData } from '@/common/data/investment/hooks/useInvestmentCatalogs'
import {
  CatalogEntryRaw,
  CatalogEntryWithConfig,
  CatalogReferenceField,
  InvestmentDataConfiguration,
  ProspectField,
  TargetLevel
} from '../pages/investment-data/types'
import { stripRegistryMetadataFromFormFields } from '../pages/investment-data/utils/investmentFormFieldRegistry'
import { coerceRequiredSubtypeKey } from '../pages/investment-data/utils/formLayoutChoice'

interface UseInvestmentDataSaveProps {
  accessToken: string
  fetchCatalogData: () => Promise<InvestmentCatalogData>
}

interface UseInvestmentDataSaveReturn {
  saveConfiguration: (params: SaveConfigurationParams) => Promise<CatalogEntryWithConfig | null>
  isSaving: boolean
  error: string | null
}

interface SaveConfigurationParams {
  selectedEntry: CatalogEntryWithConfig
  selectedGroup: CatalogEntryWithConfig | null
  targetLevel: TargetLevel
  configuration: InvestmentDataConfiguration
  isInherited: {
    formFields: boolean
    prospectFields: boolean
    tileFields: boolean
  }
}

/** Persisted catalog payload: known configuration keys plus a legacy migration field. */
type CatalogObjectValue = Partial<InvestmentDataConfiguration> & {
  /** @deprecated Pre-`requiredSubtypeKey` schema; deleted on save. */
  fieldLayoutSubtype?: string
}

interface UpdateCatalogEntryPayload {
  id: string
  code: string
  objectValue: CatalogObjectValue
}

const mapProspectTypeToCatalogType = (prospectType: string): string => {
  switch (prospectType) {
    case 'currency':
      return 'AMOUNT'
    case 'percentage':
      return 'PERCENTAGE'
    case 'date':
      return 'DATE'
    case 'number':
      return 'NUMBER'
    case 'badge':
      return 'TEXT'
    case 'text':
    default:
      return 'TEXT'
  }
}

const mapProspectFieldsToCatalogReferenceFields = (prospectFields: ProspectField[]): CatalogReferenceField[] => {
  return prospectFields.map(prospectField => ({
    type: mapProspectTypeToCatalogType(prospectField.type),
    label: prospectField.label,
    property: prospectField.property,
    displayOrder: String(prospectField.displayOrder)
  }))
}

const buildCatalogObjectValue = (
  selectedEntry: CatalogEntryWithConfig,
  configuration: InvestmentDataConfiguration,
  isInherited: {
    formFields: boolean
    prospectFields: boolean
    tileFields: boolean
  }
): CatalogObjectValue => {
  const catalogObjectValue: CatalogObjectValue = {
    ...selectedEntry.objectValue
  }
  delete catalogObjectValue.requiredSubtypeKey

  // Update formFields only if NOT inherited, otherwise remove it
  if (isInherited.formFields) {
    delete catalogObjectValue.formFields
    // MIGRATION: legacy key from the pre-`requiredSubtypeKey` schema. Safe to remove once all tenants are re-saved.
    delete catalogObjectValue.fieldLayoutSubtype
  } else {
    catalogObjectValue.formFields = stripRegistryMetadataFromFormFields(configuration.formFields)
    // MIGRATION: legacy key from the pre-`requiredSubtypeKey` schema. Safe to remove once all tenants are re-saved.
    delete catalogObjectValue.fieldLayoutSubtype
  }

  // Update tileFields only if NOT inherited, otherwise remove it
  if (isInherited.tileFields) {
    delete catalogObjectValue.tileFields
  } else {
    catalogObjectValue.tileFields = configuration.tileFields
  }

  // Update referenceFields only if NOT inherited, otherwise remove it
  if (isInherited.prospectFields) {
    delete catalogObjectValue.referenceFields
  } else {
    catalogObjectValue.referenceFields = mapProspectFieldsToCatalogReferenceFields(configuration.prospectFields || [])
  }

  return catalogObjectValue
}

export const mapCatalogEntryToTyped = (entry: CatalogEntryRaw): CatalogEntryWithConfig => {
  return {
    id: entry.id,
    code: entry.code,
    value: entry.value,
    objectValue: (entry.objectValue as InvestmentDataConfiguration) || {},
    parentEntryId: entry.parentEntryId
  }
}

const buildInvestmentGroupObjectValue = (
  selectedGroup: CatalogEntryWithConfig,
  configuration: InvestmentDataConfiguration,
  editedGroupObjectValue?: CatalogObjectValue
): CatalogObjectValue => ({
  ...(editedGroupObjectValue ?? selectedGroup.objectValue),
  requiredSubtypeKey: coerceRequiredSubtypeKey(configuration.requiredSubtypeKey)
})

export const useInvestmentDataSave = ({
  accessToken,
  fetchCatalogData
}: UseInvestmentDataSaveProps): UseInvestmentDataSaveReturn => {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const catalogClient = useCatalogManagerClient(accessToken)

  const saveConfiguration = async ({
    selectedEntry,
    selectedGroup,
    targetLevel,
    configuration,
    isInherited
  }: SaveConfigurationParams): Promise<CatalogEntryWithConfig | null> => {
    setIsSaving(true)
    setError(null)

    try {
      let catalogIdentifier: string
      if (targetLevel === 'group') {
        catalogIdentifier = 'InvestmentGroup'
      } else if (targetLevel === 'type') {
        catalogIdentifier = 'InvestmentType'
      } else {
        catalogIdentifier = 'InvestmentLiquidFundType'
      }
      const version = 'v1'

      const catalogObjectValue = buildCatalogObjectValue(selectedEntry, configuration, isInherited)
      const groupEntry = targetLevel === 'group' ? selectedEntry : selectedGroup

      if (!groupEntry) {
        throw new Error('Investment group is required to save the field layout')
      }

      const payload: UpdateCatalogEntryPayload = {
        id: selectedEntry.id,
        code: selectedEntry.code,
        objectValue:
          targetLevel === 'group'
            ? buildInvestmentGroupObjectValue(groupEntry, configuration, catalogObjectValue)
            : catalogObjectValue
      }

      // Note: The catalog API's updateCatalogEntry type signature excludes id,
      // but the actual implementation requires it, hence we cast to unknown first
      await catalogClient.updateCatalogEntry(
        catalogIdentifier,
        version,
        selectedEntry.id,
        payload as unknown as Omit<UpdateCatalogEntryPayload, 'id'>
      )

      if (targetLevel !== 'group') {
        const groupPayload: UpdateCatalogEntryPayload = {
          id: groupEntry.id,
          code: groupEntry.code,
          objectValue: buildInvestmentGroupObjectValue(groupEntry, configuration)
        }

        await catalogClient.updateCatalogEntry(
          'InvestmentGroup',
          version,
          groupEntry.id,
          groupPayload as unknown as Omit<UpdateCatalogEntryPayload, 'id'>
        )
      }

      const data = await fetchCatalogData()

      let entries: CatalogEntryRaw[]
      if (targetLevel === 'group') {
        entries = data.investmentGroups
      } else if (targetLevel === 'type') {
        entries = data.investmentTypes
      } else {
        entries = data.investmentLiquidFundTypes
      }

      const updatedEntry = entries.find(e => e.id === selectedEntry.id)

      if (updatedEntry) {
        return mapCatalogEntryToTyped(updatedEntry)
      }

      return null
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  return {
    saveConfiguration,
    isSaving,
    error
  }
}
