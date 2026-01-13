import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import {
  DynamicFormConfiguration,
  DynamicFormFieldGroup,
  DynamicFormFieldDefinition
} from '@/components/dynamic-form/types'

const CATALOG_ENTRY_ID = 'GeneralConfig:v1:COMPANY_ADDITIONAL_PROPERTIES'

/**
 * Raw field definition from catalog
 */
interface RawFieldDefinition {
  type: string
  label: string
  property: string
  required: boolean | string
  displayOrder: number | string
  suffix?: {
    type: string
    property: string
  }
}

/**
 * Raw group definition from catalog
 */
interface RawGroupDefinition {
  groupId: string
  groupLabel: string
  displayOrder: number | string
  fields: RawFieldDefinition[]
}

/**
 * Raw catalog objectValue structure
 */
interface RawAdditionalPropertiesConfig {
  additionalProperties: RawGroupDefinition[]
}

/**
 * Parse objectValue from catalog entry (might be string or object)
 */
const parseObjectValue = (objValue: unknown): RawAdditionalPropertiesConfig | null => {
  if (!objValue) return null
  try {
    const parsed = typeof objValue === 'string' ? JSON.parse(objValue) : objValue
    return parsed as RawAdditionalPropertiesConfig
  } catch {
    console.error('Failed to parse objectValue:', objValue)
    return null
  }
}

/**
 * Convert raw catalog structure to DynamicFormConfiguration
 * Transforms `additionalProperties` -> `formFields`
 */
const convertToDynamicFormConfig = (raw: RawAdditionalPropertiesConfig): DynamicFormConfiguration => {
  const formFields: DynamicFormFieldGroup[] = raw.additionalProperties.map(group => ({
    groupId: group.groupId,
    groupLabel: group.groupLabel,
    displayOrder: typeof group.displayOrder === 'string' ? Number.parseInt(group.displayOrder, 10) : group.displayOrder,
    fields: group.fields.map(
      (field): DynamicFormFieldDefinition => ({
        type: field.type,
        label: field.label,
        property: field.property,
        required: field.required === true || field.required === 'true',
        displayOrder: String(field.displayOrder)
      })
    )
  }))

  // Sort groups by displayOrder
  formFields.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))

  // Sort fields within each group by displayOrder
  formFields.forEach(group => {
    group.fields.sort((a, b) => {
      const orderA = Number.parseFloat(String(a.displayOrder))
      const orderB = Number.parseFloat(String(b.displayOrder))
      return orderA - orderB
    })
  })

  return { formFields }
}

export interface UseCompanyAdditionalPropertiesReturn {
  configuration: DynamicFormConfiguration | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useCompanyAdditionalProperties = (accessToken: string): UseCompanyAdditionalPropertiesReturn => {
  const [rawConfig, setRawConfig] = useState<RawAdditionalPropertiesConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(accessToken)

  const fetchConfiguration = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const entry = await catalogClient.getCatalogEntryById(CATALOG_ENTRY_ID)

      if (entry?.objectValue) {
        const parsed = parseObjectValue(entry.objectValue)

        if (parsed?.additionalProperties) {
          setRawConfig(parsed)
        } else {
          setError('Catalog entry does not contain additionalProperties configuration')
        }
      } else {
        // No entry found or no objectValue - this is OK, just means no additional properties defined
        setRawConfig(null)
      }
    } catch (err) {
      console.error('Error fetching company additional properties catalog:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch company additional properties')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, catalogClient])

  useEffect(() => {
    fetchConfiguration()
  }, [fetchConfiguration])

  // Memoize the converted configuration
  const configuration = useMemo(() => {
    if (!rawConfig) return null
    return convertToDynamicFormConfig(rawConfig)
  }, [rawConfig])

  return {
    configuration,
    isLoading,
    error,
    refetch: fetchConfiguration
  }
}
