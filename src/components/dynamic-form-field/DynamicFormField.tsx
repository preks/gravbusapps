import React from 'react'
import { Control, FieldValues } from 'react-hook-form'
import {
  TextField,
  TextAreaField,
  DateField,
  DateTimeField,
  NumberField,
  AmountField,
  PercentageField,
  CatalogField,
  ReferenceField
} from './field-types'

/**
 * Field Definition Interface
 * Represents the configuration for a dynamic form field
 */
export interface DynamicFieldDefinition {
  type: string
  label: string
  property: string
  required: boolean
  displayOrder: string | number
}

/**
 * Props for DynamicFormField component
 */
export interface DynamicFormFieldProps<TFieldValues extends FieldValues = FieldValues> {
  /** Field definition from catalog configuration */
  field: DynamicFieldDefinition
  /** Field name in the form */
  fieldName: string
  /** React Hook Form control */
  control: Control<TFieldValues>
  /** Access token for API requests (required for CATALOG_ fields) */
  accessToken: string
  /** Optional data-testid prefix */
  testIdPrefix?: string
  /** Currency symbol to display in amount fields */
  currencySymbol?: string
  /** Custom renderer for REF_ fields */
  renderReferenceField?: (entityType: string, field: DynamicFieldDefinition, fieldName: string) => React.ReactNode
}

/**
 * DynamicFormField Component
 *
 * A router component that selects and renders the appropriate field type component
 * based on the field definition. Each field type is implemented in its own file
 * under the `field-types/` directory for better maintainability.
 *
 * Supported field types:
 * - Standard: DATE, DATETIME, TEXT, TEXTAREA, NUMBER, AMOUNT, PERCENTAGE
 * - Dynamic: CATALOG_* (uses Combobox), REF_* (requires custom renderer)
 *
 * @example
 * ```tsx
 * <DynamicFormField
 *   field={{ type: 'TEXT', label: 'Company Name', property: 'companyName', required: true, displayOrder: 1 }}
 *   fieldName="companyName"
 *   control={form.control}
 *   accessToken="your-token"
 *   testIdPrefix="MyForm"
 * />
 * ```
 */
export function DynamicFormField<TFieldValues extends FieldValues = FieldValues>({
  field,
  fieldName,
  control,
  accessToken,
  testIdPrefix = 'DynamicFormField',
  currencySymbol,
  renderReferenceField
}: DynamicFormFieldProps<TFieldValues>) {
  const commonProps = {
    field,
    fieldName,
    control,
    testIdPrefix,
    currencySymbol
  }

  // Extract the base type (e.g., "CATALOG" from "CATALOG_IndustryType", "TEXT" from "TEXT")
  const fieldType = field.type.split('_')[0]

  // ============================================================================
  // FIELD TYPE ROUTER
  // ============================================================================

  switch (fieldType) {
    case 'DATE':
      return <DateField {...commonProps} />

    case 'DATETIME':
      return <DateTimeField {...commonProps} />

    case 'AMOUNT':
      return <AmountField {...commonProps} />

    case 'PERCENTAGE':
      return <PercentageField {...commonProps} />

    case 'NUMBER':
      return <NumberField {...commonProps} />

    case 'TEXT':
      return <TextField {...commonProps} />

    case 'TEXTAREA':
      return <TextAreaField {...commonProps} />

    case 'CATALOG': {
      const catalogName = field.type.replace('CATALOG_', '')
      return <CatalogField {...commonProps} catalogName={catalogName} accessToken={accessToken} />
    }

    case 'REF': {
      const entityType = field.type.replace('REF_', '')
      return (
        <ReferenceField
          entityType={entityType}
          field={field}
          fieldName={fieldName}
          renderReferenceField={renderReferenceField}
        />
      )
    }

    default:
      throw new Error(
        `DynamicFormField: Unhandled field type "${field.type}". ` +
          `Supported types: DATE, DATETIME, AMOUNT, PERCENTAGE, NUMBER, TEXT, TEXTAREA, CATALOG_*, REF_*. ` +
          `Please add support for this type in field-types/ directory.`
      )
  }
}
