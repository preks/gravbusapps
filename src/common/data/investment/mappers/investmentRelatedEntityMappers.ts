// Investment Related Entity Mappers - Transform base types to enhanced types with computed fields

import { InvestmentActivity, InvestmentNote, InvestmentDocument } from '../types'

/**
 * Transform InvestmentActivity (GraphQL response) to InvestmentActivity
 */
export function toInvestmentActivity(base: InvestmentActivity): InvestmentActivity {
  // No field mappings needed - IRM Activity fields already match CommonActivity
  return {
    ...base
  } as InvestmentActivity
}

/**
 * Transform InvestmentNote (GraphQL response) to InvestmentNote
 */
export function toInvestmentNote(base: InvestmentNote): InvestmentNote {
  // No field mappings needed - IRM Note fields already match CommonNote
  return {
    ...base
  } as InvestmentNote
}

/**
 * Transform InvestmentDocument (GraphQL response) to InvestmentDocument
 */
export function toInvestmentDocument(base: InvestmentDocument): InvestmentDocument {
  // No field mappings needed - IRM Document fields already match CommonDocument
  return {
    ...base
  } as InvestmentDocument
}
