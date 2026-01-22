import React from 'react'
import { Control, FieldValues, Path, ControllerRenderProps } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import {
  TextField,
  TextAreaField,
  DateField,
  DateTimeField,
  NumberField,
  AmountField,
  PercentageField,
  CatalogField,
  ReferenceField,
  BooleanField
} from './field-types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

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
  readonly field: DynamicFieldDefinition
  /** Field name in the form */
  readonly fieldName: string
  /** React Hook Form control */
  readonly control: Control<TFieldValues>
  /** Access token for API requests (required for CATALOG_ fields) */
  readonly accessToken: string
  /** Optional data-testid prefix */
  readonly testIdPrefix?: string
  /** Currency symbol to display in amount fields */
  readonly currencySymbol?: string
  /** Custom renderer for REF_ fields */
  readonly renderReferenceField?: (
    entityType: string,
    field: DynamicFieldDefinition,
    fieldName: string,
    formField: ControllerRenderProps<TFieldValues>,
    businessAppContext: BusinessAppContextProps
  ) => React.ReactNode
  /** Business app context (required for REF_ fields) */
  readonly businessAppContext?: BusinessAppContextProps
}

/**
 * DynamicFormField Component
 *
 * A router component that selects and renders the appropriate field type component
 * based on the field definition. Each field type is implemented in its own file
 * under the `field-types/` directory for better maintainability.
 *
 * All fields are wrapped with FormField, FormItem, FormLabel, FormControl, and FormMessage
 * at this level to eliminate duplication across field types.
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
  renderReferenceField,
  businessAppContext
}: DynamicFormFieldProps<TFieldValues>) {
  // Extract the base type (e.g., "CATALOG" from "CATALOG_IndustryType", "TEXT" from "TEXT")
  const fieldType = field.type.split('_')[0]

  return (
    <FormField
      key={fieldName}
      control={control}
      name={fieldName as Path<TFieldValues>}
      render={({ field: formField }) => {
        return (
          <FormItem>
            <FormLabel>{field.label}</FormLabel>
            <FormControl>
              {renderFieldInput(fieldType, {
                formField,
                field,
                fieldName,
                testIdPrefix,
                currencySymbol,
                accessToken,
                renderReferenceField,
                businessAppContext
              })}
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )

  function renderFieldInput(
    fieldType: string,
    props: {
      formField: ControllerRenderProps<TFieldValues>
      field: DynamicFieldDefinition
      fieldName: string
      testIdPrefix: string
      currencySymbol?: string
      accessToken: string
      renderReferenceField?: (
        entityType: string,
        field: DynamicFieldDefinition,
        fieldName: string,
        formField: ControllerRenderProps<TFieldValues>,
        businessAppContext: BusinessAppContextProps
      ) => React.ReactNode
      businessAppContext?: BusinessAppContextProps
    }
  ): React.ReactNode {
    const { formField, field, fieldName, testIdPrefix, currencySymbol, renderReferenceField, businessAppContext } =
      props

    switch (fieldType) {
      case 'DATE':
        return (
          <DateField
            value={formField.value}
            onChange={value => formField.onChange(value || '')}
            onBlur={formField.onBlur}
            fieldName={fieldName}
            testIdPrefix={testIdPrefix}
          />
        )

      case 'DATETIME':
        return (
          <DateTimeField
            value={formField.value}
            onChange={value => formField.onChange(value || '')}
            onBlur={formField.onBlur}
            fieldName={fieldName}
            testIdPrefix={testIdPrefix}
          />
        )

      case 'AMOUNT':
        return (
          <AmountField
            value={formField.value}
            onChange={e => formField.onChange(e.target.value)}
            onBlur={formField.onBlur}
            fieldName={fieldName}
            testIdPrefix={testIdPrefix}
            currencySymbol={currencySymbol}
          />
        )

      case 'PERCENTAGE':
        return (
          <PercentageField
            value={formField.value}
            onChange={e => formField.onChange(e.target.value)}
            onBlur={formField.onBlur}
            fieldName={fieldName}
            testIdPrefix={testIdPrefix}
          />
        )

      case 'NUMBER':
        return (
          <NumberField
            value={formField.value}
            onChange={e => formField.onChange(e.target.value)}
            onBlur={formField.onBlur}
            fieldName={fieldName}
            testIdPrefix={testIdPrefix}
          />
        )

      case 'TEXT':
        return (
          <TextField
            value={formField.value}
            onChange={e => formField.onChange(e.target.value)}
            onBlur={formField.onBlur}
            fieldName={fieldName}
            testIdPrefix={testIdPrefix}
            placeholder={field.label ? `Enter ${field.label.toLowerCase()}` : undefined}
          />
        )

      case 'TEXTAREA':
        return (
          <TextAreaField
            value={formField.value}
            onChange={e => formField.onChange(e.target.value)}
            onBlur={formField.onBlur}
            fieldName={fieldName}
            testIdPrefix={testIdPrefix}
            placeholder={field.label ? `Enter ${field.label.toLowerCase()}` : undefined}
          />
        )

      case 'BOOLEAN':
        return (
          <BooleanField
            value={formField.value}
            onChange={checked => formField.onChange(checked)}
            onBlur={formField.onBlur}
            fieldName={fieldName}
            testIdPrefix={testIdPrefix}
          />
        )

      case 'CATALOG': {
        const catalogName = field.type.replace('CATALOG_', '')
        return (
          <CatalogField
            value={formField.value}
            onValueChange={value => formField.onChange(value)}
            catalogName={catalogName}
            fieldName={fieldName}
            testIdPrefix={testIdPrefix}
          />
        )
      }

      case 'REF': {
        const entityType = field.type.replace('REF_', '')
        if (!businessAppContext) {
          throw new Error(
            `DynamicFormField: REF_ field type "${field.type}" requires businessAppContext prop. ` +
              `Please provide BusinessAppContextProps when using reference fields.`
          )
        }
        return (
          <ReferenceField
            entityType={entityType}
            field={field}
            fieldName={fieldName}
            formField={formField}
            renderReferenceField={renderReferenceField}
            businessAppContext={businessAppContext}
          />
        )
      }

      default:
        throw new Error(
          `DynamicFormField: Unhandled field type "${field.type}". ` +
            `Supported types: DATE, DATETIME, AMOUNT, PERCENTAGE, NUMBER, TEXT, TEXTAREA, BOOLEAN, CATALOG_*, REF_*. ` +
            `Please add support for this type in field-types/ directory.`
        )
    }
  }
}
