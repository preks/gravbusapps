// Customer Related Entity Mappers - Transform base types to enhanced types with computed fields

import { CustomerActivity, CustomerNote, CustomerDocument } from '../types'

/**
 * Transform CustomerActivity (GraphQL response) to CustomerActivity
 */
export function toCustomerActivity(base: CustomerActivity): CustomerActivity {
  // No field mappings needed - CRM Activity fields already match CommonActivity
  return {
    ...base
  } as CustomerActivity
}

/**
 * Transform CustomerNote (GraphQL response) to CustomerNote
 */
export function toCustomerNote(base: CustomerNote): CustomerNote {
  // No field mappings needed - CRM Note fields already match CommonNote
  return {
    ...base
  } as CustomerNote
}

/**
 * Transform CustomerDocument (GraphQL response) to CustomerDocument
 */
export function toCustomerDocument(base: CustomerDocument): CustomerDocument {
  // No field mappings needed - CRM Document fields already match CommonDocument
  return {
    ...base
  } as CustomerDocument
}
