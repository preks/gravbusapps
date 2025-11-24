import { useState, useEffect, useMemo } from 'react'
import { useCatalogEntries } from '@/common/data/catalog'
import {
  DynamicFormConfiguration,
  DynamicFormFieldDefinition,
  DynamicFormFieldGroup
} from '@/components/dynamic-form/types'

// FormFieldsDefinition interface (matching InvestmentCatalogQueries)
export interface FormFieldDefinition {
  type: 'DATE' | 'DATETIME' | 'AMOUNT' | 'TEXT' | 'TEXTAREA' | string
  label: string
  property: string
  required: boolean
  displayOrder: string
}

export interface FormFieldGroup {
  groupId: string
  groupLabel: string
  displayOrder: number
  fields: FormFieldDefinition[]
}

export interface FormFieldsDefinition {
  formFields: FormFieldGroup[]
}

export interface FilteredGroup {
  id: string
  value: string
  label: string
}

export interface FilteredType {
  id: string
  value: string
  label: string
}

interface UseProspectFieldsProps {
  investmentGroupRef?: string | null
  investmentTypeRef?: string | null
  accessToken: string
}

interface UseProspectFieldsReturn {
  configuration: DynamicFormConfiguration | null
  formFieldsDefinition: FormFieldsDefinition | null
  groups: FilteredGroup[]
  types: FilteredType[]
  isLoading: boolean
  error: string | null
}

/**
 * Helper: Parse objectValue (might be string or object)
 */
const parseObjectValue = (objValue: any): any => {
  if (!objValue) return null
  try {
    return typeof objValue === 'string' ? JSON.parse(objValue) : objValue
  } catch {
    return objValue
  }
}

/**
 * Helper: Check if entry has referenceFields
 */
const hasReferenceFields = (entry: any, childEntries?: any[]): boolean => {
  const objectValue = parseObjectValue(entry.objectValue)

  if (
    objectValue?.referenceFields &&
    Array.isArray(objectValue.referenceFields) &&
    objectValue.referenceFields.length > 0
  ) {
    return true
  }

  if (childEntries && childEntries.length > 0) {
    for (const child of childEntries) {
      const childObjValue = parseObjectValue(child.objectValue)
      if (
        childObjValue?.referenceFields &&
        Array.isArray(childObjValue.referenceFields) &&
        childObjValue.referenceFields.length > 0
      ) {
        return true
      }
    }
  }

  return false
}

/**
 * Helper: Check if type has referenceFields (directly or in parent group)
 */
const typeHasReferenceFields = (typeEntry: any, groupEntry: any | null): boolean => {
  const typeObjValue = parseObjectValue(typeEntry.objectValue)
  if (
    typeObjValue?.referenceFields &&
    Array.isArray(typeObjValue.referenceFields) &&
    typeObjValue.referenceFields.length > 0
  ) {
    return true
  }

  if (groupEntry) {
    const groupObjValue = parseObjectValue(groupEntry.objectValue)
    if (
      groupObjValue?.referenceFields &&
      Array.isArray(groupObjValue.referenceFields) &&
      groupObjValue.referenceFields.length > 0
    ) {
      return true
    }
  }

  return false
}

/**
 * Convert referenceFields from catalog to DynamicFormConfiguration format
 */
const convertReferenceFieldsToFormConfiguration = (referenceFields: any[]): DynamicFormConfiguration => {
  // Convert referenceFields to DynamicFormFieldDefinition
  const fields: DynamicFormFieldDefinition[] = referenceFields.map((refField, index) => ({
    type: refField.type || 'TEXT',
    label: refField.label || refField.property || `Field ${index + 1}`,
    property: refField.property || '',
    required: refField.required || false,
    displayOrder: refField.displayOrder || index + 1
  }))

  // Sort fields by displayOrder
  fields.sort((a, b) => {
    const orderA = typeof a.displayOrder === 'string' ? Number.parseFloat(a.displayOrder) : a.displayOrder
    const orderB = typeof b.displayOrder === 'string' ? Number.parseFloat(b.displayOrder) : b.displayOrder
    return orderA - orderB
  })

  // Create a single group for all prospect fields
  const group: DynamicFormFieldGroup = {
    groupId: 'investment-prospect',
    groupLabel: 'Investment Details',
    displayOrder: 1,
    fields
  }

  return {
    formFields: [group]
  }
}

/**
 * Convert referenceFields from catalog to FormFieldsDefinition format (for schema validation)
 */
const convertReferenceFieldsToFormFieldsDefinition = (referenceFields: any[]): FormFieldsDefinition => {
  // Convert referenceFields to FormFieldDefinition
  const fields: FormFieldDefinition[] = referenceFields.map((refField, index) => ({
    type: refField.type || 'TEXT',
    label: refField.label || refField.property || `Field ${index + 1}`,
    property: refField.property || '',
    required: refField.required || false,
    displayOrder:
      typeof refField.displayOrder === 'string' ? refField.displayOrder : String(refField.displayOrder || index + 1)
  }))

  // Sort fields by displayOrder
  fields.sort((a, b) => {
    const orderA = Number.parseFloat(a.displayOrder)
    const orderB = Number.parseFloat(b.displayOrder)
    return orderA - orderB
  })

  // Create a single group for all prospect fields
  const group: FormFieldGroup = {
    groupId: 'investment-prospect',
    groupLabel: 'Investment Details',
    displayOrder: 1,
    fields
  }

  return {
    formFields: [group]
  }
}

/**
 * Hook to load and convert referenceFields (prospect fields) from Investment Group/Type catalog
 * Also provides filtered groups and types with referenceFields
 *
 * Fetches all catalog data once and derives all necessary information from cached data
 */
export const useProspectFields = ({
  investmentGroupRef,
  investmentTypeRef,
  accessToken
}: UseProspectFieldsProps): UseProspectFieldsReturn => {
  const [configuration, setConfiguration] = useState<DynamicFormConfiguration | null>(null)
  const [formFieldsDefinition, setFormFieldsDefinition] = useState<FormFieldsDefinition | null>(null)
  const [allGroups, setAllGroups] = useState<any[]>([])
  const [allTypes, setAllTypes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchCatalogEntries } = useCatalogEntries({ accessToken })

  // Fetch all catalog data once (groups + types in parallel)
  useEffect(() => {
    const fetchAllData = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Single parallel request for Groups + Types
        const [groupsResult, typesResult] = await Promise.all([
          fetchCatalogEntries({
            catalogIdentifier: 'InvestmentGroup',
            version: 'v1',
            limit: 100,
            offset: 0,
            includeChildCatalogEntries: true
          } as any),
          fetchCatalogEntries({
            catalogIdentifier: 'InvestmentType',
            version: 'v1',
            limit: 100,
            offset: 0
          })
        ])

        setAllGroups(groupsResult.entries || [])
        setAllTypes(typesResult.entries || [])
      } catch (err) {
        console.error('useProspectFields: Error fetching catalog data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setAllGroups([])
        setAllTypes([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllData()
  }, [accessToken, fetchCatalogEntries])

  // Compute filtered groups (only those with referenceFields)
  const filteredGroups = useMemo<FilteredGroup[]>(() => {
    return allGroups
      .filter(group => {
        const childEntries = group.childEntries || []
        return hasReferenceFields(group, childEntries)
      })
      .map(group => ({
        id: group.id,
        value: `InvestmentGroup:v1:${group.code || group.id}`,
        label: group.value || group.displayValue || 'Unknown'
      }))
  }, [allGroups])

  // Compute filtered types for selected group
  const filteredTypes = useMemo<FilteredType[]>(() => {
    if (!investmentGroupRef) return []

    const groupCode = investmentGroupRef.split(':').pop()
    const expectedParentRef = `InvestmentGroup:v1:${groupCode}`
    const groupEntry = allGroups.find(
      g => g.id === investmentGroupRef || `InvestmentGroup:v1:${g.code}` === investmentGroupRef || g.code === groupCode
    )

    return allTypes
      .filter(
        type =>
          type.parentEntryId === expectedParentRef ||
          type.parentEntry?.id === investmentGroupRef ||
          type.parentEntry?.code === groupCode
      )
      .filter(type => typeHasReferenceFields(type, groupEntry || null))
      .map(type => ({
        id: type.id,
        value: `InvestmentType:v1:${type.code || type.id}`,
        label: type.value || type.displayValue || 'Unknown'
      }))
  }, [allTypes, allGroups, investmentGroupRef])

  // Compute prospect fields configuration from cached data
  useEffect(() => {
    const computeProspectFields = () => {
      // Check if IDs are valid (not test/mock IDs)
      const isValidId = (id: string | null | undefined): boolean => {
        if (!id) return false
        const testIdPattern = /^(ig_|it_|test_|mock_|demo_)\d+$/
        if (testIdPattern.exec(id)) return false
        return id.length > 10
      }

      const validGroupId = isValidId(investmentGroupRef) ? investmentGroupRef : null
      const validTypeId = isValidId(investmentTypeRef) ? investmentTypeRef : null

      if (!validGroupId && !validTypeId) {
        setConfiguration(null)
        setFormFieldsDefinition(null)
        return
      }

      // Find group and type from cached data
      const group = allGroups.find(g => g.id === validGroupId || `InvestmentGroup:v1:${g.code}` === validGroupId)
      const type = allTypes.find(t => t.id === validTypeId || `InvestmentType:v1:${t.code}` === validTypeId)

      // Priority: Type's referenceFields → Group's referenceFields
      let referenceFields: any[] = []

      if (type?.objectValue) {
        const typeObjValue = parseObjectValue(type.objectValue)
        if (typeObjValue?.referenceFields) {
          referenceFields = typeObjValue.referenceFields
        }
      }

      if (!referenceFields.length && group?.objectValue) {
        const groupObjValue = parseObjectValue(group.objectValue)
        if (groupObjValue?.referenceFields) {
          referenceFields = groupObjValue.referenceFields
        }
      }

      // Convert referenceFields to both formats
      if (referenceFields && referenceFields.length > 0) {
        const formConfig = convertReferenceFieldsToFormConfiguration(referenceFields)
        const formFieldsDef = convertReferenceFieldsToFormFieldsDefinition(referenceFields)
        setConfiguration(formConfig)
        setFormFieldsDefinition(formFieldsDef)
      } else {
        setConfiguration(null)
        setFormFieldsDefinition(null)
      }
    }

    // Only compute if we have data loaded
    if (!isLoading && (allGroups.length > 0 || allTypes.length > 0)) {
      computeProspectFields()
    }
  }, [investmentGroupRef, investmentTypeRef, allGroups, allTypes, isLoading])

  return {
    configuration,
    formFieldsDefinition,
    groups: filteredGroups,
    types: filteredTypes,
    isLoading,
    error
  }
}
