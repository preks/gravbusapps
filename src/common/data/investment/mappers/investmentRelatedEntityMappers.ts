// Investment Related Entity Mappers - Transform base types to enhanced types with computed fields

import { InvestmentActivity } from '../types/investmentActivityTypes'
import { InvestmentNote } from '../types/investmentNoteTypes'
import { InvestmentDocument } from '../types/investmentDocumentTypes'

/**
 * Transform InvestmentActivity (GraphQL response) to InvestmentActivity
 */
export function toInvestmentActivity(base: InvestmentActivity): InvestmentActivity {
  // No field mappings needed - IRM Activity fields already match Activity
  return {
    ...base
  } as InvestmentActivity
}

/**
 * Transform InvestmentNote (GraphQL response) to InvestmentNote
 */
export function toInvestmentNote(base: InvestmentNote): InvestmentNote {
  // No field mappings needed - IRM Note fields already match Note
  return {
    ...base
  } as InvestmentNote
}

/**
 * Transform InvestmentDocument (GraphQL response) to InvestmentDocument
 */
export function toInvestmentDocument(base: InvestmentDocument): InvestmentDocument {
  // No field mappings needed - IRM Document fields already match Document
  return {
    ...base
  } as InvestmentDocument
}
