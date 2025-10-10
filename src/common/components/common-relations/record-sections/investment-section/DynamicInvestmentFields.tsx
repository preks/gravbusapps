import React, { useState, useEffect, useMemo } from 'react'
import { Alert } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogEntry } from '@/common/data/catalog'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface DynamicInvestmentFieldsProps {
  investmentData: any // Generic prop that accepts both lead and opportunity data
  businessAppContext?: BusinessAppContextProps
}

// Helper function to get currency symbol from currency catalog entry
const getCurrencySymbol = (currencyEntry?: any): string => {
  if (!currencyEntry) {
    return ''
  }

  // Check if additionalValue1 contains a unicode symbol (e.g., "U+20AC")
  if (currencyEntry.additionalValue1) {
    const additionalValue = currencyEntry.additionalValue1.trim()
    if (additionalValue.startsWith('U+')) {
      // Convert unicode code to actual symbol
      const unicodeCode = additionalValue.substring(2)
      const codePoint = parseInt(unicodeCode, 16)
      return String.fromCodePoint(codePoint)
    } else {
      // Use the additionalValue1 as symbol directly
      return additionalValue
    }
  }

  // Fallback to code if no additionalValue1
  return currencyEntry.code || ''
}

// Helper function to format currency values using currency catalog entry
const formatCurrency = (amount: number | string, investmentData?: any): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numericAmount) || amount === null || amount === undefined || amount === '') {
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
        const numericValue = typeof fieldValue === 'string' ? parseFloat(fieldValue) : fieldValue
        return isNaN(numericValue) ? '' : numericValue.toLocaleString('en-US')
      default:
        return convertUnicodeSymbol(String(fieldValue))
    }
  }

  return ''
}

// Helper function to get nested property value using dot notation
const getNestedProperty = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null
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
    } catch (error) {
      // If conversion fails, return the original value
      return value
    }
  }

  return value
}

const DynamicInvestmentFields: React.FC<DynamicInvestmentFieldsProps> = ({ investmentData, businessAppContext }) => {
  const [referenceFields, setReferenceFields] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use centralized catalog hook
  const { fetchCatalogEntryById } = useCatalogEntry(businessAppContext || ({} as BusinessAppContextProps))

  useEffect(() => {
    const fetchCatalogData = async () => {
      // Check if we have a valid context
      if (!businessAppContext?.accessToken) {
        setReferenceFields([])
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // Validate IDs before making API calls
        const groupId = investmentData?.investmentGroup?.id
        const typeId = investmentData?.investmentType?.id

        // Check if IDs are valid (not test/mock IDs like 'ig_1', 'it_1')
        const isValidId = (id: string) => {
          if (!id) return false
          // Reject obvious test/mock IDs
          if (id.match(/^(ig_|it_|test_|mock_|demo_)\d+$/)) return false
          // Accept UUIDs or other valid catalog IDs
          return id.length > 10 // Basic length check for real IDs
        }

        const validGroupId = isValidId(groupId) ? groupId : null
        const validTypeId = isValidId(typeId) ? typeId : null

        // Only fetch if we have valid IDs
        if (!validGroupId && !validTypeId) {
          setReferenceFields([])
          setIsLoading(false)
          return
        }

        // Fetch both Investment Group and Investment Type catalog data in parallel
        const [groupData, typeData] = await Promise.all([
          // Fetch Investment Group only if valid ID
          validGroupId ? fetchCatalogEntryById(validGroupId).catch(() => null) : Promise.resolve(null),

          // Fetch Investment Type only if valid ID
          validTypeId ? fetchCatalogEntryById(validTypeId).catch(() => null) : Promise.resolve(null)
        ])

        // Priority: Type's referenceFields, fallback to Group's referenceFields
        let fields: any[] = []

        // Handle objectValue - it might be a JSON string that needs parsing
        let typeObjectValue: any = null
        let groupObjectValue: any = null

        if (typeData?.objectValue) {
          try {
            typeObjectValue =
              typeof typeData.objectValue === 'string' ? JSON.parse(typeData.objectValue) : typeData.objectValue
          } catch (err) {
            console.error('DynamicInvestmentFields: Error parsing type objectValue:', err)
            typeObjectValue = typeData.objectValue
          }
        }

        if (groupData?.objectValue) {
          try {
            groupObjectValue =
              typeof groupData.objectValue === 'string' ? JSON.parse(groupData.objectValue) : groupData.objectValue
          } catch (err) {
            console.error('DynamicInvestmentFields: Error parsing group objectValue:', err)
            groupObjectValue = groupData.objectValue
          }
        }

        if (typeObjectValue?.referenceFields) {
          fields = typeObjectValue.referenceFields
        } else if (groupObjectValue?.referenceFields) {
          fields = groupObjectValue.referenceFields
        }

        setReferenceFields(fields || [])
      } catch (err) {
        console.error('Error fetching catalog data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCatalogData()
  }, [
    investmentData?.investmentGroup?.id,
    investmentData?.investmentType?.id,
    businessAppContext?.accessToken,
    fetchCatalogEntryById
  ])

  // Memoized value formatting to prevent unnecessary re-renders
  const formattedFields = useMemo(() => {
    return referenceFields.map(field => {
      const fieldName = field.property || field.name
      const fieldType = field.type || 'text'
      const fieldValue = investmentData?.[fieldName]

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
            const numericValue = typeof fieldValue === 'string' ? parseFloat(fieldValue) : fieldValue
            if (isNaN(numericValue)) {
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
            const numericValue = typeof fieldValue === 'string' ? parseFloat(fieldValue) : fieldValue
            if (isNaN(numericValue)) {
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
  }, [referenceFields, investmentData])

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
