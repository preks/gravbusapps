import { Control, FieldValues } from 'react-hook-form';
import { DynamicFormField } from '@/components/dynamic-form-field';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import {
  DynamicFormConfiguration,
  DynamicFormFieldDefinition,
  DynamicFormFieldGroup,
} from './types';

/**
 * Props for DynamicForm component
 */
export interface DynamicFormProps<TFieldValues extends FieldValues = FieldValues> {
  /** Form configuration (JSON structure) */
  configuration: DynamicFormConfiguration;
  /** React Hook Form control */
  control: Control<TFieldValues>;
  /** Access token for API requests (required for CATALOG_ fields) */
  accessToken: string;
  /** Optional data-testid prefix */
  testIdPrefix?: string;
  /** Currency symbol to display in amount fields */
  currencySymbol?: string;
  /** Custom renderer for REF_ fields */
  renderReferenceField?: (entityType: string, field: DynamicFormFieldDefinition, fieldName: string) => React.ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * Convert property path to field name for react-hook-form
 * With nested structure, we use the FULL property path as the field name
 * Examples:
 * - "investment.name" → "investment.name"
 * - "equityInvestment.marketValue" → "equityInvestment.marketValue"
 * - "liquidFundInvestment.additionalProperties.name" → "liquidFundInvestment.additionalProperties.name"
 * - "size" → "size"
 */
function getFieldNameFromProperty(property: string, fieldType: string): string {
  // For CATALOG_ fields, ensure the property path ends with "Ref"
  if (fieldType.startsWith('CATALOG_') && !property.endsWith('Ref')) {
    // Add Ref to the last segment of the path
    // e.g., "equityInvestment.fundType" → "equityInvestment.fundTypeRef"
    const parts = property.split('.');
    const lastPart = parts[parts.length - 1];
    parts[parts.length - 1] = `${lastPart}Ref`;
    return parts.join('.');
  }

  // For nested structure, use the FULL property path
  return property;
}

/**
 * Group fields by their display order base number
 * Fields with display order "1.1", "1.2" will be grouped together
 * Fields with display order "2" will be in their own group
 */
function groupFieldsByDisplayOrder(fields: DynamicFormFieldDefinition[]): Record<string, DynamicFormFieldDefinition[]> {
  const groups: Record<string, DynamicFormFieldDefinition[]> = {};

  fields.forEach((field) => {
    const orderBase = String(field.displayOrder).split('.')[0];
    if (!groups[orderBase]) {
      groups[orderBase] = [];
    }
    groups[orderBase].push(field);
  });

  // Sort each group by full display order
  Object.keys(groups).forEach((key) => {
    groups[key].sort((a, b) => String(a.displayOrder).localeCompare(String(b.displayOrder)));
  });

  return groups;
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
  isLoading = false,
  error = null,
  emptyMessage = 'No form fields available',
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
    );
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
    );
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
    );
  }

  // ============================================================================
  // RENDER FORM GROUPS
  // ============================================================================

  // Sort groups by display order
  const sortedGroups = [...configuration.formFields].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div data-testid={formatDataTestId(testIdPrefix, 'Container')}>
      {sortedGroups.map((group: DynamicFormFieldGroup) => {
        const fieldGroups = groupFieldsByDisplayOrder(group.fields);

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
              .map((orderBase) => {
                const fieldsInOrder = fieldGroups[orderBase];

                if (fieldsInOrder.length === 1) {
                  // Single field - full width
                  const field = fieldsInOrder[0];
                  const fieldName = getFieldNameFromProperty(field.property, field.type);

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
                      />
                    </div>
                  );
                } else {
                  // Multiple fields - same row (grid layout)
                  return (
                    <div
                      key={orderBase}
                      className="gba:grid gba:gap-4"
                      style={{
                        gridTemplateColumns: `repeat(${fieldsInOrder.length}, 1fr)`,
                      }}
                    >
                      {fieldsInOrder.map((field) => {
                        const fieldName = getFieldNameFromProperty(field.property, field.type);

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
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                }
              })}
          </div>
        );
      })}
    </div>
  );
}

