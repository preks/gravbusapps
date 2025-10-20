import { useState } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import {
  CatalogEntryWithConfig,
  InvestmentDataConfiguration,
  ProspectField,
  TargetLevel
} from '../pages/investment-data/types'

interface UseInvestmentDataSaveProps {
  accessToken: string
  fetchCatalogData: () => Promise<any>
}

interface UseInvestmentDataSaveReturn {
  saveConfiguration: (params: SaveConfigurationParams) => Promise<CatalogEntryWithConfig | null>
  isSaving: boolean
  error: string | null
}

interface SaveConfigurationParams {
  selectedEntry: CatalogEntryWithConfig
  targetLevel: TargetLevel
  configuration: InvestmentDataConfiguration
  isInherited: {
    formFields: boolean
    prospectFields: boolean
    tileFields: boolean
  }
}

interface UpdateCatalogEntryPayload {
  id: string
  code: string
  objectValue: Record<string, any>
}

interface CatalogReferenceField {
  type: string
  label: string
  property: string
  displayOrder: string
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
): Record<string, any> => {
  const catalogObjectValue: Record<string, any> = {
    ...selectedEntry.objectValue
  }

  // Update formFields only if NOT inherited, otherwise remove it
  if (isInherited.formFields) {
    delete catalogObjectValue.formFields
  } else {
    catalogObjectValue.formFields = configuration.formFields
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

export const mapCatalogEntryToTyped = (entry: any): CatalogEntryWithConfig => {
  return {
    id: entry.id,
    code: entry.code,
    value: entry.value,
    objectValue: entry.objectValue || {},
    parentEntryId: entry.parentEntryId
  }
}

export const useInvestmentDataSave = ({
  accessToken,
  fetchCatalogData
}: UseInvestmentDataSaveProps): UseInvestmentDataSaveReturn => {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const catalogClient = useCatalogManagerClient(accessToken)

  const saveConfiguration = async ({
    selectedEntry,
    targetLevel,
    configuration,
    isInherited
  }: SaveConfigurationParams): Promise<CatalogEntryWithConfig | null> => {
    setIsSaving(true)
    setError(null)

    try {
      const catalogIdentifier = targetLevel === 'group' ? 'InvestmentGroup' : 'InvestmentType'
      const version = 'v1'

      const catalogObjectValue = buildCatalogObjectValue(selectedEntry, configuration, isInherited)

      const payload: UpdateCatalogEntryPayload = {
        id: selectedEntry.id,
        code: selectedEntry.code,
        objectValue: catalogObjectValue
      }

      // Note: The catalog API's updateCatalogEntry type signature excludes id,
      // but the actual implementation requires it, hence we cast to unknown first
      await catalogClient.updateCatalogEntry(
        catalogIdentifier,
        version,
        selectedEntry.id,
        payload as unknown as Omit<UpdateCatalogEntryPayload, 'id'>
      )

      const data = await fetchCatalogData()

      const entries = targetLevel === 'group' ? data.investmentGroups : data.investmentTypes
      const updatedEntry = entries.find((e: any) => e.id === selectedEntry.id)

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
