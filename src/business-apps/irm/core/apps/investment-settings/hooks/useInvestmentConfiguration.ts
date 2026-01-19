import { useState, useEffect } from 'react'
import { InvestmentDataConfiguration, CatalogEntryWithConfig, TargetLevel } from '../pages/investment-data/types'

interface UseInvestmentConfigurationProps {
  selectedEntry: CatalogEntryWithConfig | null
  selectedGroup: CatalogEntryWithConfig | null
  targetLevel: TargetLevel
}

interface UseInvestmentConfigurationReturn {
  configuration: InvestmentDataConfiguration
  isInherited: {
    formFields: boolean
    prospectFields: boolean
    tileFields: boolean
  }
  setConfiguration: React.Dispatch<React.SetStateAction<InvestmentDataConfiguration>>
  setIsInherited: React.Dispatch<
    React.SetStateAction<{
      formFields: boolean
      prospectFields: boolean
      tileFields: boolean
    }>
  >
}

// Helper function to map catalog field types to prospect field types
const mapCatalogTypeToProspectType = (
  catalogType: string
): 'text' | 'number' | 'date' | 'badge' | 'currency' | 'percentage' => {
  if (catalogType.startsWith('CATALOG_') || catalogType.startsWith('REF_')) return 'badge'
  switch (catalogType) {
    case 'AMOUNT':
      return 'currency'
    case 'PERCENTAGE':
      return 'percentage'
    case 'DATE':
    case 'DATETIME':
      return 'date'
    case 'NUMBER':
      return 'number'
    default:
      return 'text'
  }
}

export const useInvestmentConfiguration = ({
  selectedEntry,
  selectedGroup,
  targetLevel
}: UseInvestmentConfigurationProps): UseInvestmentConfigurationReturn => {
  const [configuration, setConfiguration] = useState<InvestmentDataConfiguration>({
    formFields: [],
    prospectFields: [],
    tileFields: []
  })
  const [isInherited, setIsInherited] = useState({
    formFields: false,
    prospectFields: false,
    tileFields: false
  })

  useEffect(() => {
    if (selectedEntry?.objectValue) {
      // Check if we're at type level and need to inherit from parent group
      const isTypeLevel = targetLevel === 'type'
      const parentGroup = isTypeLevel && selectedGroup ? selectedGroup : null

      // Helper to check if a property is explicitly defined (even if empty array)
      const isDefined = (obj: any, key: string) => obj && obj.hasOwnProperty(key)

      // Initialize inheritance tracking
      const inheritanceStatus = {
        formFields: false,
        prospectFields: false,
        tileFields: false
      }

      // Form Fields - with inheritance fallback
      // Only inherit if the property is NOT defined at all (undefined/missing), not if it's an empty array
      let formFields = (selectedEntry.objectValue.formFields || []).map((group: any) => ({
        ...group,
        fields: (group.fields || []).map((field: any, fieldIndex: number) => ({
          ...field,
          id: field.id || `field-${Date.now()}-${fieldIndex}-${Math.random()}`
        }))
      }))

      if (isTypeLevel && !isDefined(selectedEntry.objectValue, 'formFields') && parentGroup?.objectValue?.formFields) {
        formFields = (parentGroup.objectValue.formFields || []).map((group: any) => ({
          ...group,
          fields: (group.fields || []).map((field: any, fieldIndex: number) => ({
            ...field,
            id: field.id || `field-${Date.now()}-${fieldIndex}-${Math.random()}`
          }))
        }))
        inheritanceStatus.formFields = true
      }

      // Prospect Fields - with inheritance fallback
      // Only inherit if referenceFields is NOT defined at all
      const hasReferenceFields = isDefined(selectedEntry.objectValue, 'referenceFields')
      const catalogReferenceFields = (selectedEntry.objectValue as any).referenceFields || []
      let prospectFields = catalogReferenceFields.map((refField: any, index: number) => ({
        key: refField.property || `field-${index}`,
        label: refField.label,
        property: refField.property,
        displayOrder:
          typeof refField.displayOrder === 'string'
            ? parseFloat(refField.displayOrder)
            : refField.displayOrder || index + 1,
        section: 'overview', // Default section
        type: mapCatalogTypeToProspectType(refField.type)
      }))

      if (isTypeLevel && !hasReferenceFields && parentGroup?.objectValue) {
        const parentReferenceFields = (parentGroup.objectValue as any).referenceFields || []
        prospectFields = parentReferenceFields.map((refField: any, index: number) => ({
          key: refField.property || `field-${index}`,
          label: refField.label,
          property: refField.property,
          displayOrder:
            typeof refField.displayOrder === 'string'
              ? parseFloat(refField.displayOrder)
              : refField.displayOrder || index + 1,
          section: 'overview',
          type: mapCatalogTypeToProspectType(refField.type)
        }))
        inheritanceStatus.prospectFields = true
      }

      // Tile Fields - with inheritance fallback
      // Only inherit if tileFields is NOT defined at all
      let tileFields = selectedEntry.objectValue.tileFields || []

      if (isTypeLevel && !isDefined(selectedEntry.objectValue, 'tileFields') && parentGroup?.objectValue?.tileFields) {
        tileFields = parentGroup.objectValue.tileFields || []
        inheritanceStatus.tileFields = true
      }

      setConfiguration({
        formFields,
        prospectFields,
        tileFields
      })

      setIsInherited(inheritanceStatus)
    } else {
      setConfiguration({
        formFields: [],
        prospectFields: [],
        tileFields: []
      })
      setIsInherited({
        formFields: false,
        prospectFields: false,
        tileFields: false
      })
    }
  }, [selectedEntry, selectedGroup, targetLevel])

  return {
    configuration,
    isInherited,
    setConfiguration,
    setIsInherited
  }
}
