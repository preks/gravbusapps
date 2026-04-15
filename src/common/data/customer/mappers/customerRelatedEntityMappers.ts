// Customer Related Entity Mappers - Transform base types to enhanced types with computed fields

import { CustomerActivity } from '../types/customerActivityTypes'
import { CustomerNote } from '../types/customerNoteTypes'
import { CustomerDocument } from '../types/customerDocumentTypes'
import { mapRawCrmNoteGraphQLRow } from '../utils/crmNoteMap'

/**
 * Transform CustomerActivity (GraphQL response) to CustomerActivity
 */
export function toCustomerActivity(base: CustomerActivity): CustomerActivity {
  // No field mappings needed - CRM Activity fields already match Activity
  return {
    ...base
  } as CustomerActivity
}

/**
 * Transform CustomerNote (GraphQL response) to CustomerNote
 * Maps CRM-specific field names (noteTitle, noteText) to standard Note fields (title, text)
 */
export function toCustomerNote(base: any): CustomerNote {
  return mapRawCrmNoteGraphQLRow(base) as CustomerNote
}

/**
 * Transform CustomerDocument (GraphQL response) to CustomerDocument
 */
export function toCustomerDocument(base: CustomerDocument): CustomerDocument {
  // No field mappings needed - CRM Document fields already match Document
  return {
    ...base
  } as CustomerDocument
}
