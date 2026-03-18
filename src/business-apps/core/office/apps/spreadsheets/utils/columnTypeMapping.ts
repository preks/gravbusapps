/**
 * Column Type Mapping Utilities
 *
 * Maps spreadsheet column types to form field types.
 */

import type { DynamicFormField } from '@/business-apps/ser/types/flowTemplate'

/**
 * Map column type to form field type
 */
export function mapColumnTypeToFormType(type: string): DynamicFormField['type'] {
  const mapping: Record<string, DynamicFormField['type']> = {
    text: 'TEXT',
    number: 'NUMBER',
    currency: 'NUMBER',
    percentage: 'NUMBER',
    date: 'DATE',
    datetime: 'DATETIME',
    email: 'EMAIL',
    phone: 'TEXT',
    url: 'URL',
    select: 'SELECT',
    multiselect: 'MULTISELECT',
    boolean: 'CHECKBOX',
    calculated: 'TEXT',
    reference: 'SELECT'
  }

  return mapping[type] || 'TEXT'
}
