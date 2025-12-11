import React, { useState, useEffect, useMemo } from 'react'
import { Alert } from '@newwork/nw-design-system'
import { useCatalogEntry } from '@/common/data/catalog'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { getCurrencySymbol } from '@/common/utils/numberFormatter'

interface DynamicInvestmentFieldsProps {
  investmentData: any // Generic prop that accepts both lead and opportunity data
  fields?: any[] // Optional fields from parent component (Lead/Opportunity records)
  accessToken: string
}

// Helper function to format currency values using currency catalog entry
const formatCurrency = (amount: number | string, investmentData?: any): string => {
  const numericAmount = typeof amount === 'string' ? Number.parseFloat(amount) : amount
  if (Number.isNaN(numericAmount) || amount === null || amount === undefined || amount === '') {
    return getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
  }

  // Get currency symbol from the currency catalog entry
  const currencySymbol = getCurrencySymbol(investmentData?.currency)

  // Format the number with thousands separators and always 2 decimal places
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericAmount)

  // Add space between currency symbol and amount
  return currencySymbol ? `${currencySymbol} ${formattedNumber}` : formattedNumber
}

// Helper function to extract catalog value from object
const extractCatalogValue = (fieldValue: any): string => {
  if (typeof fieldValue === 'object') {
    return (
      fieldValue.value ||
      fieldValue.label ||
      fieldValue.displayName ||
      fieldValue.additionalValue1 ||
      String(fieldValue)
    )
  }
  return String(fieldValue)
}

// Helper function to format number value for prefix/suffix
const formatNumberValueForPrefixSuffix = (fieldValue: any): string => {
  const numericValue = typeof fieldValue === 'string' ? Number.parseFloat(fieldValue) : fieldValue
  return Number.isNaN(numericValue) ? '' : numericValue.toLocaleString('en-US')
}

// Helper function to handle dynamic prefix/suffix by type
const handleDynamicPrefixSuffixByType = (type: string, fieldValue: any): string => {
  const upperType = type.toUpperCase()
  if (upperType === 'CATALOG_MEASUREMENTUNIT' || upperType === 'CATALOG_') {
    return convertUnicodeSymbol(extractCatalogValue(fieldValue))
  }
  if (upperType === 'TEXT') {
    return convertUnicodeSymbol(String(fieldValue))
  }
  if (upperType === 'NUMBER') {
    return formatNumberValueForPrefixSuffix(fieldValue)
  }
  return convertUnicodeSymbol(String(fieldValue))
}

// Helper function to resolve dynamic prefix/suffix
const resolveDynamicPrefixSuffix = (prefixSuffix: any, investmentData: any): string => {
  const fieldValue = getNestedProperty(investmentData, prefixSuffix.property)
  if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
    return ''
  }
  return handleDynamicPrefixSuffixByType(prefixSuffix.type, fieldValue)
}

// Helper function to resolve prefix/suffix values with optional field context
const resolvePrefixSuffix = (prefixSuffix: any, investmentData: any, fieldProperty?: string): string => {
  if (!prefixSuffix) {
    return ''
  }

  // If it's a static value
  if (prefixSuffix.value) {
    return convertUnicodeSymbol(prefixSuffix.value)
  }

  // If it's a dynamic value with type and property
  if (prefixSuffix.type && prefixSuffix.property) {
    // Make suffix property relative to field's parent path
    let suffixProperty = prefixSuffix.property

    if (fieldProperty?.includes('.')) {
      // Extract parent path from field (e.g., "realEstateInvestment.size" -> "realEstateInvestment")
      const fieldParts = fieldProperty.split('.')
      fieldParts.pop() // Remove the field name, keep the parent path
      const parentPath = fieldParts.join('.')

      // Prepend parent path to suffix property
      suffixProperty = `${parentPath}.${prefixSuffix.property}`
    }

    return resolveDynamicPrefixSuffix({ ...prefixSuffix, property: suffixProperty }, investmentData)
  }

  return ''
}

// Helper function to get nested property value using dot notation
const getNestedProperty = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    if (!current) return null

    // If current value is an array, take the first element
    if (Array.isArray(current) && current.length > 0) {
      current = current[0]
    }

    return current[key] !== undefined ? current[key] : null
  }, obj)
}

// Helper function to convert unicode symbols (e.g., "U+20AC" -> "€")
const convertUnicodeSymbol = (value: string): string => {
  if (!value || typeof value !== 'string') {
    return value || ''
  }

  const trimmedValue = value.trim()
  if (trimmedValue.startsWith('U+')) {
    try {
      const unicodeCode = trimmedValue.substring(2)
      const codePoint = parseInt(unicodeCode, 16)
      return String.fromCodePoint(codePoint)
    } catch {
      // If conversion fails, return the original value
      return value
    }
  }

  return value
}

// Helper function to parse objectValue from catalog data
const parseObjectValue = (data: any): any => {
  if (!data?.objectValue) return null
  try {
    return typeof data.objectValue === 'string' ? JSON.parse(data.objectValue) : data.objectValue
  } catch (err) {
    console.error('Error parsing objectValue:', err)
    return data.objectValue
  }
}

// Helper function to extract record fields from objectValue
const extractRecordFields = (objectValue: any): any[] => {
  if (!objectValue?.formFields || !Array.isArray(objectValue.formFields)) {
    return []
  }
  const flattenedFields = objectValue.formFields.flatMap((group: any) => group.fields || [])
  return flattenedFields.filter((field: any) => field.record === true)
}

// Helper function to get base property name (last part after final dot)
const getBasePropertyName = (property: string): string => {
  if (!property) return ''
  const parts = property.split('.')
  return parts[parts.length - 1]
}

// Helper function to get all properties used as dynamic prefix/suffix
const getPropertiesUsedAsPrefixSuffix = (fields: any[]): Set<string> => {
  const usedProperties = new Set<string>()

  fields.forEach(field => {
    // Check if field has a prefix with a property
    if (field.prefix?.property) {
      // Extract base property name from the prefix property path
      // e.g., "sizeMeasurementUnit.additionalValue1" -> "sizeMeasurementUnit"
      const baseProperty = field.prefix.property.split('.')[0]
      usedProperties.add(baseProperty)
    }
    // Check if field has a suffix with a property
    if (field.suffix?.property) {
      // Extract base property name from the suffix property path
      // e.g., "sizeMeasurementUnit.additionalValue1" -> "sizeMeasurementUnit"
      const baseProperty = field.suffix.property.split('.')[0]
      usedProperties.add(baseProperty)
    }
  })

  return usedProperties
}

// Helper function to filter out fields used as prefix/suffix
const filterFieldsUsedAsPrefixSuffix = (fields: any[]): any[] => {
  const propertiesUsedAsPrefixSuffix = getPropertiesUsedAsPrefixSuffix(fields)

  // Filter out fields whose BASE property name is used as prefix/suffix in another field
  return fields.filter(field => {
    const fieldProperty = field.property || field.name
    // Get base property name (last part after final dot)
    // e.g., "realEstateInvestment.sizeMeasurementUnit" -> "sizeMeasurementUnit"
    const basePropertyName = getBasePropertyName(fieldProperty)
    return !propertiesUsedAsPrefixSuffix.has(basePropertyName)
  })
}

const DynamicInvestmentFields: React.FC<DynamicInvestmentFieldsProps> = ({ investmentData, fields, accessToken }) => {
  const [fetchedFields, setFetchedFields] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use centralized catalog hook
  const { fetchCatalogEntryById } = useCatalogEntry(accessToken)

  // Fetch fields from catalog only if not provided by parent (backwards compatibility)
  useEffect(() => {
    // If fields are provided by parent, use them and skip fetching
    if (fields && fields.length > 0) {
      setFetchedFields([])
      setIsLoading(false)
      return
    }

    // Otherwise, fetch from catalog (for Account/Contact/Investment records)
    const fetchCatalogData = async () => {
      if (!accessToken) {
        setFetchedFields([])
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        const groupId = investmentData?.investmentGroup?.id
        const typeId = investmentData?.investmentType?.id

        // Validate IDs
        const isValidId = (id: string) => {
          if (!id) return false
          const testIdPattern = /^(ig_|it_|test_|mock_|demo_)\d+$/
          if (testIdPattern.exec(id)) return false
          return id.length > 10
        }

        const validGroupId = isValidId(groupId) ? groupId : null
        const validTypeId = isValidId(typeId) ? typeId : null

        if (!validGroupId && !validTypeId) {
          setFetchedFields([])
          setIsLoading(false)
          return
        }

        // Fetch catalog data
        const [groupData, typeData] = await Promise.all([
          validGroupId ? fetchCatalogEntryById(validGroupId).catch(() => null) : Promise.resolve(null),
          validTypeId ? fetchCatalogEntryById(validTypeId).catch(() => null) : Promise.resolve(null)
        ])

        const typeObjectValue = parseObjectValue(typeData)
        const groupObjectValue = parseObjectValue(groupData)

        const typeFields = extractRecordFields(typeObjectValue)
        const groupFields = extractRecordFields(groupObjectValue)
        const catalogFields = typeFields.length > 0 ? typeFields : groupFields

        setFetchedFields(catalogFields)
      } catch (err) {
        console.error('Error fetching catalog data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCatalogData()
  }, [
    fields,
    investmentData?.investmentGroup?.id,
    investmentData?.investmentType?.id,
    accessToken,
    fetchCatalogEntryById
  ])

  // Helper function to clean field name (strip investment. prefix)
  const cleanFieldName = (fieldName: string): string => {
    if (fieldName.startsWith('investment.') && !fieldName.startsWith('equityInvestment.')) {
      return fieldName.replace('investment.', '')
    }
    return fieldName
  }

  // Helper function to get field value with catalog handling
  const getFieldValue = (cleanFieldName: string, fieldType: string, investmentData: any): any => {
    // Use getNestedProperty for dot notation (like "equityInvestment.marketValue")
    // Use direct property access for flat properties (like "totalInvestmentAmount")
    const fieldValue = cleanFieldName.includes('.')
      ? getNestedProperty(investmentData, cleanFieldName)
      : investmentData?.[cleanFieldName]

    // For catalog fields: We now get both the expanded object and the Ref string from GraphQL
    // Priority: expanded catalog object (with .value) > Ref string > fallback
    if (fieldType.toUpperCase().startsWith('CATALOG_')) {
      // If we have an expanded catalog object, keep it (it will have .value, .code, etc.)
      if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
        return fieldValue
      }
      // If we got a string reference ID or null/undefined, try the Ref field
      const refFieldName = cleanFieldName.includes('.')
        ? cleanFieldName.replace(/\.([^.]+)$/, '.$1Ref') // "realEstateInvestment.sizeMeasurementUnit" -> "realEstateInvestment.sizeMeasurementUnitRef"
        : `${cleanFieldName}Ref` // "currency" -> "currencyRef"

      const refValue = refFieldName.includes('.')
        ? getNestedProperty(investmentData, refFieldName)
        : investmentData?.[refFieldName]

      // Only use the Ref value if we don't already have the expanded object
      if (refValue !== null && refValue !== undefined) {
        return refValue
      }
    }

    return fieldValue
  }

  // Helper function to format amount value
  const formatAmountValue = (fieldValue: any, investmentData: any): string => {
    if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
      return getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
    }
    return formatCurrency(fieldValue, investmentData)
  }

  // Helper function to format percentage value
  const formatPercentageValue = (fieldValue: any): string => {
    if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
      return getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
    }
    const numericValue = typeof fieldValue === 'string' ? Number.parseFloat(fieldValue) : fieldValue
    if (Number.isNaN(numericValue)) {
      return getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
    }
    return `${numericValue}%`
  }

  // Helper function to format number value
  const formatNumberValueForField = (fieldValue: any): string => {
    if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
      return getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
    }
    const numericValue = typeof fieldValue === 'string' ? Number.parseFloat(fieldValue) : fieldValue
    if (Number.isNaN(numericValue)) {
      return getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
    }
    return numericValue.toLocaleString('en-US')
  }

  // Helper function to format text value
  const formatTextValue = (fieldValue: any): string => {
    if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
      return getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
    }
    return String(fieldValue)
  }

  // Helper function to format catalog value
  const formatCatalogValue = (fieldValue: any): string => {
    if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
      return getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
    }
    if (typeof fieldValue === 'object') {
      // For catalog objects, prefer value, then label, then displayName
      return fieldValue.value || fieldValue.label || fieldValue.displayName || String(fieldValue)
    }
    // If it's a string (likely an ID), we need to look up the actual value
    // For now, just show the string value, but this could be enhanced to fetch catalog data
    return String(fieldValue)
  }

  // Helper function to format default/other types
  const formatDefaultValue = (fieldValue: any): string => {
    if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
      return getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
    }
    if (typeof fieldValue === 'boolean') {
      return fieldValue
        ? getTranslationFromI18nKeyAndLabel('crm.common.yes', 'Yes')
        : getTranslationFromI18nKeyAndLabel('crm.common.no', 'No')
    }
    return String(fieldValue)
  }

  // Helper function to format value by field type
  const formatValueByType = (fieldType: string, fieldValue: any, investmentData: any): string => {
    const upperType = fieldType.toUpperCase()
    if (upperType === 'AMOUNT') {
      return formatAmountValue(fieldValue, investmentData)
    }
    if (upperType === 'PERCENTAGE') {
      return formatPercentageValue(fieldValue)
    }
    if (upperType === 'NUMBER') {
      return formatNumberValueForField(fieldValue)
    }
    if (upperType === 'TEXT') {
      return formatTextValue(fieldValue)
    }
    if (fieldType.startsWith('CATALOG_')) {
      return formatCatalogValue(fieldValue)
    }
    return formatDefaultValue(fieldValue)
  }

  // Helper function to combine prefix, value, and suffix
  const combinePrefixSuffix = (formattedValue: string, prefix: string, suffix: string): string => {
    if (!prefix && !suffix) {
      return formattedValue
    }
    const parts = []
    if (prefix) parts.push(prefix)
    if (formattedValue !== getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')) {
      parts.push(formattedValue)
    }
    if (suffix) parts.push(suffix)
    return parts.join(' ')
  }

  // Use provided fields or fallback to fetched fields
  const fieldsToRender = useMemo(() => {
    if (fields && fields.length > 0) {
      // Flatten formFields structure if provided by parent (Lead/Opportunity)
      const flattened = fields.flatMap(group => group.fields || [])
      // Filter out fields that are used as prefix/suffix
      return filterFieldsUsedAsPrefixSuffix(flattened)
    }
    // Filter out fields that are used as prefix/suffix
    return filterFieldsUsedAsPrefixSuffix(fetchedFields)
  }, [fields, fetchedFields])

  // Memoized value formatting to prevent unnecessary re-renders
  const formattedFields = useMemo(() => {
    return fieldsToRender.map(field => {
      const fieldName = field.property || field.name
      const fieldType = field.type || 'text'
      const cleanedName = cleanFieldName(fieldName)
      const fieldValue = getFieldValue(cleanedName, fieldType, investmentData)
      const formattedValue = formatValueByType(fieldType, fieldValue, investmentData)
      const prefix = resolvePrefixSuffix(field.prefix, investmentData, fieldName)
      const suffix = resolvePrefixSuffix(field.suffix, investmentData, fieldName)
      const finalFormattedValue = combinePrefixSuffix(formattedValue, prefix, suffix)

      return {
        ...field,
        name: fieldName,
        label: field.label || fieldName,
        value: fieldValue,
        formattedValue: finalFormattedValue,
        type: fieldType,
        prefix,
        suffix
      }
    })
  }, [fieldsToRender, investmentData])

  if (isLoading) {
    return (
      <div className="gba:text-xs gba:mt-3 gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('crm.investments.fields.loading', 'Loading additional fields...')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:mt-3">
        <Alert variant="destructive">
          <div>
            <strong>{getTranslationFromI18nKeyAndLabel('crm.common.error', 'Error')}</strong>
            <div>
              {getTranslationFromI18nKeyAndLabel(
                'crm.investments.fields.loadError',
                'Failed to load investment fields'
              )}
              : {error}
            </div>
          </div>
        </Alert>
      </div>
    )
  }

  if (!formattedFields.length) {
    // Show message when no reference fields are configured
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:py-8 gba:px-4"
        data-testid="dynamic-investment-fields-empty"
      >
        <div className="gba:text-center">
          <p className="gba:text-sm gba:text-gray-500">
            {getTranslationFromI18nKeyAndLabel(
              'crm.investment.noFieldsDefined',
              'No fields defined for this Investment Group or Type'
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:grid gba:grid-cols-2 gba:gap-2" data-testid="dynamic-investment-fields">
      {formattedFields.map((field, index) => (
        <div
          key={field.name || index}
          className="gba:flex gba:flex-col gba:items-start gba:justify-center gba:px-4 gba:py-3 gba:rounded-md gba:bg-ext-1-secondary/30"
          data-testid={`dynamic-field-${field.name || index}`}
        >
          <div className="gba:text-sm gba:font-normal gba:text-ext-1-on-card gba:leading-5 gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap gba:w-full">
            {field.label}
          </div>
          <div className="gba:text-sm gba:font-medium gba:leading-5 gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap gba:w-full">
            {field.formattedValue}
          </div>
        </div>
      ))}
    </div>
  )
}

export default DynamicInvestmentFields
