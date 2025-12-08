import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { CatalogEntry, BaseCatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import {
  DynamicFormConfiguration,
  DynamicFormFieldDefinition,
  DynamicFormFieldGroup
} from '@/components/dynamic-form/types'
import { GET_INVESTMENT_TYPES_QUERY, InvestmentCatalogDataResponse } from '../queries/investmentTypeQueries'

/**
 * InvestmentType extends CatalogEntry with a level property
 * Level 0 = InvestmentGroups
 * Level 1 = InvestmentTypes
 * Level 2 = LiquidFundInvestmentTypes
 * Future levels can be added recursively
 */
export type InvestmentType = CatalogEntry & {
  level: number
}

/**
 * Convert BaseCatalogEntry to CatalogEntry with computed fields
 * Note: childEntries are handled separately in processEntries
 */
const toCatalogEntry = (entry: BaseCatalogEntry, level: number, childEntries?: CatalogEntry[]): CatalogEntry => {
  const displayValue = entry.value || entry.code || entry.id || ''
  const translations = entry.translations || []
  const translatedValue = translations.find(t => t.localeCode)?.value || displayValue

  // Create entry without childEntries first
  // Remove childEntries from entry (it's optional in BaseCatalogEntry)
  const entryWithoutChildren = Object.fromEntries(
    Object.entries(entry).filter(([key]) => key !== 'childEntries')
  ) as Omit<BaseCatalogEntry, 'childEntries'>

  return {
    ...entryWithoutChildren,
    displayValue: translatedValue || displayValue,
    hasChildren: (childEntries?.length || 0) > 0,
    level,
    searchableText: [
      entry.value,
      entry.code,
      entry.alternativeCode,
      entry.description,
      entry.additionalValue1,
      entry.additionalValue2,
      entry.additionalValue3
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
    childEntries
  }
}

/**
 * Get group code from parent entry ID
 */
const getGroupCodeFromParentId = (parentId: string | null | undefined, allTypes: InvestmentType[]): string | null => {
  if (!parentId) return null

  // Find parent in allTypes
  const parent = allTypes.find(t => t.id === parentId)
  if (!parent) return null

  // If parent is level 0, extract code from ID
  if (parent.level === 0) {
    return parent.code || parent.id.split(':').pop() || null
  }

  // If parent is level 1, find its parent (group)
  if (parent.level === 1 && parent.parentEntryId) {
    return getGroupCodeFromParentId(parent.parentEntryId, allTypes)
  }

  return null
}

/**
 * Recursively process catalog entries and assign levels
 */
const processEntries = (
  entries: BaseCatalogEntry[],
  level: number,
  allTypes: InvestmentType[],
  parentGroupCode?: string | null
): InvestmentType[] => {
  const result: InvestmentType[] = []

  for (const entry of entries) {
    // Determine group code for this level
    let currentGroupCode = parentGroupCode
    if (level === 0) {
      // Level 0 is the group itself, extract code
      currentGroupCode = entry.code || entry.id.split(':').pop() || null
    }

    // Process child entries recursively first
    let childCatalogEntries: CatalogEntry[] | undefined
    if (entry.childEntries && entry.childEntries.length > 0) {
      const childLevel = level + 1
      const childTypes = processEntries(entry.childEntries, childLevel, allTypes, currentGroupCode)
      // Convert childTypes to CatalogEntry[] for childEntries
      childCatalogEntries = childTypes.map(child => {
        const childChildren = child.childEntries
        // Create a copy without childEntries
        const childWithoutChildren = Object.fromEntries(
          Object.entries(child).filter(([key]) => key !== 'childEntries')
        ) as Omit<InvestmentType, 'childEntries'>
        return toCatalogEntry(childWithoutChildren as BaseCatalogEntry, childLevel, childChildren)
      })
      result.push(...childTypes)
    }

    // Create catalog entry with processed children
    const catalogEntry = toCatalogEntry(entry, level, childCatalogEntries)

    const investmentType: InvestmentType = {
      ...catalogEntry,
      level
    }

    result.push(investmentType)
  }

  return result
}

/**
 * Build unified tree hierarchy from GraphQL response
 */
const buildInvestmentTypesTree = (data: InvestmentCatalogDataResponse): InvestmentType[] => {
  const allTypes: InvestmentType[] = []

  // Process InvestmentGroups (level 0) with nested children
  if (data.investmentGroups) {
    const groupTypes = processEntries(data.investmentGroups, 0, allTypes, null)
    allTypes.push(...groupTypes)
  }

  // Process InvestmentTypes (level 1) that might not be in groups
  if (data.investmentTypes) {
    // For standalone types, we need to find their group code from parentEntryId
    const typeTypes = data.investmentTypes.flatMap(entry => {
      const groupCode = getGroupCodeFromParentId(entry.parentEntryId, allTypes)
      return processEntries([entry], 1, allTypes, groupCode)
    })

    // Only add types that aren't already added as children of groups
    const existingIds = new Set(allTypes.map(t => t.id))
    const newTypes = typeTypes.filter(t => !existingIds.has(t.id))
    allTypes.push(...newTypes)
  }

  // Process LiquidFundInvestmentTypes (level 2) that might not be in types
  if (data.investmentLiquidFundTypes) {
    // For standalone liquid fund types, we need to find their group code through parent chain
    const liquidFundTypes = data.investmentLiquidFundTypes.flatMap(entry => {
      const groupCode = getGroupCodeFromParentId(entry.parentEntryId, allTypes)
      return processEntries([entry], 2, allTypes, groupCode)
    })

    // Only add types that aren't already added as children
    const existingIds = new Set(allTypes.map(t => t.id))
    const newTypes = liquidFundTypes.filter(t => !existingIds.has(t.id))
    allTypes.push(...newTypes)
  }

  return allTypes
}

/**
 * Parse objectValue from catalog entry (might be string or object)
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
 * Sanitize property path based on field type
 * Currently handles catalog fields by ensuring Ref suffix is present
 * Can be extended for other field types in the future
 */
const sanitizeProperty = (property: string, fieldType: string): string => {
  // Handle catalog fields: ensure Ref suffix is present
  if (fieldType.startsWith('CATALOG_')) {
    // Check if property already ends with Ref
    if (property.endsWith('Ref')) {
      return property // Already has Ref suffix
    }

    // Handle nested paths: "investment.someField" -> "investment.someFieldRef"
    if (property.includes('.')) {
      const parts = property.split('.')
      const lastPart = parts[parts.length - 1]
      // Only add Ref if last part doesn't already have it
      if (!lastPart.endsWith('Ref')) {
        parts[parts.length - 1] = `${lastPart}Ref`
        return parts.join('.')
      }
      return property
    }

    // Handle flat paths: "someField" -> "someFieldRef"
    return `${property}Ref`
  }

  // For non-catalog fields, return as-is (can add other sanitizations here later)
  return property
}

/**
 * Get investment fields by type (formFields for "investment" or referenceFields for "prospect")
 * Traverses hierarchy from deepest level up to root until fields are found
 */
/**
 * Convert formFields to DynamicFormConfiguration
 */
const convertFormFieldsToConfig = (formFields: any[]): DynamicFormConfiguration => {
  const dynamicFormFields: DynamicFormFieldGroup[] = formFields.map((group: any) => ({
    groupId: group.groupId,
    groupLabel: group.groupLabel,
    displayOrder: group.displayOrder,
    fields: group.fields.map(
      (field: any): DynamicFormFieldDefinition => ({
        type: field.type,
        label: field.label,
        property: sanitizeProperty(field.property, field.type),
        required: field.required,
        displayOrder: field.displayOrder
      })
    )
  }))
  return { formFields: dynamicFormFields }
}

/**
 * Convert referenceFields to DynamicFormConfiguration
 */
const convertReferenceFieldsToConfig = (referenceFields: any[]): DynamicFormConfiguration => {
  const fields: DynamicFormFieldDefinition[] = referenceFields.map((refField: any, index: number) => ({
    type: refField.type || 'TEXT',
    label: refField.label || refField.property || `Field ${index + 1}`,
    property: sanitizeProperty(refField.property || '', refField.type || 'TEXT'),
    required: refField.required || false,
    displayOrder:
      typeof refField.displayOrder === 'string' ? refField.displayOrder : String(refField.displayOrder || index + 1)
  }))

  fields.sort((a, b) => {
    const orderA = Number.parseFloat(String(a.displayOrder))
    const orderB = Number.parseFloat(String(b.displayOrder))
    return orderA - orderB
  })

  return {
    formFields: [
      {
        groupId: 'investment-prospect',
        groupLabel: 'Investment Details',
        displayOrder: 1,
        fields
      }
    ]
  }
}

/**
 * Get path from type to root
 */
const getTypePath = (allTypes: InvestmentType[], typeId: string): InvestmentType[] | null => {
  const path: InvestmentType[] = []
  let currentType = allTypes.find(t => t.id === typeId)
  if (!currentType) return null

  while (currentType) {
    path.unshift(currentType)
    if (!currentType.parentEntryId) break
    currentType = allTypes.find(t => t.id === currentType!.parentEntryId)
  }

  return path.length > 0 ? path : null
}

const getInvestmentFieldsByType = (
  allTypes: InvestmentType[],
  typeId: string | null | undefined,
  fieldType: 'investment' | 'prospect'
): DynamicFormConfiguration | null => {
  if (!typeId) return null

  const path = getTypePath(allTypes, typeId)
  if (!path) return null

  // Traverse from deepest level up to root
  for (let i = path.length - 1; i >= 0; i--) {
    const type = path[i]
    if (!type?.objectValue) continue

    const parsedObjectValue = parseObjectValue(type.objectValue)

    if (fieldType === 'investment') {
      const formFields = parsedObjectValue?.formFields
      if (formFields && Array.isArray(formFields) && formFields.length > 0) {
        return convertFormFieldsToConfig(formFields)
      }
    } else if (fieldType === 'prospect') {
      const referenceFields = parsedObjectValue?.referenceFields
      if (referenceFields && Array.isArray(referenceFields) && referenceFields.length > 0) {
        return convertReferenceFieldsToConfig(referenceFields)
      }
    }
  }

  return null
}

/**
 * Traverse up the hierarchy from any type to root group, then include all descendants
 * Returns: [root (level 0), ..., parent, selectedType, ...allDescendants (recursively)]
 */
const getPathByType = (allTypes: InvestmentType[], typeId: string | null | undefined): InvestmentType[] => {
  if (!typeId) return []

  const selectedType = allTypes.find(t => t.id === typeId)
  if (!selectedType) return []

  const path: InvestmentType[] = []

  // Step 1: Traverse up the parent chain to build path from root to selected type
  let currentType: InvestmentType | undefined = selectedType
  const ancestors: InvestmentType[] = []

  while (currentType) {
    ancestors.unshift(currentType) // Add to beginning to maintain order [root, ..., selectedType]

    if (!currentType.parentEntryId) {
      break // Reached root (level 0)
    }

    currentType = allTypes.find(t => t.id === currentType!.parentEntryId)
  }

  path.push(...ancestors)

  // Step 2: Add all descendants of the selected type recursively
  const addDescendants = (parentId: string) => {
    const children = allTypes.filter(t => t.parentEntryId === parentId)
    for (const child of children) {
      path.push(child)
      addDescendants(child.id) // Recursively add children of children
    }
  }

  // Add all descendants of the selected type
  addDescendants(typeId)

  return path
}

/**
 * Hook return interface
 */
export interface UseInvestmentTypesReturn {
  types: InvestmentType[]
  loading: boolean
  error: string | null
  getTypesByLevel: (level: number) => InvestmentType[]
  getTypesByParent: (parentId: string) => InvestmentType[]
  // Get complete path with all ancestors and descendants: [root, ..., type, ...allDescendants]
  getPathByType: (typeId: string | null | undefined) => InvestmentType[]
  // Get investment fields (formFields or referenceFields) by type, traversing hierarchy
  // Uses the default fieldType from hook initialization
  getInvestmentFieldsByType: (typeId: string | null | undefined) => DynamicFormConfiguration | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch and manage investment types as a unified tree hierarchy
 *
 * @param context - Business app context with access token
 * @param fieldType - Optional default fieldType ('investment' for formFields, 'prospect' for referenceFields)
 * @returns Investment types with helper functions
 *
 * @example
 * ```tsx
 * // For investment forms (uses formFields)
 * const { getInvestmentFieldsByType } = useInvestmentTypes(businessAppContext)
 * const fields = getInvestmentFieldsByType(typeId)
 *
 * // For lead/opportunity forms (uses referenceFields)
 * const { getInvestmentFieldsByType } = useInvestmentTypes(businessAppContext, 'prospect')
 * const fields = getInvestmentFieldsByType(typeId) // Uses 'prospect' from hook
 * ```
 */
export const useInvestmentTypes = (
  context: BusinessAppContextProps,
  fieldType?: 'investment' | 'prospect'
): UseInvestmentTypesReturn => {
  const [types, setTypes] = useState<InvestmentType[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Store default fieldType from hook initialization
  const defaultFieldType = fieldType || 'investment'

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentTypes = useCallback(async (): Promise<void> => {
    if (!context.accessToken) {
      setTypes([])
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const activeUserLocale = getCurrentActiveUserLocale() || 'en'
      const query = GET_INVESTMENT_TYPES_QUERY()

      const result = await graphqlClient.request<InvestmentCatalogDataResponse>(query, {
        activeUserLocale
      })

      const investmentTypes = buildInvestmentTypesTree(result)
      setTypes(investmentTypes)
    } catch (err) {
      console.error('Error fetching investment types:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setTypes([])
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  useEffect(() => {
    fetchInvestmentTypes()
  }, [fetchInvestmentTypes])

  // Helper function to get types by level
  const getTypesByLevel = useCallback(
    (level: number): InvestmentType[] => {
      return types.filter(type => type.level === level)
    },
    [types]
  )

  // Helper function to get types by parent ID
  const getTypesByParent = useCallback(
    (parentId: string): InvestmentType[] => {
      return types.filter(type => type.parentEntryId === parentId)
    },
    [types]
  )

  // Helper function to get path by type (ancestors + type + descendants)
  const getPathByTypeHelper = useCallback(
    (typeId: string | null | undefined): InvestmentType[] => {
      return getPathByType(types, typeId)
    },
    [types]
  )

  // Helper function to get investment fields by type
  const getInvestmentFieldsByTypeHelper = useCallback(
    (typeId: string | null | undefined): DynamicFormConfiguration | null => {
      // Always use defaultFieldType from hook initialization
      return getInvestmentFieldsByType(types, typeId, defaultFieldType)
    },
    [types, defaultFieldType]
  )

  return {
    types,
    loading,
    error,
    getTypesByLevel,
    getTypesByParent,
    getPathByType: getPathByTypeHelper,
    getInvestmentFieldsByType: getInvestmentFieldsByTypeHelper,
    refetch: fetchInvestmentTypes
  }
}
