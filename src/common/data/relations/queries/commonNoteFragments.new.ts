/**
 * Common Note Fragments (New)
 *
 * Builds Note fragments using NoteFields mapping
 */

import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { NoteFields } from '../types/commonNoteTypes'

/**
 * Build Note fragment using fields mapping (REF fields only, no relations)
 */
export const buildNoteFragment = (fields: Record<keyof typeof NoteFields, string> = NoteFields): string => {
  return `
  ${AUDIT_FIELDS}
  ${fields.authorEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.authorEmployeeId}
  ${fields.id}
  ${fields.reminderDate}
  ${fields.source}
  # text missing in CRM
  # title missing in CRM
`
}

/**
 * Default Common Note Fields fragment (no relations)
 */
export const COMMON_NOTE_FIELDS_NEW = buildNoteFragment(NoteFields)
