import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogEntry } from '@/common/data/catalog'
import {
  DynamicFormConfiguration,
  DynamicFormFieldDefinition,
  DynamicFormFieldGroup
} from '@/components/dynamic-form/types'

interface UseProspectFieldsProps {
  investmentGroupId?: string | null
  investmentTypeId?: string | null
  businessAppContext?: BusinessAppContextProps
}

interface UseProspectFieldsReturn {
  configuration: DynamicFormConfiguration | null
  isLoading: boolean
  error: string | null
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
    const orderA = typeof a.displayOrder === 'string' ? parseFloat(a.displayOrder) : a.displayOrder
    const orderB = typeof b.displayOrder === 'string' ? parseFloat(b.displayOrder) : b.displayOrder
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
 * Hook to load and convert referenceFields (prospect fields) from Investment Group/Type catalog
 * Priority: Type's referenceFields → Group's referenceFields
 */
export const useProspectFields = ({
  investmentGroupId,
  investmentTypeId,
  businessAppContext
}: UseProspectFieldsProps): UseProspectFieldsReturn => {
  const [configuration, setConfiguration] = useState<DynamicFormConfiguration | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchCatalogEntryById } = useCatalogEntry(businessAppContext || ({} as BusinessAppContextProps))

  useEffect(() => {
    const fetchCatalogData = async () => {
      // Check if we have a valid context
      if (!businessAppContext?.accessToken) {
        setConfiguration(null)
        setIsLoading(false)
        return
      }

      // Check if IDs are valid (not test/mock IDs)
      const isValidId = (id: string | null | undefined): boolean => {
        if (!id) return false
        // Reject obvious test/mock IDs
        if (id.match(/^(ig_|it_|test_|mock_|demo_)\d+$/)) return false
        // Accept UUIDs or other valid catalog IDs
        return id.length > 10
      }

      const validGroupId = isValidId(investmentGroupId) ? investmentGroupId : null
      const validTypeId = isValidId(investmentTypeId) ? investmentTypeId : null

      // Only fetch if we have valid IDs
      if (!validGroupId && !validTypeId) {
        setConfiguration(null)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Fetch both Investment Group and Investment Type catalog data in parallel
        const [groupData, typeData] = await Promise.all([
          validGroupId ? fetchCatalogEntryById(validGroupId).catch(() => null) : Promise.resolve(null),
          validTypeId ? fetchCatalogEntryById(validTypeId).catch(() => null) : Promise.resolve(null)
        ])

        // Priority: Type's referenceFields, fallback to Group's referenceFields
        let referenceFields: any[] = []

        // Handle objectValue - it might be a JSON string that needs parsing
        let typeObjectValue: any = null
        let groupObjectValue: any = null

        if (typeData?.objectValue) {
          try {
            typeObjectValue =
              typeof typeData.objectValue === 'string' ? JSON.parse(typeData.objectValue) : typeData.objectValue
          } catch (err) {
            console.error('useProspectFields: Error parsing type objectValue:', err)
            typeObjectValue = typeData.objectValue
          }
        }

        if (groupData?.objectValue) {
          try {
            groupObjectValue =
              typeof groupData.objectValue === 'string' ? JSON.parse(groupData.objectValue) : groupData.objectValue
          } catch (err) {
            console.error('useProspectFields: Error parsing group objectValue:', err)
            groupObjectValue = groupData.objectValue
          }
        }

        if (typeObjectValue?.referenceFields) {
          referenceFields = typeObjectValue.referenceFields
        } else if (groupObjectValue?.referenceFields) {
          referenceFields = groupObjectValue.referenceFields
        }

        // Convert referenceFields to DynamicFormConfiguration
        if (referenceFields && referenceFields.length > 0) {
          const formConfig = convertReferenceFieldsToFormConfiguration(referenceFields)
          setConfiguration(formConfig)
        } else {
          setConfiguration(null)
        }
      } catch (err) {
        console.error('useProspectFields: Error fetching catalog data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        setConfiguration(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCatalogData()
  }, [investmentGroupId, investmentTypeId, businessAppContext?.accessToken, fetchCatalogEntryById])

  return {
    configuration,
    isLoading,
    error
  }
}
