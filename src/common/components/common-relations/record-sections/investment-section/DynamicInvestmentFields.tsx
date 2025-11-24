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

// Helper function to resolve prefix/suffix values
const resolvePrefixSuffix = (prefixSuffix: any, investmentData: any): string => {
  if (!prefixSuffix) {
    return ''
  }

  // If it's a static value
  if (prefixSuffix.value) {
    return convertUnicodeSymbol(prefixSuffix.value)
  }

  // If it's a dynamic value with type and property
  if (prefixSuffix.type && prefixSuffix.property) {
    const fieldValue = getNestedProperty(investmentData, prefixSuffix.property)

    if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
      return ''
    }

    // Handle different types
    switch (prefixSuffix.type.toUpperCase()) {
      case 'CATALOG_MEASUREMENTUNIT':
      case 'CATALOG_':
        // For catalog types, show the value or label if it's an object
        if (typeof fieldValue === 'object') {
          const value =
            fieldValue.value ||
            fieldValue.label ||
            fieldValue.displayName ||
            fieldValue.additionalValue1 ||
            String(fieldValue)
          return convertUnicodeSymbol(value)
        } else {
          return convertUnicodeSymbol(String(fieldValue))
        }
      case 'TEXT':
        return convertUnicodeSymbol(String(fieldValue))
      case 'NUMBER':
        const numericValue = typeof fieldValue === 'string' ? Number.parseFloat(fieldValue) : fieldValue
        return Number.isNaN(numericValue) ? '' : numericValue.toLocaleString('en-US')
      default:
        return convertUnicodeSymbol(String(fieldValue))
    }
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
      if (accessToken) {
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

        // Parse objectValue
        const parseObjectValue = (data: any): any => {
          if (!data?.objectValue) return null
          try {
            return typeof data.objectValue === 'string' ? JSON.parse(data.objectValue) : data.objectValue
          } catch (err) {
            console.error('Error parsing objectValue:', err)
            return data.objectValue
          }
        }

        const typeObjectValue = parseObjectValue(typeData)
        const groupObjectValue = parseObjectValue(groupData)

        // Extract formFields (nested paths for Investment/Account/Contact records)
        const extractRecordFields = (objectValue: any): any[] => {
          if (!objectValue?.formFields || !Array.isArray(objectValue.formFields)) {
            return []
          }
          const flattenedFields = objectValue.formFields.flatMap((group: any) => group.fields || [])
          return flattenedFields.filter((field: any) => field.record === true)
        }

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

  // Use provided fields or fallback to fetched fields
  const fieldsToRender = useMemo(() => {
    if (fields && fields.length > 0) {
      // Flatten formFields structure if provided by parent (Lead/Opportunity)
      return fields.flatMap(group => group.fields || [])
    }
    return fetchedFields
  }, [fields, fetchedFields])

  // Memoized value formatting to prevent unnecessary re-renders
  const formattedFields = useMemo(() => {
    return fieldsToRender.map(field => {
      const fieldName = field.property || field.name
      const fieldType = field.type || 'text'

      // Strip "investment." prefix from field paths (but not "equityInvestment." or other entity prefixes)
      const cleanFieldName =
        fieldName.startsWith('investment.') && !fieldName.startsWith('equityInvestment.')
          ? fieldName.replace('investment.', '')
          : fieldName

      // Use getNestedProperty for dot notation (like "equityInvestment.marketValue")
      // Use direct property access for flat properties (like "totalInvestmentAmount")
      let fieldValue = cleanFieldName.includes('.')
        ? getNestedProperty(investmentData, cleanFieldName)
        : investmentData?.[cleanFieldName]

      // For catalog fields: We now get both the expanded object and the Ref string from GraphQL
      // Priority: expanded catalog object (with .value) > Ref string > fallback
      if (fieldType.toUpperCase().startsWith('CATALOG_')) {
        // If we have an expanded catalog object, keep it (it will have .value, .code, etc.)
        if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
          // Already have the expanded catalog object, great!
        }
        // If we got a string reference ID or null/undefined, try the Ref field
        else {
          const refFieldName = cleanFieldName.includes('.')
            ? cleanFieldName.replace(/\.([^.]+)$/, '.$1Ref') // "realEstateInvestment.sizeMeasurementUnit" -> "realEstateInvestment.sizeMeasurementUnitRef"
            : `${cleanFieldName}Ref` // "currency" -> "currencyRef"

          const refValue = refFieldName.includes('.')
            ? getNestedProperty(investmentData, refFieldName)
            : investmentData?.[refFieldName]

          // Only use the Ref value if we don't already have the expanded object
          if (refValue !== null && refValue !== undefined) {
            fieldValue = refValue
          }
        }
      }

      let formattedValue: string

      // Handle different field types
      switch (fieldType.toUpperCase()) {
        case 'AMOUNT':
          // Money formatting with currency
          if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
            formattedValue = getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
          } else {
            formattedValue = formatCurrency(fieldValue, investmentData)
          }
          break

        case 'PERCENTAGE':
          // Percentage formatting
          if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
            formattedValue = getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
          } else {
            const numericValue = typeof fieldValue === 'string' ? Number.parseFloat(fieldValue) : fieldValue
            if (Number.isNaN(numericValue)) {
              formattedValue = getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
            } else {
              formattedValue = `${numericValue}%`
            }
          }
          break

        case 'NUMBER':
          // Number formatting with thousands separators
          if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
            formattedValue = getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
          } else {
            const numericValue = typeof fieldValue === 'string' ? Number.parseFloat(fieldValue) : fieldValue
            if (Number.isNaN(numericValue)) {
              formattedValue = getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
            } else {
              formattedValue = numericValue.toLocaleString('en-US')
            }
          }
          break

        case 'TEXT':
          // Plain text
          if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
            formattedValue = getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
          } else {
            formattedValue = String(fieldValue)
          }
          break

        default:
          // Handle CATALOG_<catalogName> types and other types
          if (fieldType.startsWith('CATALOG_')) {
            // For catalog types, show the value or label if it's an object
            if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
              formattedValue = getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
            } else if (typeof fieldValue === 'object') {
              // For catalog objects, prefer value, then label, then displayName
              formattedValue = fieldValue.value || fieldValue.label || fieldValue.displayName || String(fieldValue)
            } else {
              // If it's a string (likely an ID), we need to look up the actual value
              // For now, just show the string value, but this could be enhanced to fetch catalog data
              formattedValue = String(fieldValue)
            }
          } else {
            // For other types, treat as text
            if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
              formattedValue = getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
            } else if (typeof fieldValue === 'boolean') {
              formattedValue = fieldValue
                ? getTranslationFromI18nKeyAndLabel('crm.common.yes', 'Yes')
                : getTranslationFromI18nKeyAndLabel('crm.common.no', 'No')
            } else {
              formattedValue = String(fieldValue)
            }
          }
      }

      // Resolve prefix and suffix
      const prefix = resolvePrefixSuffix(field.prefix, investmentData)
      const suffix = resolvePrefixSuffix(field.suffix, investmentData)

      // Combine prefix, value, and suffix
      let finalFormattedValue = formattedValue
      if (prefix || suffix) {
        const parts = []
        if (prefix) parts.push(prefix)
        if (formattedValue !== getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')) {
          parts.push(formattedValue)
        }
        if (suffix) parts.push(suffix)
        finalFormattedValue = parts.join(' ')
      }

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
