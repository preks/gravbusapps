import { useState, useEffect } from 'react'
import {
  CatalogEntryWithConfig,
  CatalogReferenceField,
  FieldDefinition,
  FieldGroup,
  InvestmentDataConfiguration,
  ProspectField,
  RequiredSubtypeKey,
  TargetLevel
} from '../pages/investment-data/types'
import {
  coerceRequiredSubtypeKey,
  DEFAULT_REQUIRED_SUBTYPE_KEY,
  inferRequiredSubtypeKeyFromFormFields,
  isRequiredSubtypeKey
} from '../pages/investment-data/utils/formLayoutChoice'

interface UseInvestmentConfigurationProps {
  selectedEntry: CatalogEntryWithConfig | null
  selectedGroup: CatalogEntryWithConfig | null
  selectedType: CatalogEntryWithConfig | null
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
  selectedType,
  targetLevel
}: UseInvestmentConfigurationProps): UseInvestmentConfigurationReturn => {
  const [configuration, setConfiguration] = useState<InvestmentDataConfiguration>({
    formFields: [],
    prospectFields: [],
    tileFields: [],
    requiredSubtypeKey: DEFAULT_REQUIRED_SUBTYPE_KEY
  })
  const [isInherited, setIsInherited] = useState({
    formFields: false,
    prospectFields: false,
    tileFields: false
  })

  useEffect(() => {
    if (selectedEntry?.objectValue) {
      const isTypeLevel = targetLevel === 'type'
      const isLiquidFundTypeLevel = targetLevel === 'liquidFundType'
      const parentEntry =
        isLiquidFundTypeLevel && selectedType ? selectedType : isTypeLevel && selectedGroup ? selectedGroup : null

      // Distinguishes "explicitly empty" (own value, even []) from "missing" (inherit from parent).
      const hasOwnKey = (obj: object | undefined | null, key: string): boolean =>
        Boolean(obj) && Object.prototype.hasOwnProperty.call(obj, key)

      const inheritanceStatus = {
        formFields: false,
        prospectFields: false,
        tileFields: false
      }

      const ensureFieldIds = (groups: FieldGroup[]): FieldGroup[] =>
        groups.map(group => ({
          ...group,
          fields: (group.fields || []).map((field: FieldDefinition, fieldIndex: number) => ({
            ...field,
            id: field.id || `field-${Date.now()}-${fieldIndex}-${Math.random()}`
          }))
        }))

      let formFields: FieldGroup[] = ensureFieldIds(selectedEntry.objectValue.formFields || [])

      if (
        (isTypeLevel || isLiquidFundTypeLevel) &&
        !hasOwnKey(selectedEntry.objectValue, 'formFields') &&
        parentEntry?.objectValue?.formFields
      ) {
        formFields = ensureFieldIds(parentEntry.objectValue.formFields || [])
        inheritanceStatus.formFields = true
      }

      const mapReferenceFieldToProspect = (refField: CatalogReferenceField, index: number): ProspectField => ({
        key: refField.property || `field-${index}`,
        label: refField.label,
        property: refField.property,
        displayOrder:
          typeof refField.displayOrder === 'string'
            ? parseFloat(refField.displayOrder)
            : refField.displayOrder || index + 1,
        section: 'overview',
        type: mapCatalogTypeToProspectType(refField.type)
      })

      const hasReferenceFields = hasOwnKey(selectedEntry.objectValue, 'referenceFields')
      let prospectFields: ProspectField[] = (selectedEntry.objectValue.referenceFields || []).map(
        mapReferenceFieldToProspect
      )

      if ((isTypeLevel || isLiquidFundTypeLevel) && !hasReferenceFields && parentEntry?.objectValue) {
        prospectFields = (parentEntry.objectValue.referenceFields || []).map(mapReferenceFieldToProspect)
        inheritanceStatus.prospectFields = true
      }

      let tileFields = selectedEntry.objectValue.tileFields || []

      if (
        (isTypeLevel || isLiquidFundTypeLevel) &&
        !hasOwnKey(selectedEntry.objectValue, 'tileFields') &&
        parentEntry?.objectValue?.tileFields
      ) {
        tileFields = parentEntry.objectValue.tileFields || []
        inheritanceStatus.tileFields = true
      }

      let requiredSubtypeKey: RequiredSubtypeKey = DEFAULT_REQUIRED_SUBTYPE_KEY
      const ownSubtype = selectedEntry.objectValue.requiredSubtypeKey
      const parentSubtype = parentEntry?.objectValue?.requiredSubtypeKey

      if (isRequiredSubtypeKey(ownSubtype)) {
        requiredSubtypeKey = ownSubtype
      } else if (inheritanceStatus.formFields && isRequiredSubtypeKey(parentSubtype)) {
        requiredSubtypeKey = parentSubtype
      } else {
        const inferred = inferRequiredSubtypeKeyFromFormFields(formFields)
        if (isRequiredSubtypeKey(inferred)) {
          requiredSubtypeKey = inferred
        }
      }

      requiredSubtypeKey = coerceRequiredSubtypeKey(requiredSubtypeKey)

      setConfiguration({
        formFields,
        prospectFields,
        tileFields,
        requiredSubtypeKey
      })

      setIsInherited(inheritanceStatus)
    } else {
      setConfiguration({
        formFields: [],
        prospectFields: [],
        tileFields: [],
        requiredSubtypeKey: DEFAULT_REQUIRED_SUBTYPE_KEY
      })
      setIsInherited({
        formFields: false,
        prospectFields: false,
        tileFields: false
      })
    }
  }, [selectedEntry, selectedGroup, selectedType, targetLevel])

  return {
    configuration,
    isInherited,
    setConfiguration,
    setIsInherited
  }
}
