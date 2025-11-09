/**
 * Common Document Fragments (New)
 *
 * Builds Document fragments using DocumentFields mapping
 */

import { DOCUMENT_REF } from '@/common/data/common/queries/documentFragments'
import { DocumentFields } from '../types/commonDocumentTypes'

/**
 * Build Document fragment using fields mapping (REF fields only, no relations)
 */
export const buildDocumentFragment = (fields: Record<keyof typeof DocumentFields, string> = DocumentFields): string => {
  return `
  ${DOCUMENT_REF}
  
  # Source and verification fields
  ${fields.source}
  ${fields.verified}
  ${fields.verificationDate}
  ${fields.authenticated}
  ${fields.authenticationDate}
  ${fields.mandatory}
  ${fields.expirationDate}
`
}

/**
 * Default Common Document Fields fragment (no relations)
 */
export const COMMON_DOCUMENT_FIELDS_NEW = buildDocumentFragment(DocumentFields)
