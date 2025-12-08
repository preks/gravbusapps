import React from 'react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { CatalogSelect, CatalogSelectProps } from '@/components/catalog-select'

type CatalogFieldProps = Omit<CatalogSelectProps, 'catalogIdentifier' | 'variant' | 'value' | 'onValueChange'> & {
  catalogName: string
  fieldName: string
  testIdPrefix: string
  value?: string | { id: string } | null // Accept both for backward compatibility, but stores as string
  onValueChange?: (value: string) => void // Always stores as string ID
}

export function CatalogField({
  catalogName,
  fieldName,
  testIdPrefix,
  value,
  onValueChange,
  ...props
}: CatalogFieldProps) {
  // Extract value: handle both object format {id: "..."} and string format
  const fieldValue =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as any)?.id || ''
      : (value as string) || ''

  return (
    <CatalogSelect
      {...props}
      catalogIdentifier={catalogName}
      variant="combobox"
      value={fieldValue}
      onValueChange={newValue => {
        // Store as string ID (like currencyRef), not object
        onValueChange?.(newValue || '')
      }}
      data-testid={formatDataTestId(testIdPrefix, `${fieldName}CatalogSelect`)}
    />
  )
}
