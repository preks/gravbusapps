/**
 * Type definitions for DynamicForm configuration
 */

/**
 * Single field definition
 */
export interface DynamicFormFieldDefinition {
  /** Field type (DATE, TEXT, CATALOG_*, REF_*, etc.) */
  type: string
  /** Display label */
  label: string
  /** Property path (e.g., "investment.name", "equityInvestment.marketValue") */
  property: string
  /** Whether the field is required */
  required: boolean
  /** Display order within group (e.g., "1", "1.1", "1.2", "2") */
  displayOrder: string | number
  /** Optional: false means field should be excluded from report forms/tables */
  report?: boolean
}

/**
 * Group of related fields
 */
export interface DynamicFormFieldGroup {
  /** Unique group identifier */
  groupId: string
  /** Display label for the group */
  groupLabel: string
  /** Display order of the group */
  displayOrder: number
  /** Fields within this group */
  fields: DynamicFormFieldDefinition[]
}

/**
 * Complete form configuration
 */
export interface DynamicFormConfiguration {
  /** Array of field groups */
  formFields: DynamicFormFieldGroup[]
}
