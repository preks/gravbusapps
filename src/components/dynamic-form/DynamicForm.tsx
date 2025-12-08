import { Control, FieldValues, ControllerRenderProps } from 'react-hook-form'
import { DynamicFormField } from '@/components/dynamic-form-field'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { DynamicFormConfiguration, DynamicFormFieldDefinition, DynamicFormFieldGroup } from './types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Props for DynamicForm component
 */
export interface DynamicFormProps<TFieldValues extends FieldValues = FieldValues> {
  /** Form configuration (JSON structure) */
  readonly configuration: DynamicFormConfiguration
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
    field: DynamicFormFieldDefinition,
    fieldName: string,
    formField: ControllerRenderProps<TFieldValues>,
    businessAppContext: BusinessAppContextProps
  ) => React.ReactNode
  /** Business app context (required for REF_ fields) */
  readonly businessAppContext?: BusinessAppContextProps
  /** Loading state */
  readonly isLoading?: boolean
  /** Error message */
  readonly error?: string | null
  /** Empty state message */
  readonly emptyMessage?: string
}

/**
 * Convert property path to field name for react-hook-form
 * With nested structure, we use the FULL property path as the field name
 * Examples:
 * - "investment.name" → "investment.name"
 * - "equityInvestment.marketValue" → "equityInvestment.marketValue"
 * - "liquidFundInvestment.additionalProperties.name" → "liquidFundInvestment.additionalProperties.name"
 * - "size" → "size"
 *
 * NOTE: Catalog fields use property WITHOUT "Ref" suffix in form state
 * - Config property: "investment.investmentType" (no Ref)
 * - Form field: "investment.investmentType" (no Ref)
 * - API payload: "investment.investmentTypeRef" (has Ref - handled by payload builder)
 */
function getFieldNameFromProperty(property: string): string {
  // Use the property path as-is (no Ref suffix manipulation needed)
  // Form state uses catalog fields WITHOUT "Ref" suffix
  return property
}

/**
 * Group fields by their display order base number
 * Fields with display order "1.1", "1.2" will be grouped together
 * Fields with display order "2" will be in their own group
 */
function groupFieldsByDisplayOrder(fields: DynamicFormFieldDefinition[]): Record<string, DynamicFormFieldDefinition[]> {
  const groups: Record<string, DynamicFormFieldDefinition[]> = {}

  fields.forEach(field => {
    const orderBase = String(field.displayOrder).split('.')[0]
    if (!groups[orderBase]) {
      groups[orderBase] = []
    }
    groups[orderBase].push(field)
  })

  // Sort each group by full display order
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => String(a.displayOrder).localeCompare(String(b.displayOrder)))
  })

  return groups
}

/**
 * DynamicForm Component
 *
 * A centralized form orchestration component that handles:
 * - JSON configuration parsing
 * - Group sorting and display
 * - Field layout (single field vs. multi-column rows)
 * - Loading, error, and empty states
 *
 * @example
 * ```tsx
 * <DynamicForm
 *   configuration={{
 *     formFields: [
 *       {
 *         groupId: 'basicInfo',
 *         groupLabel: 'Basic Information',
 *         displayOrder: 1,
 *         fields: [
 *           { type: 'TEXT', label: 'Name', property: 'name', required: true, displayOrder: '1' },
 *           { type: 'DATE', label: 'Birth Date', property: 'birthDate', required: false, displayOrder: '2' }
 *         ]
 *       }
 *     ]
 *   }}
 *   control={form.control}
 *   accessToken={accessToken}
 * />
 * ```
 */
export function DynamicForm<TFieldValues extends FieldValues = FieldValues>({
  configuration,
  control,
  accessToken,
  testIdPrefix = 'DynamicForm',
  currencySymbol,
  renderReferenceField,
  businessAppContext,
  isLoading = false,
  error = null,
  emptyMessage = 'No form fields available'
}: DynamicFormProps<TFieldValues>) {
  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <div
        className="gba:text-center gba:text-muted-foreground gba:py-8"
        data-testid={formatDataTestId(testIdPrefix, 'Loading')}
      >
        Loading form fields...
      </div>
    )
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (error) {
    return (
      <div
        className="gba:bg-destructive-secondary gba:text-destructive-secondary-foreground gba:rounded-md gba:p-4"
        data-testid={formatDataTestId(testIdPrefix, 'Error')}
      >
        <div className="gba:text-sm">Error loading form fields: {error}</div>
      </div>
    )
  }

  // ============================================================================
  // EMPTY STATE
  // ============================================================================

  if (!configuration || !configuration.formFields || configuration.formFields.length === 0) {
    return (
      <div
        className="gba:text-center gba:text-muted-foreground gba:py-8"
        data-testid={formatDataTestId(testIdPrefix, 'Empty')}
      >
        {emptyMessage}
      </div>
    )
  }

  // ============================================================================
  // RENDER FORM GROUPS
  // ============================================================================

  // Sort groups by display order
  const sortedGroups = [...configuration.formFields].sort((a, b) => a.displayOrder - b.displayOrder)

  return (
    <div data-testid={formatDataTestId(testIdPrefix, 'Container')}>
      {sortedGroups.map((group: DynamicFormFieldGroup) => {
        const fieldGroups = groupFieldsByDisplayOrder(group.fields)

        return (
          <div
            key={group.groupId}
            className="gba:space-y-6"
            data-testid={formatDataTestId(testIdPrefix, `${group.groupId}Group`)}
          >
            {/* Group Header */}
            <div>
              <h3 className="gba:text-lg gba:font-semibold gba:mb-2">{group.groupLabel}</h3>
            </div>

            {/* Render fields grouped by display order */}
            {Object.keys(fieldGroups)
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(orderBase => {
                const fieldsInOrder = fieldGroups[orderBase]

                if (fieldsInOrder.length === 1) {
                  // Single field - full width
                  const field = fieldsInOrder[0]
                  const fieldName = getFieldNameFromProperty(field.property)

                  return (
                    <div key={orderBase}>
                      <DynamicFormField
                        field={field}
                        fieldName={fieldName}
                        control={control}
                        accessToken={accessToken}
                        testIdPrefix={testIdPrefix}
                        currencySymbol={currencySymbol}
                        renderReferenceField={renderReferenceField}
                        businessAppContext={businessAppContext}
                      />
                    </div>
                  )
                } else {
                  // Multiple fields - same row (grid layout)
                  return (
                    <div
                      key={orderBase}
                      className="gba:grid gba:gap-4"
                      style={{
                        gridTemplateColumns: `repeat(${fieldsInOrder.length}, 1fr)`
                      }}
                    >
                      {fieldsInOrder.map(field => {
                        const fieldName = getFieldNameFromProperty(field.property)

                        return (
                          <div key={field.property}>
                            <DynamicFormField
                              field={field}
                              fieldName={fieldName}
                              control={control}
                              accessToken={accessToken}
                              testIdPrefix={testIdPrefix}
                              currencySymbol={currencySymbol}
                              renderReferenceField={renderReferenceField}
                              businessAppContext={businessAppContext}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )
                }
              })}
          </div>
        )
      })}
    </div>
  )
}
